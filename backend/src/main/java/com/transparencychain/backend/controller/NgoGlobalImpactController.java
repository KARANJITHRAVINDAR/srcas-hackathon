package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/impact")
@PreAuthorize("hasRole('NGO')")
public class NgoGlobalImpactController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @Autowired
    private ProjectImpactKpiRepository kpiRepository;

    @Autowired
    private ImpactReportRepository reportRepository;

    @Autowired
    private ImpactVerificationRepository verificationRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getGlobalImpactSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));

        List<Project> projects = projectRepository.findByNgoId(ngo.getId());

        int totalProjects = projects.size();
        int activeProjectsWithImpact = 0;
        double totalVerifiedBeneficiaries = 0;
        Set<String> activeSdgs = new HashSet<>();
        
        List<Map<String, Object>> projectKpis = new ArrayList<>();

        for (Project project : projects) {
            List<ProjectImpactKpi> kpis = kpiRepository.findByProjectId(project.getId());
            if (!kpis.isEmpty()) {
                activeProjectsWithImpact++;
                activeSdgs.add(project.getSdgGoal().name());
            }

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

                // Accumulate global beneficiaries if the KPI name contains "access" or "people" (simplistic aggregation for demo)
                if (kpi.getKpiName().toLowerCase().contains("access") || kpi.getKpiName().toLowerCase().contains("people") || kpi.getKpiName().toLowerCase().contains("beneficiaries")) {
                    totalVerifiedBeneficiaries += verifiedVal;
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalProjects", totalProjects);
        response.put("activeProjectsWithImpact", activeProjectsWithImpact);
        response.put("totalVerifiedBeneficiaries", totalVerifiedBeneficiaries);
        response.put("activeSdgsCount", activeSdgs.size());
        response.put("kpis", projectKpis);

        return ResponseEntity.ok(response);
    }
}
