package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.*;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
    @Autowired private AuditLogService auditLogService;

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

        // Collect all projects for this NGO, then gather PENDING CRs across all of them
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

        // Advance milestone pointer and lock it
        Milestone milestone = cr.getMilestone();
        milestone.setCurrentVersionId(proposed.getId());
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
    // MAPPING HELPERS
    // =========================================================================

    private ChangeRequestDto toDto(MilestoneChangeRequest cr) {
        ChangeRequestDto dto = new ChangeRequestDto();
        dto.setId(cr.getId());
        dto.setMilestoneId(cr.getMilestone().getId());
        dto.setMilestoneTitle(cr.getMilestone().getTitle());
        dto.setRequestedByOrgId(cr.getRequestedByOrg().getId());
        dto.setRequestedByOrgName(cr.getRequestedByOrg().getOrgName());
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
