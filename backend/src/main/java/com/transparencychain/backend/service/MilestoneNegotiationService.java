package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.*;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 2 — Milestone Versioning + Change-Request Flow (org ↔ NGO loop)
 *
 * Core invariant enforced here:
 *   milestone.amountAllocated / title / sequence / dueDate are NEVER mutated directly.
 *   All changes go through MilestoneVersion + MilestoneChangeRequest.
 *   The milestone's currentVersionId is only advanced when both sides agree (ACCEPTED).
 *
 * Engagement state:
 *   On first change-request creation: UNDER_REVIEW -> NEGOTIATING
 *   On ACCEPT: stays NEGOTIATING (funding commitment step moves it forward)
 */
@Service
public class MilestoneNegotiationService {

    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private MilestoneVersionRepository versionRepository;
    @Autowired private MilestoneChangeRequestRepository changeRequestRepository;
    @Autowired private FunderProfileRepository funderProfileRepository;
    @Autowired private NgoProfileRepository ngoProfileRepository;
    @Autowired private OrgProjectEngagementRepository engagementRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private FundingCommitmentRepository fundingCommitmentRepository;
    @Autowired private AuditLogService auditLogService;
    @Autowired private DisbursementService disbursementService;
    @Autowired private NotificationService notificationService;
    @Autowired private BlockchainService blockchainService;

    // =========================================================================
    // ORG-SIDE OPERATIONS
    // =========================================================================

    /**
     * Org raises a change request on a milestone.
     *
     * Steps:
     *   1. Validate the milestone belongs to the project and is in a mutable state
     *   2. Guard: only one PENDING CR per milestone at a time
     *   3. Snapshot the current milestone state into a MilestoneVersion (authored by NGO or FUNDER,
     *      whichever was most recent — defaults to NGO for the baseline)
     *   4. Create the proposed MilestoneVersion (authored by FUNDER) with overrides applied
     *   5. Create the MilestoneChangeRequest linking original → proposed
     *   6. Set milestone status to MODIFIED
     *   7. Advance engagement: UNDER_REVIEW → NEGOTIATING
     *   8. Write audit log
     */
    @Transactional
    public ChangeRequestDto raiseChangeRequest(
            UUID projectId,
            UUID milestoneId,
            UUID funderId,
            ChangeRequestBody body) {

        // --- Validations ---
        if (body.getReason() == null || body.getReason().isBlank()) {
            throw new IllegalArgumentException("A change reason is required for auditability.");
        }
        boolean anyFieldChanged = body.getName() != null
                || body.getBudget() != null
                || body.getSequence() != null
                || body.getDueDate() != null;
        if (!anyFieldChanged) {
            throw new IllegalArgumentException("At least one field (name, budget, sequence, dueDate) must be proposed.");
        }

        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found: " + milestoneId));

        if (!milestone.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Milestone does not belong to project " + projectId);
        }

        // --- Funding-Lock Check ---
        List<FundingCommitment.FundingCommitmentStatus> lockedStatuses = List.of(
                FundingCommitment.FundingCommitmentStatus.PENDING,
                FundingCommitment.FundingCommitmentStatus.ACTIVE,
                FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED,
                FundingCommitment.FundingCommitmentStatus.FULLY_RELEASED
        );
        Optional<FundingCommitment> activeCommitment = fundingCommitmentRepository.findByProjectId(projectId).stream()
                .filter(c -> lockedStatuses.contains(c.getStatus()))
                .findFirst();
        if (activeCommitment.isPresent() && !activeCommitment.get().getFunder().getId().equals(funderId)) {
            throw new IllegalStateException("This project slot is locked by another funder's active commitment.");
        }

        // Withdrawn engagement guard
        OrgProjectEngagement currentEng = engagementRepository.findByFunderIdAndProjectId(funderId, projectId).orElse(null);
        if (currentEng != null && currentEng.getStatus() == OrgProjectEngagement.EngagementStatus.WITHDRAWN) {
            throw new IllegalStateException("Cannot raise change requests on a withdrawn funding engagement.");
        }

        // Only PENDING or MODIFIED milestones can have new CRs raised
        if (milestone.getStatus() != Milestone.MilestoneStatus.PENDING
                && milestone.getStatus() != Milestone.MilestoneStatus.MODIFIED) {
            throw new IllegalStateException(
                    "Cannot raise a change request on a milestone in status: " + milestone.getStatus()
                    + ". Only PENDING or MODIFIED milestones are negotiable.");
        }

        // Duplicate guard: only one PENDING CR per milestone
        if (changeRequestRepository.existsByMilestoneIdAndStatus(
                milestoneId, MilestoneChangeRequest.ChangeRequestStatus.PENDING)) {
            throw new IllegalStateException(
                    "A change request for this milestone is already pending NGO review. "
                    + "Withdraw it first before raising a new one.");
        }

        FunderProfile funder = funderProfileRepository.findById(funderId)
                .orElseThrow(() -> new RuntimeException("Funder not found: " + funderId));

        // --- Create or retrieve the baseline (original) version ---
        MilestoneVersion originalVersion;
        if (milestone.getCurrentVersionId() != null) {
            originalVersion = versionRepository.findById(milestone.getCurrentVersionId())
                    .orElseThrow(() -> new RuntimeException("Current version not found"));
        } else {
            // First time a CR is raised — create the baseline NGO version from the raw milestone fields
            int nextVersion = nextVersionNumber(milestoneId);
            originalVersion = new MilestoneVersion();
            originalVersion.setMilestone(milestone);
            originalVersion.setVersionNumber(nextVersion);
            originalVersion.setProposedBy(MilestoneVersion.ProposedBy.NGO);
            originalVersion.setName(milestone.getTitle());
            originalVersion.setBudget(milestone.getAmountAllocated());
            originalVersion.setSequence(milestone.getSequenceNumber());
            originalVersion.setDueDate(milestone.getDueDate());
            originalVersion.setChangeReason("Initial NGO baseline (auto-created on first change request)");
            originalVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
            originalVersion = versionRepository.save(originalVersion);
            // Point milestone at this baseline
            milestone.setCurrentVersionId(originalVersion.getId());
        }

        // --- Create the FUNDER's proposed version ---
        int proposedVersionNumber = nextVersionNumber(milestoneId);
        MilestoneVersion proposedVersion = new MilestoneVersion();
        proposedVersion.setMilestone(milestone);
        proposedVersion.setVersionNumber(proposedVersionNumber);
        proposedVersion.setProposedBy(MilestoneVersion.ProposedBy.FUNDER);
        // Apply overrides — null means "keep existing"
        proposedVersion.setName(body.getName() != null ? body.getName() : originalVersion.getName());
        proposedVersion.setBudget(body.getBudget() != null ? body.getBudget() : originalVersion.getBudget());
        proposedVersion.setSequence(body.getSequence() != null ? body.getSequence() : originalVersion.getSequence());
        proposedVersion.setDueDate(body.getDueDate() != null ? body.getDueDate() : originalVersion.getDueDate());
        proposedVersion.setChangeReason(body.getReason());
        proposedVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
        proposedVersion = versionRepository.save(proposedVersion);

        // --- Create the change request ---
        MilestoneChangeRequest cr = new MilestoneChangeRequest();
        cr.setMilestone(milestone);
        cr.setRequestedByOrg(funder);
        cr.setOriginalVersion(originalVersion);
        cr.setProposedVersion(proposedVersion);
        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.PENDING);
        cr = changeRequestRepository.save(cr);

