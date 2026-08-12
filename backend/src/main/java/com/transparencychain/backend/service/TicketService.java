package com.transparencychain.backend.service;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketReviewRepository ticketReviewRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private ProofSubmissionRepository proofSubmissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrgProjectEngagementRepository engagementRepository;

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private DisbursementService disbursementService;

    @Transactional
    public Ticket raiseTicket(UUID milestoneId, UUID ngoUserId) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + milestoneId));

        User ngoUser = userRepository.findById(ngoUserId)
                .orElseThrow(() -> new IllegalArgumentException("NGO User not found: " + ngoUserId));

        // Get the latest proof submission for this milestone
        List<ProofSubmission> proofs = proofSubmissionRepository.findByMilestoneId(milestoneId);
        if (proofs.isEmpty()) {
            throw new IllegalStateException("No proof submitted for this milestone. Evidence must be uploaded first.");
        }
        ProofSubmission latestProof = proofs.get(proofs.size() - 1);

        // Enforce state transition guard
        if (milestone.getStatus() != Milestone.MilestoneStatus.IN_REVIEW &&
            milestone.getStatus() != Milestone.MilestoneStatus.EVIDENCE_SUBMITTED &&
            milestone.getStatus() != Milestone.MilestoneStatus.REJECTED &&
            milestone.getStatus() != Milestone.MilestoneStatus.PENDING &&
            milestone.getStatus() != Milestone.MilestoneStatus.IN_PROGRESS &&
            milestone.getStatus() != Milestone.MilestoneStatus.LOCKED &&
            milestone.getStatus() != Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL &&
            milestone.getStatus() != Milestone.MilestoneStatus.READY_FOR_APPROVAL) {
            throw new IllegalStateException("Milestone is not in an evidence-submitted state. Current status: " + milestone.getStatus());
        }

        // Create the Ticket
        Ticket ticket = new Ticket();
        ticket.setMilestone(milestone);
        ticket.setRaisedByNgo(ngoUser);
        ticket.setEvidence(latestProof);
        ticket.setStatus(Ticket.TicketStatus.OPEN);

        // Pull risk metrics if AI check completed
        EvidenceAnalysis analysis = latestProof.getEvidenceAnalysis();
        if (analysis != null) {
            ticket.setRiskScore(BigDecimal.valueOf(analysis.getFraudScore() != null ? analysis.getFraudScore() : 0));
            int fraud = analysis.getFraudScore() != null ? analysis.getFraudScore() : 0;
            if (fraud <= 30) {
                ticket.setRiskLevel(Ticket.RiskLevel.LOW);
            } else if (fraud <= 60) {
                ticket.setRiskLevel(Ticket.RiskLevel.MEDIUM);
            } else if (fraud <= 80) {
                ticket.setRiskLevel(Ticket.RiskLevel.HIGH);
            } else {
                ticket.setRiskLevel(Ticket.RiskLevel.CRITICAL);
            }
        } else {
            ticket.setRiskScore(BigDecimal.ZERO);
            ticket.setRiskLevel(Ticket.RiskLevel.LOW);
        }

        ticket = ticketRepository.save(ticket);

        // Update Milestone Status
        milestone.setStatus(Milestone.MilestoneStatus.TICKET_RAISED);
        milestoneRepository.save(milestone);

        // Log to Audit Log
        auditLogService.logAction(
                milestone.getProject().getId(),
                "TICKET_RAISED",
                "Ticket raised for milestone: " + milestone.getTitle() + " with risk level: " + ticket.getRiskLevel()
        );

        return ticket;
    }

    @Transactional(readOnly = true)
    public List<Ticket> getTicketsForFunder(UUID funderUserId) {
        // Find all projects the funder has engaged in
        List<OrgProjectEngagement> engagements = engagementRepository.findAll().stream()
                .filter(e -> e.getFunder() != null && e.getFunder().getUser().getId().equals(funderUserId))
                .collect(Collectors.toList());

        List<UUID> projectIds = engagements.stream()
                .map(e -> e.getProject().getId())
                .collect(Collectors.toList());

        // Get all tickets for these projects
        return ticketRepository.findAll().stream()
                .filter(t -> projectIds.contains(t.getMilestone().getProject().getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Ticket getTicketDetail(UUID ticketId, UUID funderUserId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));

        // Security check: ensure funder is engaged with this ticket's project
        boolean isEngaged = engagementRepository.findAll().stream()
                .anyMatch(e -> e.getFunder() != null &&
                        e.getFunder().getUser().getId().equals(funderUserId) &&
                        e.getProject().getId().equals(ticket.getMilestone().getProject().getId()));

        if (!isEngaged) {
            throw new SecurityException("Unauthorized access to ticket: Funder has no active engagement with this project.");
        }

        return ticket;
    }

    @Transactional(readOnly = true)
    public List<TicketReview> getTicketReviews(UUID ticketId) {
        return ticketReviewRepository.findByTicketIdOrderByReviewedAtAsc(ticketId);
    }

    @Transactional
    public Ticket submitReviewDecision(UUID ticketId, UUID reviewerUserId, Ticket.TicketStatus decisionStatus, String comment) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new IllegalArgumentException("Reviewer user not found: " + reviewerUserId));

        // Create the Ticket Review
        TicketReview review = new TicketReview();
        review.setTicket(ticket);
        review.setReviewedByOrgUser(reviewer);
        
        TicketReview.TicketReviewDecision reviewDecision;
        if (decisionStatus == Ticket.TicketStatus.ACCEPTED) {
            reviewDecision = TicketReview.TicketReviewDecision.ACCEPT;
        } else if (decisionStatus == Ticket.TicketStatus.CLARIFICATION_REQUESTED) {
            reviewDecision = TicketReview.TicketReviewDecision.REQUEST_CLARIFICATION;
        } else {
            reviewDecision = TicketReview.TicketReviewDecision.REJECT;
        }
        review.setDecision(reviewDecision);
        review.setComment(comment);
        ticketReviewRepository.save(review);

        // Fetch existing reviews to evaluate multi-reviewer rules
        List<TicketReview> existingReviews = ticketReviewRepository.findByTicketIdOrderByReviewedAtAsc(ticketId);

        if (reviewDecision == TicketReview.TicketReviewDecision.ACCEPT) {
            // Apply high/critical risk multi-reviewer rules
            if (ticket.getRiskLevel() == Ticket.RiskLevel.HIGH || ticket.getRiskLevel() == Ticket.RiskLevel.CRITICAL) {
                boolean isAuditorApproved = existingReviews.stream()
                        .anyMatch(r -> r.getReviewedByOrgUser().getRole() == Role.AUDITOR && r.getDecision() == TicketReview.TicketReviewDecision.ACCEPT);
                
                long funderAcceptCount = existingReviews.stream()
                        .filter(r -> r.getReviewedByOrgUser().getRole() == Role.FUNDER && r.getDecision() == TicketReview.TicketReviewDecision.ACCEPT)
                        .map(r -> r.getReviewedByOrgUser().getId())
                        .distinct()
                        .count();

                if (!isAuditorApproved && funderAcceptCount < 2) {
                    // Mark as UNDER_ORG_REVIEW, but do NOT disburse funds yet
                    ticket.setStatus(Ticket.TicketStatus.UNDER_ORG_REVIEW);
                    ticketRepository.save(ticket);
                    
                    auditLogService.logAction(
                            ticket.getMilestone().getProject().getId(),
                            "TICKET_REVIEWED",
                            "Ticket ACCEPTED by reviewer: " + reviewer.getFullName() + ". Awaiting secondary reviewer or auditor sign-off due to HIGH/CRITICAL risk."
                    );
                    return ticket;
                }
            }

            // If we get here, ticket is fully accepted and disbursed!
            ticket.setStatus(Ticket.TicketStatus.ACCEPTED);
            ticket.setResolvedAt(LocalDateTime.now());
            ticketRepository.save(ticket);

            // Update Milestone status to VERIFIED (releases escrow funds)
            Milestone milestone = ticket.getMilestone();
            milestone.setStatus(Milestone.MilestoneStatus.VERIFIED);
            milestoneRepository.save(milestone);

            // Execute simulated smart contract release on blockchain!
            String txHash = blockchainService.releaseFunds(
                    milestone.getProject().getId(),
                    milestone.getId(),
                    milestone.getAmountAllocated()
            );

            auditLogService.logAction(
                    milestone.getProject().getId(),
                    "TICKET_ACCEPTED",
                    "Ticket ACCEPTED. Funds released. Blockchain tx: " + txHash
            );

            // Phase 5: Trigger Disbursement Engine & Escrow Ledger updates
            disbursementService.executeDisbursement(
                    milestone.getProject().getId(),
                    milestone.getId(),
                    milestone.getAmountAllocated(),
                    txHash
            );

        } else if (reviewDecision == TicketReview.TicketReviewDecision.REQUEST_CLARIFICATION) {
            ticket.setStatus(Ticket.TicketStatus.CLARIFICATION_REQUESTED);
            ticketRepository.save(ticket);

            // Revert Milestone to IN_PROGRESS so NGO can submit proof again
            Milestone milestone = ticket.getMilestone();
            milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
            milestoneRepository.save(milestone);

            auditLogService.logAction(
                    milestone.getProject().getId(),
                    "TICKET_CLARIFICATION",
                    "Ticket clarification requested. Reverted milestone to IN_PROGRESS."
            );

        } else if (reviewDecision == TicketReview.TicketReviewDecision.REJECT) {
            ticket.setStatus(Ticket.TicketStatus.REJECTED);
            ticket.setResolvedAt(LocalDateTime.now());
            ticketRepository.save(ticket);

            // Mark Milestone as REJECTED
            Milestone milestone = ticket.getMilestone();
            milestone.setStatus(Milestone.MilestoneStatus.REJECTED);
            milestoneRepository.save(milestone);

            auditLogService.logAction(
                    milestone.getProject().getId(),
                    "TICKET_REJECTED",
                    "Ticket REJECTED by Funder."
            );
        }

        return ticket;
    }
}
