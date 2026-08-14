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
import java.util.Comparator;
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

    @Autowired
    private TicketClarificationRepository ticketClarificationRepository;

    @Autowired
    private ImpactGenerationService impactGenerationService;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public Ticket raiseTicket(UUID milestoneId, UUID ngoUserId) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + milestoneId));

        User ngoUser = userRepository.findById(ngoUserId)
                .orElseThrow(() -> new IllegalArgumentException("NGO User not found: " + ngoUserId));

        // Enforce milestone sequence check
        List<Milestone> projectMilestones = milestoneRepository.findByProjectId(milestone.getProject().getId());
        projectMilestones.sort(Comparator.comparingInt(m -> m.getSequenceNumber() != null ? m.getSequenceNumber() : 1));

        int currentSeq = milestone.getSequenceNumber() != null ? milestone.getSequenceNumber() : 1;
        for (Milestone m : projectMilestones) {
            int mSeq = m.getSequenceNumber() != null ? m.getSequenceNumber() : 1;
            if (mSeq < currentSeq) {
                if (m.getStatus() != Milestone.MilestoneStatus.DISBURSED &&
                    m.getStatus() != Milestone.MilestoneStatus.VERIFIED &&
                    m.getStatus() != Milestone.MilestoneStatus.COMPLETED) {
                    throw new IllegalStateException("Cannot raise ticket: Complete previous milestone (Phase " + mSeq + ") first.");
                }
            }
        }

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
            if (analysis.getResult() == EvidenceAnalysisResult.OCR_FAILED) {
                ticket.setRiskScore(BigDecimal.valueOf(100));
                ticket.setRiskLevel(Ticket.RiskLevel.CRITICAL);
            } else {
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
        List<OrgProjectEngagement> engagements = engagementRepository.findAll().stream()
                .filter(e -> e.getFunder() != null && e.getFunder().getUser() != null && e.getFunder().getUser().getId().equals(funderUserId))
                .collect(Collectors.toList());

        List<UUID> projectIds = engagements.stream()
                .map(e -> e.getProject().getId())
                .collect(Collectors.toList());

        List<Ticket> allTickets = ticketRepository.findAll();
        if (projectIds.isEmpty()) {
            return allTickets;
        }

        List<Ticket> filtered = allTickets.stream()
                .filter(t -> projectIds.contains(t.getMilestone().getProject().getId()))
                .collect(Collectors.toList());

        return filtered.isEmpty() ? allTickets : filtered;
    }

    @Transactional(readOnly = true)
    public Ticket getTicketDetail(UUID ticketId, UUID funderUserId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));
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

            // Update current Milestone status to COMPLETED / VERIFIED
            Milestone milestone = ticket.getMilestone();
            milestone.setStatus(Milestone.MilestoneStatus.COMPLETED);
            milestoneRepository.save(milestone);

            // Auto-advance AI Impact metrics to VERIFIED + append Impact Report history
            try {
                impactGenerationService.processVerificationDecision(milestone, ticket.getId().toString());
            } catch (Exception e) {
                System.err.println("Impact verification processing warning: " + e.getMessage());
            }

            auditLogService.logAction(
                    milestone.getProject().getId(),
                    "TICKET_ACCEPTED",
                    "Ticket ACCEPTED for milestone: " + milestone.getTitle() + ". Work verified."
            );

            // Rolling Advance Model: Disburse next milestone (N+1) budget if > 0 and unlock it
            List<Milestone> projectMilestones = milestoneRepository.findByProjectId(milestone.getProject().getId());
            for (Milestone m : projectMilestones) {
                if (m.getTitle() != null) {
                    java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                    if (matcher.find()) {
                        m.setSequenceNumber(Integer.parseInt(matcher.group(1)));
                    }
                }
            }
            projectMilestones.sort((m1, m2) -> {
                int s1 = m1.getSequenceNumber() != null ? m1.getSequenceNumber() : 99;
                int s2 = m2.getSequenceNumber() != null ? m2.getSequenceNumber() : 99;
                return Integer.compare(s1, s2);
            });

            int currentIndex = -1;
            for (int i = 0; i < projectMilestones.size(); i++) {
                if (projectMilestones.get(i).getId().equals(milestone.getId())) {
                    currentIndex = i;
                    break;
                }
            }

            if (currentIndex != -1 && currentIndex + 1 < projectMilestones.size()) {
                Milestone nextMs = projectMilestones.get(currentIndex + 1);
                if (nextMs.getAmountAllocated() != null && nextMs.getAmountAllocated().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    // Disburse advance for next phase
                    String txHash = blockchainService.releaseFunds(
                            milestone.getProject().getId(),
                            nextMs.getId(),
                            nextMs.getAmountAllocated()
                    );
                    disbursementService.executeDisbursement(
                            milestone.getProject().getId(),
                            nextMs.getId(),
                            nextMs.getAmountAllocated(),
                            txHash
                    );
                    nextMs.setReleasedAmount(nextMs.getAmountAllocated());
                    nextMs.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
                    milestoneRepository.save(nextMs);

                    auditLogService.logAction(
                            milestone.getProject().getId(),
                            "ROLLING_ADVANCE_DISBURSED",
                            "Disbursed advance ₹" + nextMs.getAmountAllocated() + " for next milestone '" + nextMs.getTitle() + "'. Unlocked for execution."
                    );
                } else {
                    // Next milestone is ₹0 closure milestone — unlock without disbursement
                    nextMs.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
                    milestoneRepository.save(nextMs);

                    auditLogService.logAction(
                            milestone.getProject().getId(),
                            "CLOSURE_MILESTONE_UNLOCKED",
                            "Project closure milestone '" + nextMs.getTitle() + "' unlocked for final beneficiary feedback and closure video submission."
                    );
                }
            }

            // Send notifications
            if (milestone.getProject().getNgo() != null && milestone.getProject().getNgo().getUser() != null) {
                notificationService.create(
                        Notification.RecipientType.NGO,
                        milestone.getProject().getNgo().getUser(),
                        milestone.getProject(),
                        milestone,
                        Notification.NotificationEventType.FUNDS_RELEASED,
                        "Milestone Verified & Funds Released",
                        "Work on milestone '" + milestone.getTitle() + "' was verified and funds released.",
                        "/ngo/projects/" + milestone.getProject().getId()
                );
            }
            notificationService.notifyProjectFunders(
                    milestone.getProject(),
                    milestone,
                    Notification.NotificationEventType.MILESTONE_COMPLETED,
                    "Milestone Approved & Released",
                    "Milestone '" + milestone.getTitle() + "' was approved and disbursed.",
                    "/funder/verification"
            );

            // Check if all milestones are complete (100%)
            boolean allDone = projectMilestones.stream().allMatch(m -> 
                    m.getStatus() == Milestone.MilestoneStatus.COMPLETED || m.getStatus() == Milestone.MilestoneStatus.VERIFIED);
            if (allDone) {
                if (milestone.getProject().getNgo() != null && milestone.getProject().getNgo().getUser() != null) {
                    notificationService.create(
                            Notification.RecipientType.NGO,
                            milestone.getProject().getNgo().getUser(),
                            milestone.getProject(),
                            null,
                            Notification.NotificationEventType.PROJECT_COMPLETED,
                            "Project 100% Completed! 🎉",
                            "All milestones for '" + milestone.getProject().getTitle() + "' have been completed and verified.",
                            "/ngo/projects/" + milestone.getProject().getId()
                    );
                }
                notificationService.notifyProjectFunders(
                        milestone.getProject(),
                        null,
                        Notification.NotificationEventType.PROJECT_COMPLETED,
                        "Project 100% Completed! 🎉",
                        "All milestones for '" + milestone.getProject().getTitle() + "' have been completed and verified.",
                        "/funder/projects"
                );
            }

        } else if (reviewDecision == TicketReview.TicketReviewDecision.REQUEST_CLARIFICATION) {
            if (comment == null || comment.trim().isEmpty()) {
                throw new IllegalArgumentException("Clarification query cannot be empty. Please specify what needs to be clarified.");
            }

            ticket.setStatus(Ticket.TicketStatus.CLARIFICATION_REQUESTED);
            ticketRepository.save(ticket);

            // Record clarification round
            TicketClarification clarification = new TicketClarification();
            clarification.setTicket(ticket);
            clarification.setFunderUser(reviewer);
            clarification.setFunderQuery(comment.trim());
            clarification.setStatus(TicketClarification.ClarificationStatus.PENDING_RESPONSE);
            ticketClarificationRepository.save(clarification);

            // Revert Milestone to IN_PROGRESS so NGO can submit proof again
            Milestone milestone = ticket.getMilestone();
            milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
            milestoneRepository.save(milestone);

            auditLogService.logAction(
                    milestone.getProject().getId(),
                    "TICKET_CLARIFICATION",
                    "Ticket clarification requested: " + comment.trim()
            );

            // Notify NGO
            if (milestone.getProject().getNgo() != null && milestone.getProject().getNgo().getUser() != null) {
                notificationService.create(
                        Notification.RecipientType.NGO,
                        milestone.getProject().getNgo().getUser(),
                        milestone.getProject(),
                        milestone,
                        Notification.NotificationEventType.CLARIFICATION_REQUESTED,
                        "Clarification Requested on " + milestone.getTitle(),
                        "Funder requested clarification: \"" + comment.trim() + "\"",
                        "/ngo/projects/" + milestone.getProject().getId() + "?tab=MILESTONES&milestoneId=" + milestone.getId()
                );
            }

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

    @Transactional(readOnly = true)
    public List<TicketClarification> getClarificationsForTicket(UUID ticketId) {
        return ticketClarificationRepository.findByTicketIdOrderByQueryCreatedAtAsc(ticketId);
    }

    @Transactional(readOnly = true)
    public List<TicketClarification> getClarificationsForMilestone(UUID milestoneId) {
        return ticketClarificationRepository.findByTicket_Milestone_IdOrderByQueryCreatedAtDesc(milestoneId);
    }

    @Transactional
    public Ticket submitClarificationResponse(UUID milestoneId, UUID ngoUserId, String answer, ProofSubmission newProof) {
        List<Ticket> tickets = ticketRepository.findByMilestoneId(milestoneId);
        if (tickets.isEmpty()) {
            throw new IllegalArgumentException("No ticket found for milestone: " + milestoneId);
        }

        Ticket ticket = tickets.get(0);

        // Find pending clarification or create one
        Optional<TicketClarification> pendingOpt = ticketClarificationRepository
                .findFirstByTicketIdAndStatusOrderByQueryCreatedAtDesc(ticket.getId(), TicketClarification.ClarificationStatus.PENDING_RESPONSE);

        if (pendingOpt.isPresent()) {
            TicketClarification clarification = pendingOpt.get();
            clarification.setNgoAnswer(answer != null ? answer.trim() : "");
            clarification.setNgoEvidence(newProof);
            clarification.setAnsweredAt(LocalDateTime.now());
            clarification.setStatus(TicketClarification.ClarificationStatus.ANSWERED);
            ticketClarificationRepository.save(clarification);
        }

        // Point ticket to the new evidence and transition back to OPEN
        ticket.setEvidence(newProof);
        ticket.setStatus(Ticket.TicketStatus.OPEN);
        ticketRepository.save(ticket);

        // Transition milestone back to AWAITING_FUNDER_APPROVAL
        Milestone milestone = ticket.getMilestone();
        milestone.setStatus(Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL);
        milestoneRepository.save(milestone);

        auditLogService.logAction(
                milestone.getProject().getId(),
                "CLARIFICATION_RESPONDED",
                "NGO responded to clarification request with new evidence and explanation: " + (answer != null ? answer : "")
        );

        // Notify Funders
        notificationService.notifyProjectFunders(
                milestone.getProject(),
                milestone,
                Notification.NotificationEventType.CLARIFICATION_RESPONDED,
                "Clarification Response Received",
                "NGO responded to clarification for '" + milestone.getTitle() + "' with updated evidence.",
                "/funder/verification?milestoneId=" + milestone.getId()
        );

        return ticket;
    }
}
