package com.transparencychain.backend.service;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
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
    @Autowired private FundTransactionRepository fundTransactionRepository;
    @Autowired private AuditLogService auditLogService;

    @Transactional
    public void executeDisbursement(UUID projectId, UUID milestoneId, BigDecimal amount, String txHash) {
        Project project = projectRepository.findById(projectId).orElse(null);
        Milestone milestone = milestoneRepository.findById(milestoneId).orElse(null);

        // 1. Update Milestone Status to DISBURSED, update releasedAmount & unlock next sequential milestone
        if (milestone != null) {
            milestone.setStatus(Milestone.MilestoneStatus.DISBURSED);
            milestone.setFundsTransferred(true);
            milestone.setFundsTransferredAt(java.time.LocalDateTime.now());
            if (txHash != null && !txHash.isBlank()) {
                milestone.setDisbursementTxHash(txHash);
            }
            BigDecimal prevReleased = milestone.getReleasedAmount() != null ? milestone.getReleasedAmount() : BigDecimal.ZERO;
            milestone.setReleasedAmount(prevReleased.add(amount));
            milestoneRepository.save(milestone);

            // Unlock next sequential milestone
            List<Milestone> allProjectMilestones = milestoneRepository.findByProjectId(projectId);
            allProjectMilestones.sort((m1, m2) -> {
                if (m1.getSequenceNumber() != null && m2.getSequenceNumber() != null) {
                    return Integer.compare(m1.getSequenceNumber(), m2.getSequenceNumber());
                }
                if (m1.getSequenceNumber() != null) return -1;
                if (m2.getSequenceNumber() != null) return 1;
                return m1.getTitle().compareTo(m2.getTitle());
            });

            int currentIndex = -1;
            for (int i = 0; i < allProjectMilestones.size(); i++) {
                if (allProjectMilestones.get(i).getId().equals(milestone.getId())) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex != -1 && currentIndex + 1 < allProjectMilestones.size()) {
                Milestone nextMilestone = allProjectMilestones.get(currentIndex + 1);
                if (nextMilestone.getStatus() == Milestone.MilestoneStatus.LOCKED || nextMilestone.getStatus() == Milestone.MilestoneStatus.PENDING) {
                    nextMilestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
                    milestoneRepository.save(nextMilestone);
                    auditLogService.logAction(projectId, "MILESTONE_UNLOCKED", 
                        "Milestone '" + nextMilestone.getTitle() + "' automatically unlocked following milestone '" + milestone.getTitle() + "' disbursement.");
                }
            }
        }

        // 2. Update Escrow Account ledger per-milestone
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

            // Escrow alignment check on final milestone
            if (checkAllMilestonesVerified(projectId)) {
                BigDecimal remainingBalance = escrow.getBalanceAmount();
                if (remainingBalance.compareTo(BigDecimal.ZERO) != 0) {
                    auditLogService.logAction(projectId, "ESCROW_BALANCE_MISMATCH", 
                        "Escrow balance mismatch on final milestone completion: remaining balance is ₹" + remainingBalance + " (Total Locked: ₹" + escrow.getLockedAmount() + ", Disbursed: ₹" + escrow.getReleasedAmount() + ").");
                }
            }
        });

        // 3. Create FundTransaction record for audit scoping
        if (project != null) {
            FundTransaction transaction = new FundTransaction();
            transaction.setProject(project);
            transaction.setMilestone(milestone);
            transaction.setType(FundTransaction.TransactionType.MILESTONE_RELEASE);
            transaction.setAmount(amount);
            transaction.setStatus(FundTransaction.TransactionStatus.RELEASED);
            transaction.setReference(txHash);
            fundTransactionRepository.save(transaction);
        }

        // 4. Update Funding Commitment status
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

        // 5. Check for Project and Engagement completion
        if (checkAllMilestonesVerified(projectId)) {
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
                        "All project milestones verified and disbursed. Project status updated to COMPLETED.");
            }
        }

        // 6. Audit Log
        auditLogService.logAction(projectId, "DISBURSEMENT_EXECUTED", 
                "Disbursed amount ₹" + amount + " for milestone " + milestoneId + ". TxHash: " + txHash);
    }

    private boolean checkAllMilestonesVerified(UUID projectId) {
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        if (milestones.isEmpty()) return false;
        return milestones.stream().allMatch(m -> 
            m.getStatus() == Milestone.MilestoneStatus.VERIFIED || 
            m.getStatus() == Milestone.MilestoneStatus.DISBURSED || 
            m.getStatus() == Milestone.MilestoneStatus.COMPLETED
        );
    }
}
