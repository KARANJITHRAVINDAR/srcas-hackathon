package com.transparencychain.backend.controller;

import com.transparencychain.backend.service.ImpactGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/impact")
@PreAuthorize("isAuthenticated()")
public class ProjectImpactController {

    @Autowired
    private ImpactGenerationService impactGenerationService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getImpactDashboard(@PathVariable UUID projectId) {
        return ResponseEntity.ok(impactGenerationService.getImpactDashboard(projectId));
    }

    @GetMapping("/history")
    public ResponseEntity<?> getImpactHistory(@PathVariable UUID projectId) {
        Map<String, Object> dashboard = impactGenerationService.getImpactDashboard(projectId);
        return ResponseEntity.ok(dashboard.getOrDefault("history", Collections.emptyList()));
    }
}
