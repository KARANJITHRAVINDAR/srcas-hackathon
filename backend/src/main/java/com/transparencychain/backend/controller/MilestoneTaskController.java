package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.MilestoneTask;
import com.transparencychain.backend.service.MilestoneTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/milestones/{milestoneId}/tasks")
public class MilestoneTaskController {

    @Autowired
    private MilestoneTaskService milestoneTaskService;

    @GetMapping
    public ResponseEntity<?> getTasks(@PathVariable UUID projectId, @PathVariable UUID milestoneId) {
        return ResponseEntity.ok(milestoneTaskService.getTasksForMilestone(milestoneId));
    }

    @PostMapping
    @PreAuthorize("hasRole('FUNDER') or hasRole('ORGANISATION')")
    public ResponseEntity<?> createTask(@PathVariable UUID projectId, @PathVariable UUID milestoneId, @RequestBody MilestoneTask task) {
        return ResponseEntity.ok(milestoneTaskService.createTask(milestoneId, task));
    }
}
