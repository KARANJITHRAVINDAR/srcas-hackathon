package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.ProjectCardDto;
import com.transparencychain.backend.dto.ProjectDetailDto;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.OrgProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Organisation/Funder module — Phase 1: Project Discovery & Detail View
 *
 * Base path: /api/org
 *
 * All endpoints require FUNDER role.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/org")
@PreAuthorize("hasRole('FUNDER')")
public class OrgProjectController {

    @Autowired private OrgProjectService orgProjectService;
    @Autowired private FunderProfileRepository funderProfileRepository;

    // -------------------------------------------------------------------------
    // Helper: resolve FunderProfile for the currently authenticated user
    // -------------------------------------------------------------------------
    private FunderProfile currentFunder() {
        UserDetailsImpl userDetails = (UserDetailsImpl)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException(
                        "FunderProfile not found for user: " + userDetails.getId()));
    }

    // -------------------------------------------------------------------------
    // GET /api/org/projects
    // Browse PUBLISHED projects with optional filters
    //
    // Query params (all optional):
    //   sdgGoal      e.g. SDG6
    //   geography    partial text match on geography field
    //   budgetMin    minimum totalBudget (inclusive)
    //   budgetMax    maximum totalBudget (inclusive)
    // -------------------------------------------------------------------------
    @GetMapping("/projects")
    public ResponseEntity<List<ProjectCardDto>> browseProjects(
            @RequestParam(required = false) Project.SdgGoal sdgGoal,
            @RequestParam(required = false) String geography,
            @RequestParam(required = false) BigDecimal budgetMin,
            @RequestParam(required = false) BigDecimal budgetMax) {

        UUID funderId = currentFunder().getId();
        List<ProjectCardDto> cards = orgProjectService.browsePublishedProjects(
                funderId, sdgGoal, geography, budgetMin, budgetMax);
        return ResponseEntity.ok(cards);
    }

    // -------------------------------------------------------------------------
    // GET /api/org/projects/{id}
    // Full project detail: NGO trust profile panel + ordered milestone list.
    // Auto-registers DISCOVERED engagement if this is the first open.
    // -------------------------------------------------------------------------
    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectDetailDto> getProjectDetail(@PathVariable UUID id) {
        UUID funderId = currentFunder().getId();
        try {
            ProjectDetailDto detail = orgProjectService.getProjectDetail(id, funderId);
            return ResponseEntity.ok(detail);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/org/projects/{id}/review
    // Transition engagement DISCOVERED -> UNDER_REVIEW.
    // Returns the refreshed project detail so the client can update its view.
    // -------------------------------------------------------------------------
    @PostMapping("/projects/{id}/review")
    public ResponseEntity<?> markProjectUnderReview(@PathVariable UUID id) {
        UUID funderId = currentFunder().getId();
        try {
            ProjectDetailDto detail = orgProjectService.markUnderReview(id, funderId);
            return ResponseEntity.ok(detail);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Invalid transition: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/projects/{id}/negotiate")
    public ResponseEntity<?> markProjectNegotiating(@PathVariable UUID id) {
        UUID funderId = currentFunder().getId();
        try {
            ProjectDetailDto detail = orgProjectService.markNegotiating(id, funderId);
            return ResponseEntity.ok(detail);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Invalid transition: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/org/milestones
    // Cross-project milestones list for the Funder
    // -------------------------------------------------------------------------
    @GetMapping("/milestones")
    public ResponseEntity<?> getAllMilestones() {
        UUID funderId = currentFunder().getId();
        try {
            return ResponseEntity.ok(orgProjectService.getAllMilestonesForFunder(funderId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}
