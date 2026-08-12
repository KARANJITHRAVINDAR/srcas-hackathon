package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.Ticket;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ngo")
@PreAuthorize("hasRole('NGO')")
public class NgoTicketController {

    @Autowired
    private TicketService ticketService;

    private UUID getCallingUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    // -------------------------------------------------------------------------
    // POST /api/ngo/milestones/{milestoneId}/tickets
    // NGO raises a fund release ticket for a milestone where proof was submitted.
    // -------------------------------------------------------------------------
    @PostMapping("/milestones/{milestoneId}/tickets")
    public ResponseEntity<?> raiseTicket(@PathVariable UUID milestoneId) {
        UUID ngoUserId = getCallingUserId();
        try {
            Ticket ticket = ticketService.raiseTicket(milestoneId, ngoUserId);
            return ResponseEntity.ok(ticket);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
