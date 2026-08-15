package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.AuditReport;
import com.transparencychain.backend.repository.AuditReportRepository;
import com.transparencychain.backend.service.AuditReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AuditReportController {

    private static final Logger log = LoggerFactory.getLogger(AuditReportController.class);

    @Autowired
    private AuditReportService auditReportService;

    @Autowired
    private AuditReportRepository auditReportRepository;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @PostMapping("/projects/{projectId}/audit-report/generate")
    public ResponseEntity<?> generateAuditReport(
            @PathVariable UUID projectId,
            @RequestParam(required = false) UUID userId
    ) {
        try {
            UUID generatedBy = userId != null ? userId : UUID.fromString("00000000-0000-0000-0000-000000000001");
            AuditReport report = auditReportService.generateAuditReport(projectId, generatedBy);
            return ResponseEntity.ok(report);
        } catch (IllegalStateException e) {
            log.warn("[AUDIT-REPORT] Generation gated: {}", e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err);
        } catch (Exception e) {
            log.error("[AUDIT-REPORT] Generation error for project={}: {}", projectId, e.getMessage(), e);
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @GetMapping("/projects/{projectId}/audit-report/latest")
    public ResponseEntity<?> getLatestReport(@PathVariable UUID projectId) {
        Optional<AuditReport> reportOpt = auditReportRepository.findTopByProjectIdOrderByReportVersionDesc(projectId);
        if (reportOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No audit report found for project"));
        }
        return ResponseEntity.ok(reportOpt.get());
    }

    @GetMapping("/projects/{projectId}/audit-report/history")
    public ResponseEntity<?> getReportHistory(@PathVariable UUID projectId) {
        List<AuditReport> history = auditReportRepository.findByProjectIdOrderByReportVersionDesc(projectId);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/audit-reports/{reportId}/download")
    public ResponseEntity<?> downloadReport(@PathVariable UUID reportId) {
        Optional<AuditReport> reportOpt = auditReportRepository.findById(reportId);
        if (reportOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Report not found");
        }

        AuditReport report = reportOpt.get();
        if (report.getOnchainVerificationStatus() == AuditReport.OnChainVerificationStatus.MISMATCH_FOUND) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Download blocked: Live on-chain verification detected a discrepancy (MISMATCH_FOUND).");
        }

        String relPath = report.getReportFileUrl();
        File file = new File(uploadDir, relPath.replace("/uploads/", ""));
        if (!file.exists()) {
            // Try direct path fallback
            file = new File(relPath);
        }

        if (!file.exists()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Report PDF file missing from disk");
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    @GetMapping("/audit-reports/{reportId}/verify")
    public ResponseEntity<?> verifyReport(@PathVariable UUID reportId) {
        Optional<AuditReport> reportOpt = auditReportRepository.findById(reportId);
        if (reportOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Report not found"));
        }

        AuditReport report = reportOpt.get();
        AuditReportService.LiveVerificationResult liveCheck = auditReportService.verifyLiveOnChainState(report.getProjectId());

        Map<String, Object> response = new HashMap<>();
        response.put("reportId", report.getId());
        response.put("reportVersion", report.getReportVersion());
        response.put("storedHash", report.getReportContentHash());
        response.put("signature", report.getSignature());
        response.put("signerWalletAddress", report.getSignerWalletAddress());
        response.put("storedStatus", report.getOnchainVerificationStatus());
        response.put("liveStatus", liveCheck.status);
        response.put("recordsExamined", liveCheck.recordsExamined);
        response.put("mismatches", liveCheck.mismatches);
        response.put("isAuthentic", liveCheck.status == AuditReport.OnChainVerificationStatus.ALL_VERIFIED);

        return ResponseEntity.ok(response);
    }
}
