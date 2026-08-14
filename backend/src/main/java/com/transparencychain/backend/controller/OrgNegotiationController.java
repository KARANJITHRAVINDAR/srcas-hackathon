package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.ChangeRequestBody;
import com.transparencychain.backend.dto.ChangeRequestDto;
import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.OrgChangeRequestResponseBody;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.MilestoneNegotiationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Organisation/Funder module — Phase 2: Milestone Negotiation (org side)
 *
 * Endpoints:
 *   POST   /api/org/projects/{id}/milestones/{milestoneId}/change-request
 *   GET    /api/org/change-requests/{id}
 *   POST   /api/org/change-requests/{id}/withdraw
 *
 * All require FUNDER role.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org")
@PreAuthorize("hasRole('FUNDER')")
public class OrgNegotiationController {

    @Autowired private MilestoneNegotiationService negotiationService;
    @Autowired private FunderProfileRepository funderProfileRepository;

    private FunderProfile currentFunder() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException(
                        "FunderProfile not found for user: " + userDetails.getId()));
    }

    // -------------------------------------------------------------------------
    // POST /api/org/projects/{id}/milestones/{milestoneId}/change-request
    //
    // Org proposes changes to a specific milestone (scope, cost, sequence, dueDate).
    // None of these fields are written directly to the milestone — they become
    // a MilestoneVersion + MilestoneChangeRequest awaiting NGO review.
    // -------------------------------------------------------------------------
    @PostMapping("/projects/{projectId}/milestones/{milestoneId}/change-request")
    public ResponseEntity<?> raiseChangeRequest(
            @PathVariable UUID projectId,
            @PathVariable UUID milestoneId,
            @RequestBody ChangeRequestBody body) {

        UUID funderId = currentFunder().getId();
        try {
            ChangeRequestDto dto = negotiationService.raiseChangeRequest(
                    projectId, milestoneId, funderId, body);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/change-requests/{id}
    //
    // Full change-request view with inline diff (original vs proposed).
    // -------------------------------------------------------------------------
    @GetMapping("/change-requests/{id}")
    public ResponseEntity<?> getChangeRequest(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(negotiationService.getChangeRequest(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/change-requests/{id}/withdraw
    //
    // Org withdraws a PENDING change request before the NGO responds.
    // Milestone reverts to PENDING.
    // -------------------------------------------------------------------------
    @PostMapping("/change-requests/{id}/withdraw")
    public ResponseEntity<?> withdrawChangeRequest(@PathVariable UUID id) {
        UUID funderId = currentFunder().getId();
        try {
            ChangeRequestDto dto = negotiationService.withdrawChangeRequest(id, funderId);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/change-requests/{id}/respond
    //
    // Org responds to a PENDING change request (NGO-initiated).
    //   ACCEPT  → milestone locked at proposed values, CR closed
    //   COUNTER → new CR created with Funder's counter-values, ball back to NGO
    //   REJECT  → proposed version rejected, milestone reverts to PENDING/MODIFIED
    // -------------------------------------------------------------------------
    @PostMapping("/change-requests/{id}/respond")
    public ResponseEntity<?> respondToChangeRequest(
            @PathVariable UUID id,
            @RequestBody OrgChangeRequestResponseBody body) {

        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            ChangeRequestDto dto = negotiationService.funderRespondToChangeRequest(
                    id, userDetails.getId(), body);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/milestones/{milestoneId}/change-requests")
    public ResponseEntity<?> getChangeRequestsForMilestone(@PathVariable UUID milestoneId) {
        return ResponseEntity.ok(negotiationService.getChangeRequestsForMilestone(milestoneId));
    }

    @PostMapping("/projects/{projectId}/milestones/{milestoneId}/accept-lock")
    public ResponseEntity<?> acceptAndLockMilestone(
            @PathVariable UUID projectId,
            @PathVariable UUID milestoneId) {

        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            negotiationService.acceptAndLockMilestone(projectId, milestoneId, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Milestone accepted and locked successfully. Fund release triggered."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/projects/{projectId}/milestones/accept-lock-all")
    public ResponseEntity<?> acceptAndLockAllMilestones(@PathVariable UUID projectId) {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            negotiationService.acceptAndLockAllMilestones(projectId, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("All milestones accepted and locked successfully. Project is now ACTIVE and NGO can start work."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/projects/{projectId}/decline")
    public ResponseEntity<?> declineNegotiation(@PathVariable UUID projectId) {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            negotiationService.declineNegotiation(projectId, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Negotiation declined and engagement withdrawn. Project remains available to other funders."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}

