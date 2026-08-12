package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/impact")
@PreAuthorize("hasRole('NGO')")
public class ProjectImpactController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectImpactKpiRepository kpiRepository;

    @Autowired
    private ImpactReportRepository reportRepository;

    @Autowired
    private ImpactVerificationRepository verificationRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getImpactDashboard(@PathVariable UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<ProjectImpactKpi> kpis = kpiRepository.findByProjectId(projectId);

        List<Map<String, Object>> kpiResponses = new ArrayList<>();
        double totalTarget = 0;
        double totalReported = 0;
        double totalVerified = 0;

        for (ProjectImpactKpi kpi : kpis) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", kpi.getId());
            map.put("name", kpi.getKpiName());
            map.put("unit", kpi.getUnit());
            map.put("target", kpi.getTargetValue());
            
            // Get latest report
            List<ImpactReport> reports = reportRepository.findByKpiIdOrderBySubmittedAtDesc(kpi.getId());
            ImpactReport latestReport = reports.isEmpty() ? null : reports.get(0);
            
            double reportedVal = 0;
            double verifiedVal = 0;
            String status = "NOT_REPORTED";

            if (latestReport != null) {
                reportedVal = latestReport.getReportedValue();
                status = latestReport.getStatus().toString();
                
                // Get verified value
                List<ImpactVerification> verifications = verificationRepository.findByImpactReportIdOrderByVerifiedAtDesc(latestReport.getId());
                if (!verifications.isEmpty()) {
                    verifiedVal = verifications.get(0).getVerifiedValue();
                    if(latestReport.getStatus() == ImpactReport.ReportStatus.PENDING && verifications.get(0).getVerifiedValue() > 0) {
                        status = "PARTIALLY_VERIFIED"; // Fallback status calculation
                    }
                }
            }

            map.put("reported", reportedVal);
            map.put("verified", verifiedVal);
            map.put("status", status);
            
            totalTarget += (kpi.getTargetValue() != null ? kpi.getTargetValue() : 0);
            totalReported += reportedVal;
            totalVerified += verifiedVal;

            kpiResponses.add(map);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("goal", project.getSdgTarget());
        response.put("targetBeneficiaries", project.getExpectedBeneficiaries());
        response.put("reportedBeneficiaries", totalReported > 0 ? (int)(totalReported * 0.8) : 0); // Simplified for demo
        response.put("verifiedBeneficiaries", totalVerified > 0 ? (int)(totalVerified * 0.8) : 0); // Simplified for demo
        response.put("kpis", kpiResponses);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<?> getImpactHistory(@PathVariable UUID projectId) {
        List<ImpactReport> reports = reportRepository.findByProjectId(projectId);
        List<Map<String, Object>> response = new ArrayList<>();
        
        for (ImpactReport r : reports) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("kpiName", r.getKpi().getKpiName());
            map.put("period", r.getReportingPeriod());
            map.put("reportedValue", r.getReportedValue());
            map.put("status", r.getStatus());
            map.put("date", r.getSubmittedAt());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reports")
    public ResponseEntity<?> submitImpactReport(@PathVariable UUID projectId,
                                                @RequestParam("kpiId") UUID kpiId,
                                                @RequestParam("reportingPeriod") String period,
                                                @RequestParam("reportedValue") Double value,
                                                @RequestParam("description") String description,
                                                @RequestParam(value = "evidence", required = false) MultipartFile evidence) {
        ProjectImpactKpi kpi = kpiRepository.findById(kpiId).orElseThrow();
        
        ImpactReport report = new ImpactReport();
        report.setKpi(kpi);
        report.setReportingPeriod(period);
        report.setReportedValue(value);
        report.setDescription(description);
        if (evidence != null) {
            report.setSupportingEvidence(evidence.getOriginalFilename());
        }
        
        reportRepository.save(report);
        return ResponseEntity.ok(report);
    }
}
