package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.ChangeRequestDto;
import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.NgoChangeRequestResponseBody;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.repository.NgoProfileRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.MilestoneNegotiationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * NGO counterpart endpoints for the change-request loop (Phase 2).
 *
 * Per the spec (§5): these are the NGO-side endpoints needed to close the loop;
 * they are part of this module's build responsibility.
 *
 * Endpoints:
 *   GET    /api/ngo/change-requests?status=PENDING   — NGO's inbox of pending CRs
 *   POST   /api/ngo/change-requests/{id}/respond     — ACCEPT | COUNTER | REJECT
 *
 * All require NGO role.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ngo")
@PreAuthorize("hasRole('NGO')")
public class NgoNegotiationController {

    @Autowired private MilestoneNegotiationService negotiationService;
    @Autowired private NgoProfileRepository ngoProfileRepository;

    private UUID currentNgoUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    // -------------------------------------------------------------------------
    // GET /api/ngo/change-requests?status=PENDING
    //
    // Returns all PENDING change requests on this NGO's projects.
    // The NGO sees the inline diff (original vs proposed) so they can review
    // and decide without needing to navigate away.
    // -------------------------------------------------------------------------
    @GetMapping("/change-requests")
    public ResponseEntity<List<ChangeRequestDto>> getPendingChangeRequests(
            @RequestParam(required = false, defaultValue = "PENDING") String status) {

        // Currently only PENDING is supported; the param is here for API forward-compatibility
        List<ChangeRequestDto> list = negotiationService.getPendingChangeRequestsForNgo(currentNgoUserId());
        return ResponseEntity.ok(list);
    }

    // -------------------------------------------------------------------------
    // POST /api/ngo/change-requests/{id}/respond
    //
    // NGO responds to a PENDING change request.
    //   ACCEPT  → milestone locked at the proposed values, CR closed
    //   COUNTER → new CR created with NGO's counter-values, ball back to org
    //   REJECT  → proposed version rejected, milestone reverts to PENDING
    // -------------------------------------------------------------------------
    @PostMapping("/change-requests/{id}/respond")
    public ResponseEntity<?> respondToChangeRequest(
            @PathVariable UUID id,
            @RequestBody NgoChangeRequestResponseBody body) {

        try {
            ChangeRequestDto dto = negotiationService.ngoRespondToChangeRequest(
                    id, currentNgoUserId(), body);
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
}
