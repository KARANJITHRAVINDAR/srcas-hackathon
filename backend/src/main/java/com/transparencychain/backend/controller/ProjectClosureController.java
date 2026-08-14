package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.ProjectClosureStatusDto;
import com.transparencychain.backend.service.ProjectClosureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*")
public class ProjectClosureController {

    @Autowired
    private ProjectClosureService closureService;

    @GetMapping("/{projectId}/closure-status")
    public ResponseEntity<ProjectClosureStatusDto> getClosureStatus(@PathVariable UUID projectId) {
        return ResponseEntity.ok(closureService.getClosureStatus(projectId));
    }

    @PostMapping("/{projectId}/evaluate-closure")
    public ResponseEntity<ProjectClosureStatusDto> evaluateClosure(@PathVariable UUID projectId) {
        return ResponseEntity.ok(closureService.evaluateAndTriggerClosure(projectId));
    }
}
