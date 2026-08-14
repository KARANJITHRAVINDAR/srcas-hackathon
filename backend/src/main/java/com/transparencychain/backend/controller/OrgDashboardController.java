package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Funder dashboard summary endpoint.
 * Returns aggregated stats, activity log, and active projects list for the logged-in Funder.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org/dashboard")
@PreAuthorize("hasRole('FUNDER')")
public class OrgDashboardController {

    @Autowired private FunderProfileRepository funderProfileRepository;
    @Autowired private OrgProjectEngagementRepository engagementRepository;
    @Autowired private FundingCommitmentRepository fundingCommitmentRepository;
    @Autowired private EscrowAccountRepository escrowAccountRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private MilestoneRepository milestoneRepository;

    private FunderProfile currentFunder() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException(
                        "FunderProfile not found for user: " + userDetails.getId()));
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getDashboardSummary() {
        FunderProfile funder = currentFunder();
        UUID funderId = funder.getId();

        // 1. Get engagements and group by status
        List<OrgProjectEngagement> engagements = engagementRepository.findByFunderId(funderId);
        long negotiatingCount = engagements.stream().filter(e -> e.getStatus() == OrgProjectEngagement.EngagementStatus.NEGOTIATING).count();
        long committedCount = engagements.stream().filter(e -> e.getStatus() == OrgProjectEngagement.EngagementStatus.COMMITTED).count();
        long activeCount = engagements.stream().filter(e -> e.getStatus() == OrgProjectEngagement.EngagementStatus.ACTIVE).count();
        long completedCount = engagements.stream().filter(e -> e.getStatus() == OrgProjectEngagement.EngagementStatus.COMPLETED).count();

        // 2. Commitments & Escrow calculations
        List<FundingCommitment> commitments = fundingCommitmentRepository.findByFunderId(funderId);
        BigDecimal totalCommitted = BigDecimal.ZERO;
        BigDecimal totalDisbursed = BigDecimal.ZERO;
        long totalExpectedBeneficiaries = 0;

        for (FundingCommitment commitment : commitments) {
            if (commitment.getStatus() == FundingCommitment.FundingCommitmentStatus.ACTIVE 
             || commitment.getStatus() == FundingCommitment.FundingCommitmentStatus.PARTIALLY_RELEASED 
             || commitment.getStatus() == FundingCommitment.FundingCommitmentStatus.FULLY_RELEASED) {
                
                totalCommitted = totalCommitted.add(commitment.getTotalCommittedAmount());
                
                // Get Escrow details
                Optional<EscrowAccount> escrowOpt = escrowAccountRepository.findByProjectId(commitment.getProject().getId());
                if (escrowOpt.isPresent()) {
                    EscrowAccount escrow = escrowOpt.get();
                    if (escrow.getReleasedAmount() != null) {
                        totalDisbursed = totalDisbursed.add(escrow.getReleasedAmount());
                    }
                }
                
                // Expected beneficiaries from project
                if (commitment.getProject().getExpectedBeneficiaries() != null) {
                    totalExpectedBeneficiaries += commitment.getProject().getExpectedBeneficiaries();
                }
            }
        }
        BigDecimal totalEscrow = totalCommitted.subtract(totalDisbursed);

        // 3. Open tickets count
        long openTicketsCount = ticketRepository.countOpenTicketsForFunder(funderId);

        // 4. Recent activity feed
        List<AuditLog> rawLogs = auditLogRepository.findRecentEventsForFunder(funderId, PageRequest.of(0, 10));
        List<Map<String, Object>> activities = rawLogs.stream().map(log -> {
            Map<String, Object> activity = new HashMap<>();
            activity.put("id", log.getId());
            activity.put("projectId", log.getEntityId());
            activity.put("entityType", log.getEntityType());
            activity.put("message", log.getPayload());
            activity.put("timestamp", log.getTimestamp());
            
            // Try to resolve project title
            projectRepository.findById(log.getEntityId()).ifPresent(p -> {
                activity.put("projectTitle", p.getTitle());
            });
            return activity;
        }).collect(Collectors.toList());

        // 5. Active/Committed projects list for the dashboard table
        List<Map<String, Object>> dashboardProjects = engagements.stream()
            .filter(e -> e.getStatus() == OrgProjectEngagement.EngagementStatus.ACTIVE 
                      || e.getStatus() == OrgProjectEngagement.EngagementStatus.COMMITTED
                      || e.getStatus() == OrgProjectEngagement.EngagementStatus.COMPLETED)
            .map(e -> {
                Project p = e.getProject();
                Map<String, Object> pm = new HashMap<>();
                pm.put("id", p.getId());
                pm.put("title", p.getTitle());
                pm.put("sdgGoal", p.getSdgGoal() != null ? p.getSdgGoal().name() : null);
                pm.put("totalBudget", p.getTotalBudget());
                pm.put("status", e.getStatus().name());
                
                if (p.getNgo() != null) {
                    pm.put("ngoName", p.getNgo().getOrgName());
                }
                
                // Budget released so far
                BigDecimal released = BigDecimal.ZERO;
                Optional<EscrowAccount> escrowOpt = escrowAccountRepository.findByProjectId(p.getId());
                if (escrowOpt.isPresent()) {
                    released = escrowOpt.get().getReleasedAmount();
                }
                pm.put("released", released);
                
                // Fetch milestones via repository
                List<Milestone> milestones = milestoneRepository.findByProjectId(p.getId());
                
                // Progress as percentage of milestones verified
                long totalMilestones = milestones.size();
                long verifiedMilestones = milestones.stream()
                    .filter(m -> m.getStatus() == Milestone.MilestoneStatus.VERIFIED).count();
                long progress = totalMilestones > 0 ? (verifiedMilestones * 100 / totalMilestones) : 0;
                pm.put("progress", progress);
                
                // Verification status
                boolean hasPending = milestones.stream()
                    .anyMatch(m -> m.getStatus() == Milestone.MilestoneStatus.EVIDENCE_SUBMITTED 
                                || m.getStatus() == Milestone.MilestoneStatus.IN_REVIEW);
                pm.put("verification", hasPending ? "Pending" : "Verified");
                
                return pm;
            }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("orgName", funder.getOrgName());
        response.put("totalFunding", totalCommitted);
        response.put("released", totalDisbursed);
        response.put("escrow", totalEscrow);
        response.put("negotiatingCount", negotiatingCount);
        response.put("committedCount", committedCount);
        response.put("activeCount", activeCount);
        response.put("completedCount", completedCount);
        response.put("pendingVerificationCount", openTicketsCount);
        response.put("verifiedImpact", totalExpectedBeneficiaries);
        response.put("recentActivity", activities);
        response.put("projects", dashboardProjects);

        return ResponseEntity.ok(response);
    }
}
