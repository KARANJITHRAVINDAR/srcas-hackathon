package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/public")
public class PublicDashboardController {

    @Autowired
    ProjectRepository projectRepository;

    @Autowired
    MilestoneRepository milestoneRepository;

    @Autowired
    ProofSubmissionRepository proofRepository;

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    OrgProjectEngagementRepository engagementRepository;

    @Autowired
    BeneficiaryFormResponseRepository responseRepository;

    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getPublicStats() {
        List<Project> projects = projectRepository.findAll();
        List<Milestone> milestones = milestoneRepository.findAll();
        List<ProofSubmission> proofs = proofRepository.findAll();
        List<BeneficiaryFormResponse> responses = responseRepository.findAll();

        BigDecimal totalBudget = projects.stream()
                .filter(p -> p.getStatus() != Project.ProjectStatus.DRAFT)
                .map(Project::getTotalBudget)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalReleased = milestones.stream()
                .map(Milestone::getReleasedAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long completedProjects = projects.stream()
                .filter(p -> p.getStatus() == Project.ProjectStatus.COMPLETED)
                .count();

        long verifiedMilestones = milestones.stream()
                .filter(m -> m.getStatus() == Milestone.MilestoneStatus.VERIFIED || m.getStatus() == Milestone.MilestoneStatus.ACCEPTED || m.getStatus() == Milestone.MilestoneStatus.DISBURSED)
                .count();

        long totalBeneficiaries = projects.stream()
                .filter(p -> p.getStatus() != Project.ProjectStatus.DRAFT)
                .mapToLong(p -> p.getExpectedBeneficiaries() != null ? p.getExpectedBeneficiaries() : 0)
                .sum();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCommittedBudget", totalBudget);
        stats.put("totalDisbursedAmount", totalReleased);
        stats.put("activeProjectsCount", projects.stream().filter(p -> p.getStatus() != Project.ProjectStatus.DRAFT).count());
        stats.put("completedProjectsCount", completedProjects);
        stats.put("verifiedMilestonesCount", verifiedMilestones);
        stats.put("totalEvidenceUploaded", proofs.size());
        stats.put("beneficiariesImpacted", totalBeneficiaries);
        stats.put("publicSurveyResponses", responses.size());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/blockchain-ledger")
    public ResponseEntity<?> getBlockchainLedger() {
        List<AuditLog> allLogs = auditLogRepository.findAll();
        List<AuditLog> ledgerLogs = allLogs.stream()
                .filter(l -> (l.getEntityType() != null && (l.getEntityType().contains("DISBURSEMENT") ||
                             l.getEntityType().contains("BLOCKCHAIN") ||
                             l.getEntityType().contains("MILESTONE"))) ||
                             (l.getPayload() != null && (l.getPayload().contains("DISBURSEMENT") ||
                             l.getPayload().contains("Ticket") ||
                             l.getPayload().contains("Blockchain"))))
                .sorted(Comparator.comparing(AuditLog::getTimestamp).reversed())
                .limit(50)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ledgerLogs);
    }

    @GetMapping("/projects/{projectId}/proof-gallery")
    public ResponseEntity<?> getProjectProofGallery(@PathVariable UUID projectId) {
        List<ProofSubmission> proofs = proofRepository.findByMilestone_ProjectIdOrderBySubmittedAtDesc(projectId);
        return ResponseEntity.ok(proofs);
    }
}
