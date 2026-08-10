package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.MilestoneRepository;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/milestones")
public class MilestoneController {

    @Autowired
    MilestoneRepository milestoneRepository;

    @Autowired
    ProjectRepository projectRepository;
    
    @Autowired
    AuditLogService auditLogService;

    @PostMapping("/bulk")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> createMilestones(@PathVariable UUID projectId, @RequestBody List<Milestone> milestones) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        
        BigDecimal totalAllocated = BigDecimal.ZERO;
        for (Milestone m : milestones) {
            totalAllocated = totalAllocated.add(m.getAmountAllocated());
        }
        
        if (totalAllocated.compareTo(project.getTotalBudget()) > 0) {
            return ResponseEntity.badRequest().body(new MessageResponse("Total milestone allocation exceeds project budget"));
        }

        for (Milestone m : milestones) {
            m.setProject(project);
            m.setStatus(Milestone.MilestoneStatus.PENDING);
        }
        
        milestoneRepository.saveAll(milestones);
        
        auditLogService.logAction(project.getId(), "MILESTONE", milestones.size() + " milestones created");
        
        // Move project out of escrow to in_progress if milestones are defined
        if (project.getStatus() == Project.ProjectStatus.ESCROWED) {
            project.setStatus(Project.ProjectStatus.IN_PROGRESS);
            projectRepository.save(project);
        }

        return ResponseEntity.ok(milestones);
    }
    
    @GetMapping
    public ResponseEntity<?> getMilestones(@PathVariable UUID projectId) {
        return ResponseEntity.ok(milestoneRepository.findByProjectId(projectId));
    }
}
