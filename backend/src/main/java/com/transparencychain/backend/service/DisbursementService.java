package com.transparencychain.backend.service;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Phase 5 — Disbursement Engine & Escrow Ledger Integration
 *
 * Triggered when a ticket is ACCEPTED for a milestone.
 * 1. Updates EscrowAccount released/locked ledger balances.
 * 2. Updates FundingCommitment status (PARTIALLY_RELEASED -> FULLY_RELEASED).
 * 3. Checks if all milestones are VERIFIED; if so, marks Project and Engagement COMPLETED.
 * 4. Logs audit event for financial disbursement.
 */
@Service
public class DisbursementService {

    @Autowired private EscrowAccountRepository escrowAccountRepository;
    @Autowired private FundingCommitmentRepository fundingCommitmentRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private OrgProjectEngagementRepository engagementRepository;
    @Autowired private AuditLogService auditLogService;

    @Transactional
    public void executeDisbursement(UUID projectId, UUID milestoneId, BigDecimal amount, String txHash) {
        // 1. Update Escrow Account ledger
        escrowAccountRepository.findByProjectId(projectId).ifPresent(escrow -> {
            BigDecimal currentReleased = escrow.getReleasedAmount() != null ? escrow.getReleasedAmount() : BigDecimal.ZERO;
            BigDecimal newReleased = currentReleased.add(amount);
            escrow.setReleasedAmount(newReleased);

            BigDecimal locked = escrow.getLockedAmount() != null ? escrow.getLockedAmount() : BigDecimal.ZERO;
            if (newReleased.compareTo(locked) >= 0) {
                escrow.setStatus(EscrowAccount.EscrowStatus.FULLY_RELEASED);
            } else {
                escrow.setStatus(EscrowAccount.EscrowStatus.PARTIALLY_RELEASED);
            }
            escrowAccountRepository.save(escrow);
        });

        // 2. Update Funding Commitment status
        fundingCommitmentRepository.findByProjectId(projectId).stream()
                .filter(fc -> fc.getStatus() == FundingCommitment.FundingCommitmentStatus.ACTIVE 
                           || fc.getStatus() == FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED)
                .findFirst()
                .ifPresent(commitment -> {
                    boolean allMilestonesVerified = checkAllMilestonesVerified(projectId);
                    if (allMilestonesVerified) {
                        commitment.setStatus(FundingCommitment.FundingCommitmentStatus.FULLY_RELEASED);
                    } else {
                        commitment.setStatus(FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED);
                    }
                    fundingCommitmentRepository.save(commitment);
                });

        // 3. Check for Project and Engagement completion
        if (checkAllMilestonesVerified(projectId)) {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project != null && project.getStatus() != Project.ProjectStatus.COMPLETED) {
                project.setStatus(Project.ProjectStatus.COMPLETED);
                projectRepository.save(project);

                engagementRepository.findByProjectId(projectId).forEach(eng -> {
                    if (eng.getStatus() == OrgProjectEngagement.EngagementStatus.ACTIVE) {
                        eng.setStatus(OrgProjectEngagement.EngagementStatus.COMPLETED);
                        engagementRepository.save(eng);
                    }
                });

                auditLogService.logAction(projectId, "PROJECT_COMPLETED", 
                        "All project milestones verified. Project status updated to COMPLETED.");
            }
        }

        // 4. Audit Log
        auditLogService.logAction(projectId, "DISBURSEMENT_EXECUTED", 
                "Disbursed amount " + amount + " for milestone " + milestoneId + ". TxHash: " + txHash);
    }

    private boolean checkAllMilestonesVerified(UUID projectId) {
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        if (milestones.isEmpty()) return false;
        return milestones.stream().allMatch(m -> m.getStatus() == Milestone.MilestoneStatus.VERIFIED);
    }
}
