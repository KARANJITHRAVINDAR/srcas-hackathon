package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ImpactGenerationService {

    @Autowired
    private ImpactMetricRepository impactMetricRepository;

    @Autowired
    private BeneficiaryFeedbackRepository beneficiaryFeedbackRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private ImpactReportRepository impactReportRepository;

    @Autowired
    private OpenRouterAiService openRouterAiService;

    @Autowired
    private AuditLogService auditLogService;

    /**
     * Initializes AI-derived impact metrics when a new project is proposed.
     */
    @Transactional
    public List<ImpactMetric> initializeProjectMetrics(Project project) {
        List<ImpactMetric> existing = impactMetricRepository.findByProjectId(project.getId());
        if (!existing.isEmpty()) {
            return existing;
        }

        List<ImpactMetric> metrics = new ArrayList<>();
        int targetBeneficiaries = project.getExpectedBeneficiaries() != null ? project.getExpectedBeneficiaries() : 1000;
        String title = project.getTitle() != null ? project.getTitle() : "Community Development";
        String description = project.getDescription() != null ? project.getDescription() : "";
        String sdgGoal = project.getSdgGoal() != null ? project.getSdgGoal().name() : "SDG1";

        // 1. Try AI derivation via LLM
        try {
            String prompt = String.format(
                "You are an impact evaluation expert. Given this CSR/NGO project:\n" +
                "Title: %s\nDescription: %s\nSDG Goal: %s\nTarget Beneficiaries: %d\n\n" +
                "Derive 2 to 3 specific, measurable impact metrics with realistic target quantities and units for this project.\n" +
                "Return ONLY a JSON object formatted as:\n" +
                "{\n" +
                "  \"metrics\": [\n" +
                "    { \"name\": \"Primary Beneficiaries Reached\", \"target\": %d, \"unit\": \"people\" },\n" +
                "    { \"name\": \"Infrastructure / Goods Delivered\", \"target\": 50, \"unit\": \"units\" }\n" +
                "  ]\n" +
                "}", title, description, sdgGoal, targetBeneficiaries, targetBeneficiaries
            );

            JsonNode root = openRouterAiService.callLlamaModel(prompt);
            if (root != null && root.has("metrics") && root.get("metrics").isArray()) {
                for (JsonNode mNode : root.get("metrics")) {
                    ImpactMetric im = new ImpactMetric();
                    im.setProject(project);
                    im.setMetricName(mNode.path("name").asText("Impact Metric"));
                    im.setTargetValue(BigDecimal.valueOf(mNode.path("target").asDouble(targetBeneficiaries)));
                    im.setReportedValue(BigDecimal.ZERO);
                    im.setVerifiedValue(BigDecimal.ZERO);
                    im.setUnit(mNode.path("unit").asText("units"));
                    im.setLastUpdatedFrom("AI_INITIALIZATION");
                    metrics.add(im);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed AI metric generation, falling back to rule-based: " + e.getMessage());
        }

        // 2. Fallback rule-based generation if AI was empty
        if (metrics.isEmpty()) {
            ImpactMetric m1 = new ImpactMetric();
            m1.setProject(project);
            m1.setMetricName("Direct Beneficiaries Served");
            m1.setTargetValue(BigDecimal.valueOf(targetBeneficiaries));
            m1.setReportedValue(BigDecimal.ZERO);
            m1.setVerifiedValue(BigDecimal.ZERO);
            m1.setUnit("people");
            m1.setLastUpdatedFrom("RULE_INITIALIZATION");
            metrics.add(m1);

            ImpactMetric m2 = new ImpactMetric();
            m2.setProject(project);
            m2.setMetricName("Project Activities Completed");
            m2.setTargetValue(BigDecimal.valueOf(100));
            m2.setReportedValue(BigDecimal.ZERO);
            m2.setVerifiedValue(BigDecimal.ZERO);
            m2.setUnit("%");
            m2.setLastUpdatedFrom("RULE_INITIALIZATION");
            metrics.add(m2);
        }

        return impactMetricRepository.saveAll(metrics);
    }

    /**
     * Triggered on evidence submission: parses milestone portion and increments `reportedValue`.
     */
    @Transactional
    public void processEvidenceSubmission(Milestone milestone, ProofSubmission proof) {
        if (milestone == null || milestone.getProject() == null) return;
        Project project = milestone.getProject();

        List<ImpactMetric> metrics = impactMetricRepository.findByProjectId(project.getId());
        if (metrics.isEmpty()) {
            metrics = initializeProjectMetrics(project);
        }

        List<Milestone> allMilestones = milestoneRepository.findByProjectIdOrderBySequenceNumberAsc(project.getId());
        int totalMilestones = Math.max(1, allMilestones.size());
        BigDecimal weight = BigDecimal.ONE.divide(BigDecimal.valueOf(totalMilestones), 4, RoundingMode.HALF_UP);

        for (ImpactMetric metric : metrics) {
            BigDecimal milestoneTargetShare = metric.getTargetValue().multiply(weight).setScale(2, RoundingMode.HALF_UP);
            BigDecimal newReported = metric.getReportedValue().add(milestoneTargetShare);
            if (newReported.compareTo(metric.getTargetValue()) > 0) {
                newReported = metric.getTargetValue();
            }
            metric.setReportedValue(newReported);
            metric.setLastUpdatedFrom("EVIDENCE_" + proof.getId());
            impactMetricRepository.save(metric);
        }

        auditLogService.logAction(project.getId(), "IMPACT_EVIDENCE_PROCESSED", 
                "Updated reported impact values for milestone: " + milestone.getTitle());
    }

    /**
     * Triggered on verification (ticket acceptance / AI pass): advances `verifiedValue` and logs history.
     */
    @Transactional
    public void processVerificationDecision(Milestone milestone, String referenceId) {
        if (milestone == null || milestone.getProject() == null) return;
        Project project = milestone.getProject();

        List<ImpactMetric> metrics = impactMetricRepository.findByProjectId(project.getId());
        if (metrics.isEmpty()) {
            metrics = initializeProjectMetrics(project);
        }

        List<Milestone> allMilestones = milestoneRepository.findByProjectIdOrderBySequenceNumberAsc(project.getId());
        int totalMilestones = Math.max(1, allMilestones.size());
        BigDecimal weight = BigDecimal.ONE.divide(BigDecimal.valueOf(totalMilestones), 4, RoundingMode.HALF_UP);

        for (ImpactMetric metric : metrics) {
            BigDecimal milestoneTargetShare = metric.getTargetValue().multiply(weight).setScale(2, RoundingMode.HALF_UP);
            BigDecimal newVerified = metric.getVerifiedValue().add(milestoneTargetShare);
            if (newVerified.compareTo(metric.getTargetValue()) > 0) {
                newVerified = metric.getTargetValue();
            }
            metric.setVerifiedValue(newVerified);
            metric.setLastUpdatedFrom("VERIFICATION_" + referenceId);
            impactMetricRepository.save(metric);

            // Append immutable Impact Report History record
            ImpactReport report = new ImpactReport();
            report.setProject(project);
            report.setKpiName(metric.getMetricName());
            report.setReportingPeriod(milestone.getTitle());
            report.setReportedValue(milestoneTargetShare.doubleValue());
            report.setStatus(ImpactReport.ReportStatus.VERIFIED);
            report.setDescription("Milestone verified independently by AI Risk Engine & Funder release.");
            report.setSubmittedAt(LocalDateTime.now());
            impactReportRepository.save(report);
        }

        auditLogService.logAction(project.getId(), "IMPACT_VERIFIED_RECORDED", 
                "Verified impact metrics advanced and history logged for: " + milestone.getTitle());
    }

    /**
     * Records beneficiary feedback (QR video/audio/form feedback).
     */
    @Transactional
    public BeneficiaryFeedback recordBeneficiaryFeedback(UUID projectId, UUID milestoneId, String videoUrl, String feedbackText, BeneficiaryFeedback.FeedbackStatus status) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        Milestone milestone = milestoneId != null ? milestoneRepository.findById(milestoneId).orElse(null) : null;

        BeneficiaryFeedback feedback = new BeneficiaryFeedback();
        feedback.setProject(project);
        feedback.setMilestone(milestone);
        feedback.setVideoUrl(videoUrl);
        feedback.setFeedbackText(feedbackText);
        feedback.setStatus(status != null ? status : BeneficiaryFeedback.FeedbackStatus.CONFIRMED);
        feedback.setReviewedAt(LocalDateTime.now());
        
        return beneficiaryFeedbackRepository.save(feedback);
    }

    /**
     * Assembles dynamic, zero-manual-entry dashboard payload for the Impact Page.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getImpactDashboard(UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<ImpactMetric> metrics = impactMetricRepository.findByProjectId(projectId);
        if (metrics.isEmpty()) {
            metrics = initializeProjectMetrics(project);
        }

        int targetBeneficiaries = project.getExpectedBeneficiaries() != null ? project.getExpectedBeneficiaries() : 1000;
        
        // Find primary metric for top-level summary
        ImpactMetric primaryMetric = metrics.stream()
                .filter(m -> m.getUnit() != null && m.getUnit().equalsIgnoreCase("people"))
                .findFirst()
                .orElse(metrics.get(0));

        BigDecimal reportedBeneficiaries = primaryMetric.getReportedValue();
        BigDecimal verifiedBeneficiaries = primaryMetric.getVerifiedValue();

        double verificationProgress = 0.0;
        if (targetBeneficiaries > 0) {
            verificationProgress = Math.min(100.0, (verifiedBeneficiaries.doubleValue() / targetBeneficiaries) * 100.0);
        }

        // Beneficiary confirmation counts from real feedback
        long confirmedCount = beneficiaryFeedbackRepository.countByProjectIdAndStatus(projectId, BeneficiaryFeedback.FeedbackStatus.CONFIRMED);
        long pendingCount = beneficiaryFeedbackRepository.countByProjectIdAndStatus(projectId, BeneficiaryFeedback.FeedbackStatus.PENDING);
        long disputedCount = beneficiaryFeedbackRepository.countByProjectIdAndStatus(projectId, BeneficiaryFeedback.FeedbackStatus.DISPUTED);

        List<Map<String, Object>> kpiList = new ArrayList<>();
        for (ImpactMetric m : metrics) {
            Map<String, Object> kpiMap = new LinkedHashMap<>();
            kpiMap.put("id", m.getId());
            kpiMap.put("name", m.getMetricName());
            kpiMap.put("target", m.getTargetValue());
            kpiMap.put("reported", m.getReportedValue());
            kpiMap.put("verified", m.getVerifiedValue());
            kpiMap.put("unit", m.getUnit());
            
            String status = "PENDING";
            if (m.getVerifiedValue().compareTo(m.getTargetValue()) >= 0 && m.getTargetValue().compareTo(BigDecimal.ZERO) > 0) {
                status = "VERIFIED";
            } else if (m.getVerifiedValue().compareTo(BigDecimal.ZERO) > 0) {
                status = "PARTIALLY_VERIFIED";
            }
            kpiMap.put("status", status);
            kpiList.add(kpiMap);
        }

        List<ImpactReport> historyReports = impactReportRepository.findByProjectId(projectId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("projectId", project.getId());
        response.put("goal", project.getDescription() != null && !project.getDescription().isBlank() ? project.getDescription() : project.getTitle());
        response.put("sdgGoal", project.getSdgGoal() != null ? project.getSdgGoal().name() : "SDG1");
        response.put("targetBeneficiaries", targetBeneficiaries);
        response.put("reportedBeneficiaries", reportedBeneficiaries.intValue());
        response.put("verifiedBeneficiaries", verifiedBeneficiaries.intValue());
        response.put("verificationProgress", Math.round(verificationProgress));
        response.put("kpis", kpiList);
        response.put("beneficiaryConfirmation", Map.of(
            "confirmed", confirmedCount,
            "pending", pendingCount,
            "disputed", disputedCount
        ));
        response.put("history", historyReports.stream().map(h -> Map.of(
            "id", h.getId(),
            "date", h.getSubmittedAt() != null ? h.getSubmittedAt().toString() : LocalDateTime.now().toString(),
            "period", h.getReportingPeriod() != null ? h.getReportingPeriod() : "Milestone Review",
            "kpiName", h.getKpiName() != null ? h.getKpiName() : (h.getKpi() != null ? h.getKpi().getKpiName() : "General Impact"),
            "reportedValue", h.getReportedValue() != null ? h.getReportedValue().toString() : "N/A",
            "status", h.getStatus() != null ? h.getStatus().name() : "VERIFIED"
        )).toList());

        return response;
    }
}
