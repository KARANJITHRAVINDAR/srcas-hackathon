package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.Ticket;
import com.transparencychain.backend.model.TicketReview;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org")
@PreAuthorize("hasAnyRole('FUNDER', 'AUDITOR')")
public class OrgTicketController {

    @Autowired
    private TicketService ticketService;

    private UUID getCallingUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    // -------------------------------------------------------------------------
    // GET /api/org/tickets?status=OPEN
    // -------------------------------------------------------------------------
    @GetMapping("/tickets")
    public ResponseEntity<?> getTickets(@RequestParam(required = false) String status) {
        UUID userId = getCallingUserId();
        List<Ticket> list = ticketService.getTicketsForFunder(userId);
        
        if (status != null && !status.isEmpty()) {
            list = list.stream()
                    .filter(t -> t.getStatus().name().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }
        
        return ResponseEntity.ok(list);
    }

    // -------------------------------------------------------------------------
    // GET /api/org/tickets/{id}
    // -------------------------------------------------------------------------
    @GetMapping("/tickets/{id}")
    public ResponseEntity<?> getTicketDetail(@PathVariable UUID id) {
        UUID userId = getCallingUserId();
        try {
            Ticket ticket = ticketService.getTicketDetail(id, userId);
            List<TicketReview> reviews = ticketService.getTicketReviews(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("ticket", ticket);
            response.put("reviews", reviews);
            if (ticket.getEvidence() != null && ticket.getEvidence().getEvidenceAnalysis() != null) {
                response.put("analysis", ticket.getEvidence().getEvidenceAnalysis());
            }
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/tickets/{id}/decision
    // -------------------------------------------------------------------------
    @PostMapping("/tickets/{id}/decision")
    public ResponseEntity<?> submitDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID userId = getCallingUserId();
        
        String decisionStr = body.get("decision");
        String comment = body.get("comment");

        if (decisionStr == null || decisionStr.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Decision is required."));
        }

        Ticket.TicketStatus decisionStatus;
        try {
            if ("ACCEPT".equalsIgnoreCase(decisionStr)) {
                decisionStatus = Ticket.TicketStatus.ACCEPTED;
            } else if ("REQUEST_CLARIFICATION".equalsIgnoreCase(decisionStr)) {
                decisionStatus = Ticket.TicketStatus.CLARIFICATION_REQUESTED;
            } else if ("REJECT".equalsIgnoreCase(decisionStr)) {
                decisionStatus = Ticket.TicketStatus.REJECTED;
            } else {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid decision value. Must be ACCEPT, REQUEST_CLARIFICATION, or REJECT."));
        }

        try {
            Ticket ticket = ticketService.submitReviewDecision(id, userId, decisionStatus, comment);
            return ResponseEntity.ok(ticket);
        } catch (IllegalArgumentException | IllegalStateException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
