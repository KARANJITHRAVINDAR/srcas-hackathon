package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org/impact")
@PreAuthorize("hasRole('FUNDER')")
public class OrgImpactController {

    @Autowired
    private FunderProfileRepository funderProfileRepository;

    @Autowired
    private OrgProjectEngagementRepository engagementRepository;

    @Autowired
    private ProjectImpactKpiRepository kpiRepository;

    @Autowired
    private ImpactReportRepository reportRepository;

    @Autowired
    private ImpactVerificationRepository verificationRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getGlobalImpactSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        FunderProfile funder = funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Funder profile not found"));

        List<OrgProjectEngagement> engagements = engagementRepository.findByFunderId(funder.getId());
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

        BigDecimal totalCommitted = BigDecimal.ZERO;
        Map<String, Map<String, Object>> sdgMap = new HashMap<>();
        List<Map<String, Object>> projectKpis = new ArrayList<>();

        for (Project project : activeProjects) {
            BigDecimal projectBudget = project.getTotalBudget() != null ? project.getTotalBudget() : BigDecimal.ZERO;
            totalCommitted = totalCommitted.add(projectBudget);

            // Aggregate SDG stats
            String sdgKey = project.getSdgGoal().name();
            Map<String, Object> sdgData = sdgMap.computeIfAbsent(sdgKey, k -> {
                Map<String, Object> map = new HashMap<>();
                map.put("sdg", k);
                map.put("projectCount", 0);
                map.put("totalAmount", BigDecimal.ZERO);
                return map;
            });
            sdgData.put("projectCount", (int) sdgData.get("projectCount") + 1);
            sdgData.put("totalAmount", ((BigDecimal) sdgData.get("totalAmount")).add(projectBudget));

            // Aggregate KPIs
            List<ProjectImpactKpi> kpis = kpiRepository.findByProjectId(project.getId());
            for (ProjectImpactKpi kpi : kpis) {
                Map<String, Object> kpiData = new HashMap<>();
                kpiData.put("projectId", project.getId());
                kpiData.put("projectTitle", project.getTitle());
                kpiData.put("sdg", project.getSdgGoal().name());
                kpiData.put("kpiId", kpi.getId());
                kpiData.put("kpiName", kpi.getKpiName());
                kpiData.put("unit", kpi.getUnit());
                kpiData.put("target", kpi.getTargetValue());

                List<ImpactReport> reports = reportRepository.findByKpiIdOrderBySubmittedAtDesc(kpi.getId());
                double reportedVal = 0;
                double verifiedVal = 0;
                String status = "NOT_REPORTED";

                if (!reports.isEmpty()) {
                    ImpactReport latestReport = reports.get(0);
                    reportedVal = latestReport.getReportedValue();
                    status = latestReport.getStatus().name();

                    List<ImpactVerification> verifications = verificationRepository.findByImpactReportIdOrderByVerifiedAtDesc(latestReport.getId());
                    if (!verifications.isEmpty()) {
                        verifiedVal = verifications.get(0).getVerifiedValue();
                        if (latestReport.getStatus() == ImpactReport.ReportStatus.PENDING && verifiedVal > 0) {
                            status = "PARTIALLY_VERIFIED";
                        }
                    }
                }

                kpiData.put("reported", reportedVal);
                kpiData.put("verified", verifiedVal);
                kpiData.put("status", status);

                projectKpis.add(kpiData);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalCommitted", totalCommitted);
        response.put("totalProjects", activeProjects.size());
        response.put("sdgBreakdown", new ArrayList<>(sdgMap.values()));
        response.put("kpis", projectKpis);

        return ResponseEntity.ok(response);
    }
}
