package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.CommitRequest;
import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.FundingCommitment;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.FundingCommitmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Organisation/Funder module — Phase 3: Funding Commitment & Simulated Escrow
 *
 * Base path: /api/org
 *
 * All endpoints require FUNDER role.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org")
@PreAuthorize("hasRole('FUNDER')")
public class OrgCommitmentController {

    @Autowired
    private FundingCommitmentService fundingCommitmentService;

    private UUID getCallingUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

    // -------------------------------------------------------------------------
    // POST /api/org/projects/{id}/commit
    // Funder proposes a funding commitment (with budget conservation rules and milestone LOCKED checks).
    // -------------------------------------------------------------------------
    @PostMapping("/projects/{id}/commit")
    public ResponseEntity<?> createCommitment(
            @PathVariable UUID id,
            @RequestBody CommitRequest request) {
        UUID userId = getCallingUserId();
        try {
            FundingCommitment commitment = fundingCommitmentService.createCommitment(id, userId, request);
            return ResponseEntity.ok(commitment);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/commitments/{id}/activate
    // Activates a PENDING commitment, locking funds in the simulated escrow and starting milestones.
    // -------------------------------------------------------------------------
    @PostMapping("/commitments/{id}/activate")
    public ResponseEntity<?> activateCommitment(@PathVariable UUID id) {
        UUID userId = getCallingUserId();
        try {
            FundingCommitment commitment = fundingCommitmentService.activateCommitment(id, userId);
            return ResponseEntity.ok(commitment);
        } catch (IllegalArgumentException | IllegalStateException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/commitments/{id}/cancel
    // Cancels a PENDING commitment, returning project engagement to NEGOTIATING.
    // -------------------------------------------------------------------------
    @PostMapping("/commitments/{id}/cancel")
    public ResponseEntity<?> cancelCommitment(@PathVariable UUID id) {
        UUID userId = getCallingUserId();
        try {
            FundingCommitment commitment = fundingCommitmentService.cancelCommitment(id, userId);
            return ResponseEntity.ok(commitment);
        } catch (IllegalArgumentException | IllegalStateException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/commitments/{id}
    // Retrieves a specific funding commitment detail.
    // -------------------------------------------------------------------------
    @GetMapping("/commitments/{id}")
    public ResponseEntity<?> getCommitment(@PathVariable UUID id) {
        UUID userId = getCallingUserId();
        try {
            FundingCommitment commitment = fundingCommitmentService.getCommitment(id, userId);
            return ResponseEntity.ok(commitment);
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/projects/{projectId}/commitment
    // Retrieves the latest commitment for a project by the calling funder.
    // -------------------------------------------------------------------------
    @GetMapping("/projects/{projectId}/commitment")
    public ResponseEntity<?> getCommitmentByProject(@PathVariable UUID projectId) {
        UUID userId = getCallingUserId();
        try {
            return fundingCommitmentService.getCommitmentByProject(projectId, userId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/projects/{projectId}/escrow
    // Retrieves simulated escrow ledger balance and status for a project.
    // -------------------------------------------------------------------------
    @GetMapping("/projects/{projectId}/escrow")
    public ResponseEntity<?> getEscrowByProject(@PathVariable UUID projectId) {
        try {
            return ResponseEntity.ok(fundingCommitmentService.getEscrowByProject(projectId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/commitments
    // Retrieves all funding commitments for the current funder.
    // -------------------------------------------------------------------------
    @GetMapping("/commitments")
    public ResponseEntity<?> getAllCommitments() {
        UUID userId = getCallingUserId();
        try {
            return ResponseEntity.ok(fundingCommitmentService.getAllCommitmentsForFunder(userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
