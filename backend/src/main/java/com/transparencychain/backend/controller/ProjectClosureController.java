package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.ProjectClosureStatusDto;
import com.transparencychain.backend.model.ClosureVideo;
import com.transparencychain.backend.model.MilestoneClosureConfig;
import com.transparencychain.backend.repository.MilestoneClosureConfigRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.ProjectClosureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class ProjectClosureController {

    @Autowired private ProjectClosureService projectClosureService;
    @Autowired private MilestoneClosureConfigRepository configRepository;

    @GetMapping("/closure-gates")
    public ResponseEntity<ProjectClosureStatusDto> getClosureGates(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectClosureService.getClosureStatus(projectId));
    }

    @PostMapping("/closure-video")
    @PreAuthorize("hasRole('NGO') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadClosureVideo(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng,
            @RequestParam(value = "capturedAt", required = false) String capturedAt
    ) {
        try {
            UserDetailsImpl user = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            ClosureVideo video = projectClosureService.uploadClosureVideo(projectId, file, lat, lng, capturedAt, user);
            return ResponseEntity.ok(video);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Failed to upload closure video: " + e.getMessage()));
        }
    }

    @PostMapping("/closure-video/verify")
    @PreAuthorize("hasRole('FUNDER') or hasRole('ADMIN')")
    public ResponseEntity<?> reviewClosureVideo(
            @PathVariable UUID projectId,
            @RequestBody Map<String, String> payload
    ) {
        try {
            UserDetailsImpl funderUser = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            String decision = payload.get("decision");
            String reason = payload.get("reason");
            ClosureVideo video = projectClosureService.reviewClosureVideo(projectId, decision, reason, funderUser);
            return ResponseEntity.ok(video);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error reviewing closure video: " + e.getMessage()));
        }
    }

    @PostMapping("/mark-done")
    @PreAuthorize("hasRole('FUNDER') or hasRole('ADMIN')")
    public ResponseEntity<?> markProjectAsDone(@PathVariable UUID projectId) {
        try {
            UserDetailsImpl funderUser = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            ProjectClosureStatusDto status = projectClosureService.markProjectAsDone(projectId, funderUser);
            return ResponseEntity.ok(status);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new MessageResponse("Error completing project: " + e.getMessage()));
        }
    }

    @GetMapping("/closure-config")
    public ResponseEntity<MilestoneClosureConfig> getClosureConfig(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectClosureService.getOrCreateConfig(projectId));
    }

    @PutMapping("/closure-config")
    @PreAuthorize("hasRole('ADMIN') or hasRole('FUNDER')")
    public ResponseEntity<?> updateClosureConfig(
            @PathVariable UUID projectId,
            @RequestBody Map<String, Object> payload
    ) {
        MilestoneClosureConfig config = projectClosureService.getOrCreateConfig(projectId);
        if (payload.containsKey("minCoverageRate")) {
            config.setMinCoverageRate(new BigDecimal(payload.get("minCoverageRate").toString()));
        }
        if (payload.containsKey("minSampleSize")) {
            config.setMinSampleSize(Integer.parseInt(payload.get("minSampleSize").toString()));
        }
        if (payload.containsKey("minPositiveRate")) {
            config.setMinPositiveRate(new BigDecimal(payload.get("minPositiveRate").toString()));
        }
        configRepository.save(config);
        return ResponseEntity.ok(config);
    }
}
