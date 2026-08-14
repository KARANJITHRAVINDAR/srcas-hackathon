package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.*;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Phase 1 — Project Discovery & Detail View
 *
 * Responsibilities:
 *  - Browse PUBLISHED projects with optional filters
 *  - Load project detail with NGO trust profile + ordered milestone list
 *  - Mark engagement as UNDER_REVIEW (with state guard)
 *  - Create/update OrgProjectEngagement records
 *
 * Does NOT touch escrow, evidence, or blockchain — those belong to other services.
 */
@Service
public class OrgProjectService {

    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private MilestoneVersionRepository versionRepository;
    @Autowired private FunderProfileRepository funderProfileRepository;
    @Autowired private OrgProjectEngagementRepository engagementRepository;
    @Autowired private NgoProfileRepository ngoProfileRepository;
    @Autowired private TrustScoreService trustScoreService;
    @Autowired private AuditLogService auditLogService;
    @Autowired private NotificationService notificationService;

    // -------------------------------------------------------------------------
    // 1. BROWSE PUBLISHED PROJECTS
    // -------------------------------------------------------------------------

    /**
     * Returns a filtered list of PUBLISHED project cards.
     * All filter parameters are optional; passing null means "no filter on this dimension".
     */
    @Transactional(readOnly = true)
    public List<ProjectCardDto> browsePublishedProjects(
            UUID callingFunderId,
            Project.SdgGoal sdgGoal,
            String geography,
            BigDecimal budgetMin,
            BigDecimal budgetMax) {

        List<Project> projects = projectRepository.findPublishedWithFilters(
                sdgGoal, geography, budgetMin, budgetMax);

        // Load all engagements for this funder in one query to avoid N+1
        Map<UUID, OrgProjectEngagement.EngagementStatus> engagementMap =
                engagementRepository.findByFunderId(callingFunderId).stream()
                        .collect(Collectors.toMap(
                                e -> e.getProject().getId(),
                                OrgProjectEngagement::getStatus
                        ));

        return projects.stream()
                .map(p -> toCardDto(p, engagementMap.get(p.getId())))
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // 2. PROJECT DETAIL (read-only)
    // -------------------------------------------------------------------------

    /**
     * Returns the full project detail for the org's detail screen.
     * Also auto-creates an engagement record at DISCOVERED status on first view.
     */
    @Transactional
    public ProjectDetailDto getProjectDetail(UUID projectId, UUID funderId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        if (project.getStatus() == Project.ProjectStatus.DRAFT || project.getStatus() == Project.ProjectStatus.CANCELLED) {
            throw new IllegalStateException("Project is not publicly viewable (status: " + project.getStatus() + ")");
        }

        FunderProfile funder = funderProfileRepository.findById(funderId)
                .orElseThrow(() -> new RuntimeException("Funder profile not found: " + funderId));

        // Auto-register engagement as DISCOVERED on first open
        OrgProjectEngagement engagement = engagementRepository
                .findByFunderIdAndProjectId(funderId, projectId)
                .orElseGet(() -> {
                    OrgProjectEngagement e = new OrgProjectEngagement();
                    e.setFunder(funder);
                    e.setProject(project);
                    e.setStatus(OrgProjectEngagement.EngagementStatus.DISCOVERED);
                    e.setViewedAt(LocalDateTime.now());
                    OrgProjectEngagement saved = engagementRepository.save(e);
                    auditLogService.logAction(
                            projectId, "ORG_ENGAGEMENT",
                            "Funder " + funderId + " discovered project " + projectId);
                    return saved;
                });

        // Build milestone list ordered by sequenceNumber
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        for (Milestone m : milestones) {
            if (m.getTitle() != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                if (matcher.find()) {
                    m.setSequenceNumber(Integer.parseInt(matcher.group(1)));
                }
            }
        }
        milestones.sort((a, b) -> Integer.compare(
            a.getSequenceNumber() != null ? a.getSequenceNumber() : 99,
            b.getSequenceNumber() != null ? b.getSequenceNumber() : 99
        ));

        // Build NGO trust profile panel
        NgoTrustProfileDto trustProfile = buildTrustProfile(project.getNgo());

        return toDetailDto(project, engagement, trustProfile, milestones);
    }

    // -------------------------------------------------------------------------
    // 3. MARK UNDER_REVIEW
    // -------------------------------------------------------------------------

    /**
     * Transitions engagement from DISCOVERED -> UNDER_REVIEW.
     * Guards against invalid transitions — can only move forward, not backward.
     */
    @Transactional
    public ProjectDetailDto markUnderReview(UUID projectId, UUID funderId) {
        OrgProjectEngagement engagement = engagementRepository
                .findByFunderIdAndProjectId(funderId, projectId)
                .orElseThrow(() -> new RuntimeException(
                        "No engagement found. Open the project detail first to register discovery."));

        if (engagement.getStatus() != OrgProjectEngagement.EngagementStatus.DISCOVERED) {
            throw new IllegalStateException(
                    "Engagement is already in status " + engagement.getStatus() +
                    ". Expected DISCOVERED to transition to UNDER_REVIEW.");
        }

        String before = engagement.getStatus().name();
        engagement.setStatus(OrgProjectEngagement.EngagementStatus.UNDER_REVIEW);
        engagementRepository.save(engagement);

        auditLogService.logAction(
                projectId, "ORG_ENGAGEMENT",
                "Funder " + funderId + " moved engagement to UNDER_REVIEW (was: " + before + ")");

        // Notify NGO
        if (engagement.getProject() != null && engagement.getProject().getNgo() != null && engagement.getProject().getNgo().getUser() != null) {
            notificationService.create(
                    Notification.RecipientType.NGO,
                    engagement.getProject().getNgo().getUser(),
                    engagement.getProject(),
                    null,
                    Notification.NotificationEventType.PROJECT_UNDER_REVIEW,
                    "Project Under Review",
                    "A funder started reviewing your published project '" + engagement.getProject().getTitle() + "'.",
                    "/ngo/projects/" + engagement.getProject().getId()
            );
        }

        // Return the refreshed detail view
        return getProjectDetail(projectId, funderId);
    }

    /**
     * Transitions engagement from UNDER_REVIEW -> NEGOTIATING.
     * Guards against invalid transitions.
     */
    @Transactional
    public ProjectDetailDto markNegotiating(UUID projectId, UUID funderId) {
        OrgProjectEngagement engagement = engagementRepository
                .findByFunderIdAndProjectId(funderId, projectId)
                .orElseThrow(() -> new RuntimeException(
                        "No engagement found. Open the project detail first to register discovery."));

        if (engagement.getStatus() != OrgProjectEngagement.EngagementStatus.UNDER_REVIEW) {
            throw new IllegalStateException(
                    "Engagement is already in status " + engagement.getStatus() +
                    ". Expected UNDER_REVIEW to transition to NEGOTIATING.");
        }

        String before = engagement.getStatus().name();
        engagement.setStatus(OrgProjectEngagement.EngagementStatus.NEGOTIATING);
        engagementRepository.save(engagement);

        auditLogService.logAction(
                projectId, "ORG_ENGAGEMENT",
                "Funder " + funderId + " moved engagement to NEGOTIATING (was: " + before + ")");

        return getProjectDetail(projectId, funderId);
    }

    // -------------------------------------------------------------------------
    // MAPPING HELPERS
    // -------------------------------------------------------------------------

    private ProjectCardDto toCardDto(Project p, OrgProjectEngagement.EngagementStatus engStatus) {
        ProjectCardDto dto = new ProjectCardDto();
        dto.setProjectId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setDescription(p.getDescription());
        dto.setSdgGoal(p.getSdgGoal());
        dto.setTotalBudget(p.getTotalBudget());
        dto.setGeography(p.getGeography());
        dto.setExpectedBeneficiaries(p.getExpectedBeneficiaries());
        dto.setProjectStatus(p.getStatus());
        dto.setCreatedAt(p.getCreatedAt());

        if (p.getNgo() != null) {
            dto.setNgoProfileId(p.getNgo().getId());
            dto.setNgoOrgName(p.getNgo().getOrgName());
            dto.setNgoTrustScore(p.getNgo().getTrustScore());
            dto.setNgoVerificationStatus(p.getNgo().getVerificationStatus().name());
        }

        dto.setEngagementStatus(engStatus); // null = not yet discovered by this funder
        return dto;
    }

    private ProjectDetailDto toDetailDto(
            Project p,
            OrgProjectEngagement engagement,
            NgoTrustProfileDto trustProfile,
            List<Milestone> milestones) {

        ProjectDetailDto dto = new ProjectDetailDto();
        dto.setProjectId(p.getId());
        dto.setTitle(p.getTitle());
        dto.setDescription(p.getDescription());
        dto.setSdgGoal(p.getSdgGoal());
        dto.setSdgTarget(p.getSdgTarget());
        dto.setTotalBudget(p.getTotalBudget());
        dto.setGeography(p.getGeography());
        dto.setLatitude(p.getLatitude());
        dto.setLongitude(p.getLongitude());
        dto.setDisplayAddress(p.getDisplayAddress());
        dto.setLocationName(p.getLocationName());
        dto.setRoad(p.getRoad());
        dto.setNeighbourhood(p.getNeighbourhood());
        dto.setSuburb(p.getSuburb());
        dto.setLocality(p.getLocality());
        dto.setCity(p.getCity());
        dto.setDistrict(p.getDistrict());
        dto.setState(p.getState());
        dto.setPostcode(p.getPostcode());
        dto.setCountry(p.getCountry());
        dto.setCountryCode(p.getCountryCode());
        dto.setGeocodingProvider(p.getGeocodingProvider());
        dto.setGeocodedAt(p.getGeocodedAt());
        dto.setLocationStatus(p.getLocationStatus());
        dto.setLocationBlockchainHash(p.getLocationBlockchainHash());
        dto.setProjectDuration(p.getProjectDuration());
        dto.setImpactKpi(p.getImpactKpi());
        dto.setExpectedBeneficiaries(p.getExpectedBeneficiaries());
        dto.setStatus(p.getStatus());
        dto.setCreatedAt(p.getCreatedAt());

        dto.setEngagementStatus(engagement.getStatus());
        dto.setEngagementId(engagement.getId());
        dto.setWithdrawnAt(engagement.getWithdrawnAt());
        dto.setWithdrawnBy(engagement.getWithdrawnBy());
        dto.setWithdrawalReason(engagement.getWithdrawalReason());
        dto.setRemodifyStatus(engagement.getRemodifyStatus());
        if (engagement.getFunder() != null) {
            dto.setWithdrawnFunderName(engagement.getFunder().getOrgName());
        }
        dto.setNgoTrustProfile(trustProfile);

        dto.setMilestones(milestones.stream().map(this::toMilestoneSummary).collect(Collectors.toList()));

        return dto;
    }

    private MilestoneSummaryDto toMilestoneSummary(Milestone m) {
        MilestoneSummaryDto dto = new MilestoneSummaryDto();
        dto.setId(m.getId());
        
        // If there's an active negotiated version, use those values
        if (m.getCurrentVersionId() != null) {
            MilestoneVersion version = versionRepository.findById(m.getCurrentVersionId()).orElse(null);
            if (version != null) {
                dto.setTitle(version.getName());
                dto.setAmountAllocated(version.getBudget());
                dto.setSequenceNumber(version.getSequence());
                dto.setDueDate(version.getDueDate());
            } else {
                dto.setTitle(m.getTitle());
                dto.setAmountAllocated(m.getAmountAllocated());
                dto.setSequenceNumber(m.getSequenceNumber());
                dto.setDueDate(m.getDueDate());
            }
        } else {
            dto.setTitle(m.getTitle());
            dto.setAmountAllocated(m.getAmountAllocated());
            dto.setSequenceNumber(m.getSequenceNumber());
            dto.setDueDate(m.getDueDate());
        }
        
        dto.setDescription(m.getDescription());
        dto.setStatus(m.getStatus());
        dto.setRequiredEvidence(m.getRequiredEvidence());
        dto.setVerificationRequirements(m.getVerificationRequirements());
        return dto;
    }

    private NgoTrustProfileDto buildTrustProfile(NgoProfile ngo) {
        if (ngo == null) return null;

        // Use the existing TrustScoreService for the dimensional breakdown
        Map<String, Object> breakdown = trustScoreService.getTrustScoreBreakdown(ngo.getId());

        NgoTrustProfileDto dto = new NgoTrustProfileDto();
        dto.setNgoProfileId(ngo.getId());
        dto.setOrgName(ngo.getOrgName());
        dto.setDarpanId(ngo.getDarpanId());
        dto.setPanNumber(ngo.getPanNumber());
        dto.setRegistrationType(ngo.getRegistrationType());
        dto.setRegistrationNumber(ngo.getRegistrationNumber());
        dto.setRegisteredAddress(ngo.getRegisteredAddress());
        dto.setContactEmail(ngo.getContactEmail());
        dto.setWebsite(ngo.getWebsite());
        dto.setVerificationStatus(ngo.getVerificationStatus());
        dto.setVerifiedAt(ngo.getVerifiedAt());
        dto.setOverallTrustScore(ngo.getTrustScore());
        dto.setFocusSdgGoals(ngo.getFocusSdgGoals());
        dto.setOperationalStates(ngo.getOperationalStates());

        // Dimensional scores from TrustScoreService
        dto.setRegistrationAgeScore(toInt(breakdown.get("registrationAgeScore")));
        dto.setDocumentCompletenessScore(toInt(breakdown.get("documentCompletenessScore")));
        dto.setPastProjectsOnTimeScore(toInt(breakdown.get("pastProjectsCompletedOnTimeScore")));
        dto.setAvgFraudScoreOnBillsScore(toInt(breakdown.get("averageFraudScoreAcrossPastBillsScore")));
        dto.setBeneficiaryConfirmationRate(toInt(breakdown.get("beneficiaryConfirmationRateScore")));

        // Compliance flags
        dto.setHas80G(ngo.getReg80gNumber() != null && !ngo.getReg80gNumber().isBlank());
        dto.setHas12A(ngo.getReg12aNumber() != null && !ngo.getReg12aNumber().isBlank());
        dto.setHasFcra(ngo.getFcraNumber() != null && !ngo.getFcraNumber().isBlank());
        dto.setHasCsr1(ngo.getCsr1RegistrationNumber() != null && !ngo.getCsr1RegistrationNumber().isBlank());

        return dto;
    }

    private int toInt(Object value) {
        if (value == null) return 0;
        if (value instanceof Number) return ((Number) value).intValue();
        return 0;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllMilestonesForFunder(UUID funderId) {
        List<OrgProjectEngagement> engagements = engagementRepository.findByFunderId(funderId);
        
        List<OrgProjectEngagement.EngagementStatus> activeStatuses = List.of(
            OrgProjectEngagement.EngagementStatus.NEGOTIATING,
            OrgProjectEngagement.EngagementStatus.COMMITTED,
            OrgProjectEngagement.EngagementStatus.ACTIVE,
            OrgProjectEngagement.EngagementStatus.COMPLETED
        );

        List<Project> activeProjects = engagements.stream()
            .filter(e -> activeStatuses.contains(e.getStatus()))
            .map(OrgProjectEngagement::getProject)
            .collect(Collectors.toList());

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Project project : activeProjects) {
            List<Milestone> milestones = milestoneRepository.findByProjectId(project.getId());
            for (Milestone m : milestones) {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("milestoneId", m.getId());
                map.put("milestoneTitle", m.getTitle());
                map.put("milestoneDescription", m.getDescription());
                map.put("milestoneStatus", m.getStatus().name());
                map.put("amountAllocated", m.getAmountAllocated());
                map.put("dueDate", m.getDueDate() != null ? m.getDueDate().toString() : null);
                map.put("sequenceNumber", m.getSequenceNumber());
                map.put("projectId", project.getId());
                map.put("projectTitle", project.getTitle());
                map.put("ngoName", project.getNgo() != null ? project.getNgo().getOrgName() : "NGO Partner");
                result.add(map);
            }
        }
        return result;
    }
}