        // --- Update milestone status to MODIFIED ---
        milestone.setStatus(Milestone.MilestoneStatus.MODIFIED);
        milestoneRepository.save(milestone);

        // --- Advance engagement state: UNDER_REVIEW -> NEGOTIATING ---
        engagementRepository.findByFunderIdAndProjectId(funderId, projectId).ifPresent(eng -> {
            if (eng.getStatus() == OrgProjectEngagement.EngagementStatus.UNDER_REVIEW) {
                eng.setStatus(OrgProjectEngagement.EngagementStatus.NEGOTIATING);
                engagementRepository.save(eng);
            }
        });

        // --- Audit log ---
        auditLogService.logAction(milestoneId, "MILESTONE_CR",
                "Funder " + funderId + " raised CR on milestone " + milestoneId
                + " | originalVersionId=" + originalVersion.getId()
                + " | proposedVersionId=" + proposedVersion.getId()
                + " | reason=" + body.getReason());

        // Notify NGO
        if (milestone.getProject() != null && milestone.getProject().getNgo() != null && milestone.getProject().getNgo().getUser() != null) {
            notificationService.create(
                    Notification.RecipientType.NGO,
                    milestone.getProject().getNgo().getUser(),
                    milestone.getProject(),
                    milestone,
                    Notification.NotificationEventType.CHANGE_REQUEST_PROPOSED,
                    "Milestone Change Proposed",
                    "Funder proposed changes to '" + milestone.getTitle() + "': \"" + body.getReason() + "\"",
                    "/ngo/projects/" + milestone.getProject().getId()
            );
        }

