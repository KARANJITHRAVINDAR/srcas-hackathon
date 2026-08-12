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
import java.util.Map;
import java.math.BigDecimal;
import com.transparencychain.backend.dto.FundRequestDto;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/milestones")
public class MilestoneController {

    @Autowired
    MilestoneRepository milestoneRepository;

    @Autowired
    ProjectRepository projectRepository;
    
    @Autowired
    com.transparencychain.backend.repository.MilestoneTaskRepository milestoneTaskRepository;
    
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
            m.setStatus(Milestone.MilestoneStatus.AVAILABLE);
        }
        
        milestoneRepository.saveAll(milestones);
        
        auditLogService.logAction(project.getId(), "MILESTONE", milestones.size() + " milestones created");
        
        if (project.getStatus() == Project.ProjectStatus.FUNDED) {
            project.setStatus(Project.ProjectStatus.ACTIVE);
            projectRepository.save(project);
        }

        return ResponseEntity.ok(milestones);
    }
    
    @GetMapping
    public ResponseEntity<?> getMilestones(@PathVariable UUID projectId) {
        return ResponseEntity.ok(milestoneRepository.findByProjectId(projectId));
    }

    @GetMapping("/{milestoneId}/progress")
    public ResponseEntity<?> getMilestoneProgress(@PathVariable UUID projectId, @PathVariable UUID milestoneId) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        List<com.transparencychain.backend.model.MilestoneTask> tasks = milestoneTaskRepository.findByMilestoneId(milestoneId);
        
        int totalTasks = tasks.size();
        int completedTasks = (int) tasks.stream().filter(t -> t.getStatus() == com.transparencychain.backend.model.MilestoneTask.TaskStatus.COMPLETED).count();
        int progressPercentage = totalTasks == 0 ? 0 : (completedTasks * 100) / totalTasks;
        
        return ResponseEntity.ok(Map.of(
            "milestoneId", milestone.getId(),
            "status", milestone.getStatus(),
            "totalTasks", totalTasks,
            "completedTasks", completedTasks,
            "progressPercentage", progressPercentage
        ));
    }

    @PostMapping("/{milestoneId}/submit")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> submitMilestone(@PathVariable UUID projectId, @PathVariable UUID milestoneId) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        milestone.setStatus(Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL);
        milestoneRepository.save(milestone);
        
        auditLogService.logAction(milestone.getId(), "MILESTONE", "Milestone submitted to Funder for final approval");
        return ResponseEntity.ok(new MessageResponse("Milestone submitted successfully"));
    }

    @PostMapping("/{milestoneId}/fund-request")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> requestAdditionalFunds(
            @PathVariable UUID projectId, 
            @PathVariable UUID milestoneId,
            @RequestParam("amount") BigDecimal amount,
            @RequestParam("reason") String reason,
            @RequestParam(value = "proof", required = false) org.springframework.web.multipart.MultipartFile proof) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        
        String proofLog = proof != null ? " with proof document: " + proof.getOriginalFilename() : "";
        auditLogService.logAction(milestone.getId(), "FUND_REQUEST", "Requested additional ₹" + amount + " for reason: " + reason + proofLog);
        
        // This is a simple implementation for the demo, logging the request to the audit log which the Funder can view.
        return ResponseEntity.ok(new MessageResponse("Fund request submitted successfully"));
    }
}