        return toDto(cr);
    }

    /**
     * Returns the full change-request detail including the inline original/proposed diff.
     */
    @Transactional(readOnly = true)
    public ChangeRequestDto getChangeRequest(UUID crId) {
        MilestoneChangeRequest cr = changeRequestRepository.findById(crId)
                .orElseThrow(() -> new RuntimeException("Change request not found: " + crId));
        return toDto(cr);
    }

    /**
     * Org withdraws a PENDING change request before the NGO has responded.
     * Milestone reverts to PENDING (or back to the currentVersionId-based state).
     */
    @Transactional
    public ChangeRequestDto withdrawChangeRequest(UUID crId, UUID funderId) {
        MilestoneChangeRequest cr = changeRequestRepository.findById(crId)
                .orElseThrow(() -> new RuntimeException("Change request not found: " + crId));

        if (!cr.getRequestedByOrg().getId().equals(funderId)) {
            throw new SecurityException("Only the org that raised this CR can withdraw it.");
        }
        if (cr.getStatus() != MilestoneChangeRequest.ChangeRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Only PENDING change requests can be withdrawn. Current status: " + cr.getStatus());
        }

        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.WITHDRAWN);
        cr.setRespondedAt(LocalDateTime.now());
        changeRequestRepository.save(cr);

        // Mark the proposed version as superseded
        MilestoneVersion proposed = cr.getProposedVersion();
        proposed.setStatus(MilestoneVersion.VersionStatus.SUPERSEDED);
        versionRepository.save(proposed);

        // Revert milestone status to PENDING
        Milestone milestone = cr.getMilestone();
        milestone.setStatus(Milestone.MilestoneStatus.PENDING);
        milestoneRepository.save(milestone);

        auditLogService.logAction(cr.getMilestone().getId(), "MILESTONE_CR",
                "Funder " + funderId + " withdrew CR " + crId);

        return toDto(cr);
    }

    /**
     * Funder responds to a PENDING change request (NGO-initiated).
     *
     * ACCEPT → locks proposed values
     * COUNTER → submits a counter-proposal
     * REJECT → reverts milestone to pending
     */
    @Transactional
    public ChangeRequestDto funderRespondToChangeRequest(
            UUID crId,
            UUID funderUserId,
            OrgChangeRequestResponseBody body) {

        if (body.getDecision() == null) {
            throw new IllegalArgumentException("Decision is required.");
        }

        MilestoneChangeRequest cr = changeRequestRepository.findById(crId)
                .orElseThrow(() -> new RuntimeException("Change request not found: " + crId));

        if (cr.getStatus() != MilestoneChangeRequest.ChangeRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot respond to a CR that is not PENDING. Current status: " + cr.getStatus());
        }

        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new RuntimeException("Funder profile not found for user: " + funderUserId));

        // Verify that the funder has an engagement on this project
        Project project = cr.getMilestone().getProject();
        if (!engagementRepository.findByFunderIdAndProjectId(funder.getId(), project.getId()).isPresent()) {
            throw new SecurityException("This Funder does not have an active engagement/negotiation for this project.");
        }

        // --- Funding-Lock Check ---
        List<FundingCommitment.FundingCommitmentStatus> lockedStatuses = List.of(
                FundingCommitment.FundingCommitmentStatus.PENDING,
                FundingCommitment.FundingCommitmentStatus.ACTIVE,
                FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED,
                FundingCommitment.FundingCommitmentStatus.FULLY_RELEASED
        );
        Optional<FundingCommitment> activeCommitment = fundingCommitmentRepository.findByProjectId(project.getId()).stream()
                .filter(c -> lockedStatuses.contains(c.getStatus()))
                .findFirst();
        if (activeCommitment.isPresent() && !activeCommitment.get().getFunder().getId().equals(funder.getId())) {
            throw new IllegalStateException("This project slot is locked by another funder's active commitment.");
        }

        cr.setNgoResponseNote(body.getResponseNote());
        cr.setRespondedAt(LocalDateTime.now());

        switch (body.getDecision()) {
            case ACCEPT -> handleAccept(cr);
            case REJECT -> handleReject(cr);
            case COUNTER -> handleFunderCounter(cr, funder, body);
        }

        changeRequestRepository.save(cr);

        auditLogService.logAction(cr.getMilestone().getId(), "MILESTONE_CR",
                "Funder " + funder.getId() + " responded to CR " + crId
                + " with decision: " + body.getDecision()
                + (body.getResponseNote() != null ? " | note: " + body.getResponseNote() : ""));

        return toDto(cr);
    }

    @Transactional
    public void acceptAndLockMilestone(UUID projectId, UUID milestoneId, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new RuntimeException("Funder profile not found for user: " + funderUserId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found: " + milestoneId));

        if (!milestone.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Milestone does not belong to project " + projectId);
        }

        // Verify that the funder has an engagement on this project
        if (!engagementRepository.findByFunderIdAndProjectId(funder.getId(), project.getId()).isPresent()) {
            throw new SecurityException("This Funder does not have an active engagement/negotiation for this project.");
        }

        // Transition milestone to LOCKED
        milestone.setStatus(Milestone.MilestoneStatus.LOCKED);
        milestoneRepository.save(milestone);

        // If there's a pending change request for this milestone, close/accept it
        changeRequestRepository.findByMilestoneIdOrderByCreatedAtAsc(milestoneId).stream()
                .filter(cr -> cr.getStatus() == MilestoneChangeRequest.ChangeRequestStatus.PENDING)
                .findFirst()
                .ifPresent(cr -> {
                    cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.ACCEPTED);
                    cr.setRespondedAt(LocalDateTime.now());
                    cr.setNgoResponseNote("Accepted via direct Accept & Lock");
                    changeRequestRepository.save(cr);
                    
                    if (cr.getProposedVersion() != null) {
                        MilestoneVersion proposed = cr.getProposedVersion();
                        proposed.setStatus(MilestoneVersion.VersionStatus.ACCEPTED);
                        versionRepository.save(proposed);
                        milestone.setCurrentVersionId(proposed.getId());
                        if (proposed.getName() != null) milestone.setTitle(proposed.getName());
                        if (proposed.getBudget() != null) milestone.setAmountAllocated(proposed.getBudget());
                        if (proposed.getSequence() != null) milestone.setSequenceNumber(proposed.getSequence());
                        if (proposed.getDueDate() != null) milestone.setDueDate(proposed.getDueDate());
                        milestoneRepository.save(milestone);
                    }
                    if (cr.getOriginalVersion() != null) {
                        cr.getOriginalVersion().setStatus(MilestoneVersion.VersionStatus.SUPERSEDED);
                        versionRepository.save(cr.getOriginalVersion());
                    }
                });

        // Deploy/initialize escrow ledger update & trigger disbursement
        String txHash = blockchainService.releaseFunds(projectId, milestoneId, milestone.getAmountAllocated());
        disbursementService.executeDisbursement(
                projectId,
                milestoneId,
                milestone.getAmountAllocated(),
                txHash
        );

        auditLogService.logAction(
                projectId,
                "MILESTONE_ACCEPTED_AND_LOCKED",
                "Milestone '" + milestone.getTitle() + "' accepted and locked by Funder. Disbursement triggered."
        );
    }

    @Transactional
    public void acceptAndLockAllMilestones(UUID projectId, UUID funderUserId) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new RuntimeException("Funder profile not found for user: " + funderUserId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        // Withdrawn engagement guard
        OrgProjectEngagement eng = engagementRepository.findByFunderIdAndProjectId(funder.getId(), projectId).orElse(null);
        if (eng != null && eng.getStatus() == OrgProjectEngagement.EngagementStatus.WITHDRAWN) {
            throw new IllegalStateException("Cannot accept and lock milestones on a withdrawn funding engagement.");
        }

        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        if (milestones.isEmpty()) {
            throw new IllegalStateException("No milestones found for this project.");
        }

        for (Milestone m : milestones) {
            if (m.getTitle() != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                if (matcher.find()) {
                    m.setSequenceNumber(Integer.parseInt(matcher.group(1)));
                }
            }
        }

        // Sort milestones by sequence number ascending
        milestones.sort((m1, m2) -> {
            int s1 = m1.getSequenceNumber() != null ? m1.getSequenceNumber() : 99;
            int s2 = m2.getSequenceNumber() != null ? m2.getSequenceNumber() : 99;
            return Integer.compare(s1, s2);
        });

        for (int i = 0; i < milestones.size(); i++) {
            Milestone m = milestones.get(i);
            // First milestone becomes IN_PROGRESS for work, others LOCKED
            if (i == 0) {
                m.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
            } else {
                m.setStatus(Milestone.MilestoneStatus.LOCKED);
            }
            milestoneRepository.save(m);

            // Accept and close any open change requests
            changeRequestRepository.findByMilestoneIdOrderByCreatedAtAsc(m.getId()).stream()
                    .filter(cr -> cr.getStatus() == MilestoneChangeRequest.ChangeRequestStatus.PENDING)
                    .forEach(cr -> {
                        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.ACCEPTED);
                        cr.setRespondedAt(LocalDateTime.now());
                        cr.setNgoResponseNote("Accepted via Accept & Lock All");
                        changeRequestRepository.save(cr);

                        if (cr.getProposedVersion() != null) {
                            MilestoneVersion proposed = cr.getProposedVersion();
                            proposed.setStatus(MilestoneVersion.VersionStatus.ACCEPTED);
                            versionRepository.save(proposed);
                            m.setCurrentVersionId(proposed.getId());
                            if (proposed.getName() != null) m.setTitle(proposed.getName());
                            if (proposed.getBudget() != null) m.setAmountAllocated(proposed.getBudget());
                            if (proposed.getSequence() != null) m.setSequenceNumber(proposed.getSequence());
                            if (proposed.getDueDate() != null) m.setDueDate(proposed.getDueDate());
                            milestoneRepository.save(m);
                        }
                    });
        }

        // Section 3: Mobilization Advance - Disburse Milestone 1 immediately at commitment time
        if (!milestones.isEmpty()) {
            Milestone m1 = milestones.get(0);
            if (m1.getAmountAllocated() != null && m1.getAmountAllocated().compareTo(java.math.BigDecimal.ZERO) > 0) {
                String txHash = blockchainService.releaseFunds(projectId, m1.getId(), m1.getAmountAllocated());
                disbursementService.executeDisbursement(
                        projectId,
                        m1.getId(),
                        m1.getAmountAllocated(),
                        txHash
                );
                m1.setReleasedAmount(m1.getAmountAllocated());
                m1.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
                milestoneRepository.save(m1);
            }
        }

        // Set project status to ACTIVE so NGO can start work
        project.setStatus(Project.ProjectStatus.ACTIVE);
        projectRepository.save(project);

        // Notify NGO of funding commitment & Phase 1 mobilization
        if (project.getNgo() != null && project.getNgo().getUser() != null) {
            notificationService.create(
                    Notification.RecipientType.NGO,
                    project.getNgo().getUser(),
                    project,
                    !milestones.isEmpty() ? milestones.get(0) : null,
                    Notification.NotificationEventType.FUNDING_COMMITTED,
                    "Project Funded & Phase 1 Mobilized! 🚀",
                    "Funder committed full milestone funding to '" + project.getTitle() + "' and unlocked Phase 1.",
                    "/ngo/projects/" + project.getId()
            );
        }

        auditLogService.logAction(
                projectId,
                "ALL_MILESTONES_ACCEPTED_AND_LOCKED",
                "All milestones accepted and locked by Funder. Milestone 1 mobilization advance disbursed. Project status set to ACTIVE."
        );
    }

    @Transactional
    public void declineNegotiation(UUID projectId, UUID funderUserId, String reason) {
        FunderProfile funder = funderProfileRepository.findByUserId(funderUserId)
                .orElseThrow(() -> new RuntimeException("Funder profile not found for user: " + funderUserId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        OrgProjectEngagement engagement = engagementRepository.findByFunderIdAndProjectId(funder.getId(), projectId)
                .orElseGet(() -> {
                    OrgProjectEngagement newEng = new OrgProjectEngagement();
                    newEng.setFunder(funder);
                    newEng.setProject(project);
                    return newEng;
                });

        engagement.setStatus(OrgProjectEngagement.EngagementStatus.WITHDRAWN);
        engagement.setWithdrawnAt(LocalDateTime.now());
        engagement.setWithdrawnBy(funderUserId);
        engagement.setWithdrawalReason(reason);
        engagement.setRemodifyStatus(OrgProjectEngagement.RemodifyStatus.PENDING_REMODIFICATION);
        engagementRepository.save(engagement);
        if (project != null) {
            // Keep or revert project status to PUBLISHED so NGO can remodify / other funders can discover
            if (project.getStatus() == Project.ProjectStatus.ACTIVE) {
                project.setStatus(Project.ProjectStatus.PUBLISHED);
                projectRepository.save(project);
            }

            // Notify NGO of withdrawal
            if (project.getNgo() != null && project.getNgo().getUser() != null) {
                String orgName = funder.getOrgName() != null && !funder.getOrgName().isBlank() ? funder.getOrgName() : "A Funder";
                String reasonSuffix = (reason != null && !reason.isBlank()) ? " Reason: \"" + reason + "\"" : "";
                notificationService.create(
                        Notification.RecipientType.NGO,
                        project.getNgo().getUser(),
                        project,
                        null,
                        Notification.NotificationEventType.PROJECT_WITHDRAWN,
                        "Funder Withdrawn from Project",
                        orgName + " has withdrawn funding engagement from '" + project.getTitle() + "'." + reasonSuffix,
                        "/ngo/projects/" + project.getId()
                );
            }
        }

        auditLogService.logAction(
                projectId,
                "NEGOTIATION_DECLINED",
                "Funder " + funder.getId() + " (" + funder.getOrgName() + ") withdrew engagement. Reason: " + reason
        );
    }

    private void handleFunderCounter(MilestoneChangeRequest cr, FunderProfile funder, OrgChangeRequestResponseBody body) {
        boolean anyCounterField = body.getCounterName() != null
                || body.getCounterBudget() != null
                || body.getCounterSequence() != null
                || body.getCounterDueDate() != null;
        if (!anyCounterField) {
            throw new IllegalArgumentException(
                    "A COUNTER decision requires at least one counter-proposal field (counterName, counterBudget, counterSequence, counterDueDate).");
        }

        MilestoneVersion ngoProposed = cr.getProposedVersion();
        Milestone milestone = cr.getMilestone();

        // Mark the current CR as COUNTERED
        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.COUNTERED);

        // Create the Funder's counter-version
        ngoProposed.setStatus(MilestoneVersion.VersionStatus.SUPERSEDED);
        versionRepository.save(ngoProposed);

        int nextVer = nextVersionNumber(milestone.getId());
        MilestoneVersion counterVersion = new MilestoneVersion();
        counterVersion.setMilestone(milestone);
        counterVersion.setVersionNumber(nextVer);
        counterVersion.setProposedBy(MilestoneVersion.ProposedBy.FUNDER);
        counterVersion.setName(body.getCounterName() != null ? body.getCounterName() : ngoProposed.getName());
        counterVersion.setBudget(body.getCounterBudget() != null ? body.getCounterBudget() : ngoProposed.getBudget());
        counterVersion.setSequence(body.getCounterSequence() != null ? body.getCounterSequence() : ngoProposed.getSequence());
        counterVersion.setDueDate(body.getCounterDueDate() != null ? body.getCounterDueDate() : ngoProposed.getDueDate());
        counterVersion.setChangeReason("Funder counter-proposal: " +
                (body.getResponseNote() != null ? body.getResponseNote() : "no note provided"));
        counterVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
        counterVersion = versionRepository.save(counterVersion);

        // Create a new PENDING CR — now waiting for NGO response
        MilestoneChangeRequest counterCr = new MilestoneChangeRequest();
        counterCr.setMilestone(milestone);
        counterCr.setRequestedByOrg(funder);                 // this funder is now the initiator
        counterCr.setOriginalVersion(ngoProposed);            // NGO's proposal is now the baseline
        counterCr.setProposedVersion(counterVersion);         // Funder's counter is the new proposal
        counterCr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.PENDING);
        counterCr.setNgoResponseNote("Auto-created from Funder counter on CR " + cr.getId());
        changeRequestRepository.save(counterCr);

        // Milestone stays MODIFIED — still under negotiation
        milestone.setStatus(Milestone.MilestoneStatus.MODIFIED);
        milestoneRepository.save(milestone);
    }

    // =========================================================================
    // NGO-SIDE OPERATIONS
    // =========================================================================

    /**
     * Returns all PENDING change requests across all milestones of the NGO's projects.
     */
    @Transactional(readOnly = true)
    public List<ChangeRequestDto> getPendingChangeRequestsForNgo(UUID ngoUserId) {
        NgoProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new RuntimeException("NGO profile not found for user: " + ngoUserId));

        // Collect all PENDING CRs across all of this NGO's projects
        // This includes both funder-initiated CRs (NGO must respond) and NGO-initiated CRs (awaiting funder response)
        return projectRepository.findByNgoId(ngo.getId()).stream()
                .flatMap(p -> changeRequestRepository
                        .findByMilestone_Project_IdAndStatus(p.getId(), MilestoneChangeRequest.ChangeRequestStatus.PENDING)
                        .stream())
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * NGO responds to a PENDING change request.
     *
     * ACCEPT:
     *   - Proposed version becomes ACCEPTED
     *   - Original version becomes SUPERSEDED
     *   - Milestone.currentVersionId → proposedVersion.id
     *   - Milestone status: check if ALL milestones on the project are LOCKED (or PENDING with no open CRs) —
     *     if all clear, set this milestone to LOCKED
     *   - CR status: ACCEPTED
     *
     * COUNTER:
     *   - Current CR is marked COUNTERED
     *   - A new MilestoneVersion authored by NGO is created with the counter values
     *   - A NEW MilestoneChangeRequest is created (org → new CR authored by system on behalf of the counter)
     *     Actually: we create a new CR where the "proposed" is the NGO's counter-version,
     *     and the "original" is the funder's proposed version from the previous round.
     *
     * REJECT:
     *   - Proposed version becomes REJECTED
     *   - Milestone reverts to PENDING (original version stands)
     *   - CR status: REJECTED
     */
    @Transactional
    public ChangeRequestDto ngoRespondToChangeRequest(
            UUID crId,
            UUID ngoUserId,
            NgoChangeRequestResponseBody body) {

        if (body.getDecision() == null) {
            throw new IllegalArgumentException("Decision is required.");
        }

        MilestoneChangeRequest cr = changeRequestRepository.findById(crId)
                .orElseThrow(() -> new RuntimeException("Change request not found: " + crId));

        if (cr.getStatus() != MilestoneChangeRequest.ChangeRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot respond to a CR that is not PENDING. Current status: " + cr.getStatus());
        }

        // Verify ownership — the NGO must own the project that this milestone belongs to
        NgoProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new RuntimeException("NGO profile not found for user: " + ngoUserId));
        Project project = cr.getMilestone().getProject();
        if (project.getNgo() == null || !project.getNgo().getId().equals(ngo.getId())) {
            throw new SecurityException("This NGO does not own the project for this change request.");
        }

        cr.setNgoResponseNote(body.getResponseNote());
        cr.setRespondedAt(LocalDateTime.now());

        switch (body.getDecision()) {
            case ACCEPT -> handleAccept(cr);
            case REJECT -> handleReject(cr);
            case COUNTER -> handleCounter(cr, ngo, body);
        }

        changeRequestRepository.save(cr);

        auditLogService.logAction(cr.getMilestone().getId(), "MILESTONE_CR",
                "NGO " + ngoUserId + " responded to CR " + crId
                + " with decision: " + body.getDecision()
                + (body.getResponseNote() != null ? " | note: " + body.getResponseNote() : ""));

        // Notify Funder
        if (cr.getRequestedByOrg() != null && cr.getRequestedByOrg().getUser() != null) {
            notificationService.create(
                    Notification.RecipientType.FUNDER,
                    cr.getRequestedByOrg().getUser(),
                    cr.getMilestone().getProject(),
                    cr.getMilestone(),
                    Notification.NotificationEventType.CHANGE_REQUEST_RESPONDED,
                    "Milestone Proposal " + body.getDecision(),
                    "NGO " + body.getDecision().name().toLowerCase() + "ed your proposed changes for '" + cr.getMilestone().getTitle() + "'.",
                    "/funder/milestones"
            );
        }

        return toDto(cr);
    }

    // -------------------------------------------------------------------------
    // ACCEPT helper
    // -------------------------------------------------------------------------
    private void handleAccept(MilestoneChangeRequest cr) {
        MilestoneVersion proposed = cr.getProposedVersion();
        MilestoneVersion original = cr.getOriginalVersion();

        // Advance version statuses
        proposed.setStatus(MilestoneVersion.VersionStatus.ACCEPTED);
        original.setStatus(MilestoneVersion.VersionStatus.SUPERSEDED);
        versionRepository.save(proposed);
        versionRepository.save(original);

        // Advance milestone pointer, sync negotiated fields onto milestone, and lock it
        Milestone milestone = cr.getMilestone();
        milestone.setCurrentVersionId(proposed.getId());
        if (proposed.getName() != null) milestone.setTitle(proposed.getName());
        if (proposed.getBudget() != null) milestone.setAmountAllocated(proposed.getBudget());
        if (proposed.getSequence() != null) milestone.setSequenceNumber(proposed.getSequence());
        if (proposed.getDueDate() != null) milestone.setDueDate(proposed.getDueDate());
        milestone.setStatus(Milestone.MilestoneStatus.LOCKED);
        milestoneRepository.save(milestone);

        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.ACCEPTED);
    }

    // -------------------------------------------------------------------------
    // REJECT helper
    // -------------------------------------------------------------------------
    private void handleReject(MilestoneChangeRequest cr) {
        MilestoneVersion proposed = cr.getProposedVersion();
        proposed.setStatus(MilestoneVersion.VersionStatus.REJECTED);
        versionRepository.save(proposed);

        // Milestone reverts to PENDING — original version still stands
        Milestone milestone = cr.getMilestone();
        milestone.setStatus(Milestone.MilestoneStatus.PENDING);
        milestoneRepository.save(milestone);

        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.REJECTED);
    }

    // -------------------------------------------------------------------------
    // COUNTER helper
    // -------------------------------------------------------------------------
    private void handleCounter(MilestoneChangeRequest cr, NgoProfile ngo, NgoChangeRequestResponseBody body) {
        boolean anyCounterField = body.getCounterName() != null
                || body.getCounterBudget() != null
                || body.getCounterSequence() != null
                || body.getCounterDueDate() != null;
        if (!anyCounterField) {
            throw new IllegalArgumentException(
                    "A COUNTER decision requires at least one counter-proposal field (counterName, counterBudget, counterSequence, counterDueDate).");
        }

        MilestoneVersion funderProposed = cr.getProposedVersion();
        Milestone milestone = cr.getMilestone();

        // Mark the current CR as COUNTERED
        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.COUNTERED);

        // Create the NGO's counter-version (supersedes the funder's proposed version)
        funderProposed.setStatus(MilestoneVersion.VersionStatus.SUPERSEDED);
        versionRepository.save(funderProposed);

        int nextVer = nextVersionNumber(milestone.getId());
        MilestoneVersion counterVersion = new MilestoneVersion();
        counterVersion.setMilestone(milestone);
        counterVersion.setVersionNumber(nextVer);
        counterVersion.setProposedBy(MilestoneVersion.ProposedBy.NGO);
        counterVersion.setName(body.getCounterName() != null ? body.getCounterName() : funderProposed.getName());
        counterVersion.setBudget(body.getCounterBudget() != null ? body.getCounterBudget() : funderProposed.getBudget());
        counterVersion.setSequence(body.getCounterSequence() != null ? body.getCounterSequence() : funderProposed.getSequence());
        counterVersion.setDueDate(body.getCounterDueDate() != null ? body.getCounterDueDate() : funderProposed.getDueDate());
        counterVersion.setChangeReason("NGO counter-proposal: " +
                (body.getResponseNote() != null ? body.getResponseNote() : "no note provided"));
        counterVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
        counterVersion = versionRepository.save(counterVersion);

        // Create a new PENDING CR — the ball is now back in the org's court
        // (the "requested by org" remains the original org; this new CR is a system-generated one
        //  that the org needs to acknowledge with ACCEPT or a new change request)
        MilestoneChangeRequest counterCr = new MilestoneChangeRequest();
        counterCr.setMilestone(milestone);
        counterCr.setRequestedByOrg(cr.getRequestedByOrg()); // same org
        counterCr.setOriginalVersion(funderProposed);         // org's proposal is now the baseline
        counterCr.setProposedVersion(counterVersion);         // NGO's counter is the new proposal
        counterCr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.PENDING);
        counterCr.setNgoResponseNote("Auto-created from NGO counter on CR " + cr.getId());
        changeRequestRepository.save(counterCr);

        // Milestone stays MODIFIED — still under negotiation
        milestone.setStatus(Milestone.MilestoneStatus.MODIFIED);
        milestoneRepository.save(milestone);
    }

    // =========================================================================
    // NGO-INITIATED CHANGE REQUESTS
    // =========================================================================

    /**
     * NGO raises a change request on a milestone (bidirectional negotiation).
     *
     * Mirrors raiseChangeRequest() but authored by the NGO instead of a Funder.
     * The resulting CR is PENDING and awaits funder response.
     */
    @Transactional
    public ChangeRequestDto raiseNgoChangeRequest(
            UUID projectId,
            UUID milestoneId,
            UUID ngoUserId,
            ChangeRequestBody body) {

        // --- Validations ---
        if (body.getReason() == null || body.getReason().isBlank()) {
            throw new IllegalArgumentException("A change reason is required for auditability.");
        }
        boolean anyFieldChanged = body.getName() != null
                || body.getBudget() != null
                || body.getSequence() != null
                || body.getDueDate() != null;
        if (!anyFieldChanged) {
            throw new IllegalArgumentException("At least one field (name, budget, sequence, dueDate) must be proposed.");
        }

        NgoProfile ngo = ngoProfileRepository.findByUserId(ngoUserId)
                .orElseThrow(() -> new RuntimeException("NGO profile not found for user: " + ngoUserId));

        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found: " + milestoneId));

        if (!milestone.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Milestone does not belong to project " + projectId);
        }

        // Verify ownership
        Project project = milestone.getProject();
        if (project.getNgo() == null || !project.getNgo().getId().equals(ngo.getId())) {
            throw new SecurityException("This NGO does not own the project for this milestone.");
        }

        // Only PENDING or MODIFIED milestones can have new CRs raised
        if (milestone.getStatus() != Milestone.MilestoneStatus.PENDING
                && milestone.getStatus() != Milestone.MilestoneStatus.MODIFIED) {
            throw new IllegalStateException(
                    "Cannot raise a change request on a milestone in status: " + milestone.getStatus()
                    + ". Only PENDING or MODIFIED milestones are negotiable.");
        }

        // Duplicate guard: only one PENDING CR per milestone
        if (changeRequestRepository.existsByMilestoneIdAndStatus(
                milestoneId, MilestoneChangeRequest.ChangeRequestStatus.PENDING)) {
            throw new IllegalStateException(
                    "A change request for this milestone is already pending review. "
                    + "Wait for it to be resolved before raising a new one.");
        }

        // --- Create or retrieve the baseline (original) version ---
        MilestoneVersion originalVersion;
        if (milestone.getCurrentVersionId() != null) {
            originalVersion = versionRepository.findById(milestone.getCurrentVersionId())
                    .orElseThrow(() -> new RuntimeException("Current version not found"));
        } else {
            int nextVersion = nextVersionNumber(milestoneId);
            originalVersion = new MilestoneVersion();
            originalVersion.setMilestone(milestone);
            originalVersion.setVersionNumber(nextVersion);
            originalVersion.setProposedBy(MilestoneVersion.ProposedBy.NGO);
            originalVersion.setName(milestone.getTitle());
            originalVersion.setBudget(milestone.getAmountAllocated());
            originalVersion.setSequence(milestone.getSequenceNumber());
            originalVersion.setDueDate(milestone.getDueDate());
            originalVersion.setChangeReason("Initial baseline (auto-created on first change request)");
            originalVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
            originalVersion = versionRepository.save(originalVersion);
            milestone.setCurrentVersionId(originalVersion.getId());
        }

        // --- Create the NGO's proposed version ---
        int proposedVersionNumber = nextVersionNumber(milestoneId);
        MilestoneVersion proposedVersion = new MilestoneVersion();
        proposedVersion.setMilestone(milestone);
        proposedVersion.setVersionNumber(proposedVersionNumber);
        proposedVersion.setProposedBy(MilestoneVersion.ProposedBy.NGO);
        proposedVersion.setName(body.getName() != null ? body.getName() : originalVersion.getName());
        proposedVersion.setBudget(body.getBudget() != null ? body.getBudget() : originalVersion.getBudget());
        proposedVersion.setSequence(body.getSequence() != null ? body.getSequence() : originalVersion.getSequence());
        proposedVersion.setDueDate(body.getDueDate() != null ? body.getDueDate() : originalVersion.getDueDate());
        proposedVersion.setChangeReason(body.getReason());
        proposedVersion.setStatus(MilestoneVersion.VersionStatus.PROPOSED);
        proposedVersion = versionRepository.save(proposedVersion);

        // --- Create the change request (NGO-initiated) ---
        MilestoneChangeRequest cr = new MilestoneChangeRequest();
        cr.setMilestone(milestone);
        cr.setRequestedByNgo(ngo);  // NGO is the initiator
        cr.setOriginalVersion(originalVersion);
        cr.setProposedVersion(proposedVersion);
        cr.setStatus(MilestoneChangeRequest.ChangeRequestStatus.PENDING);
        cr = changeRequestRepository.save(cr);

        // --- Update milestone status to MODIFIED ---
        milestone.setStatus(Milestone.MilestoneStatus.MODIFIED);
        milestoneRepository.save(milestone);

        // --- Audit log ---
        auditLogService.logAction(milestoneId, "MILESTONE_CR",
                "NGO " + ngo.getOrgName() + " raised CR on milestone " + milestoneId
                + " | reason=" + body.getReason());

        return toDto(cr);
    }

    // =========================================================================
    // MAPPING HELPERS
    // =========================================================================

    private ChangeRequestDto toDto(MilestoneChangeRequest cr) {
        ChangeRequestDto dto = new ChangeRequestDto();
        dto.setId(cr.getId());
        dto.setMilestoneId(cr.getMilestone().getId());
        dto.setMilestoneTitle(cr.getMilestone().getTitle());
        
        // Populate initiator fields — exactly one of org/ngo is set
        if (cr.getRequestedByOrg() != null) {
            dto.setRequestedByOrgId(cr.getRequestedByOrg().getId());
            dto.setRequestedByOrgName(cr.getRequestedByOrg().getOrgName());
            dto.setInitiatedBy("FUNDER");
        }
        if (cr.getRequestedByNgo() != null) {
            dto.setRequestedByNgoId(cr.getRequestedByNgo().getId());
            dto.setRequestedByNgoName(cr.getRequestedByNgo().getOrgName());
            dto.setInitiatedBy("NGO");
        }
        
        dto.setStatus(cr.getStatus());
        dto.setCreatedAt(cr.getCreatedAt());
        dto.setRespondedAt(cr.getRespondedAt());
        dto.setNgoResponseNote(cr.getNgoResponseNote());
        dto.setOriginal(toVersionSnapshot(cr.getOriginalVersion()));
        dto.setProposed(toVersionSnapshot(cr.getProposedVersion()));
        return dto;
    }

    private ChangeRequestDto.VersionSnapshot toVersionSnapshot(MilestoneVersion v) {
        if (v == null) return null;
        ChangeRequestDto.VersionSnapshot snap = new ChangeRequestDto.VersionSnapshot();
        snap.setVersionId(v.getId());
        snap.setVersionNumber(v.getVersionNumber());
        snap.setProposedBy(v.getProposedBy());
        snap.setName(v.getName());
        snap.setBudget(v.getBudget());
        snap.setSequence(v.getSequence());
        snap.setDueDate(v.getDueDate());
        snap.setChangeReason(v.getChangeReason());
        snap.setStatus(v.getStatus());
        snap.setCreatedAt(v.getCreatedAt());
        return snap;
    }

    private int nextVersionNumber(UUID milestoneId) {
        return versionRepository
                .findTopByMilestoneIdOrderByVersionNumberDesc(milestoneId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);
    }

    @Transactional(readOnly = true)
    public List<ChangeRequestDto> getChangeRequestsForMilestone(UUID milestoneId) {
        return changeRequestRepository.findByMilestoneIdOrderByCreatedAtAsc(milestoneId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}
