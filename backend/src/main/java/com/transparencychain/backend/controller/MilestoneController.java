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

        // Delete any existing auto-generated or older milestones to prevent duplication
        List<Milestone> existing = milestoneRepository.findByProjectId(projectId);
        if (existing != null && !existing.isEmpty()) {
            milestoneRepository.deleteAll(existing);
        }

        for (int i = 0; i < milestones.size(); i++) {
            Milestone m = milestones.get(i);
            m.setProject(project);
            if (m.getTitle() != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                if (matcher.find()) {
                    m.setSequenceNumber(Integer.parseInt(matcher.group(1)));
                } else if (m.getSequenceNumber() == null) {
                    m.setSequenceNumber(i + 1);
                }
            } else if (m.getSequenceNumber() == null) {
                m.setSequenceNumber(i + 1);
            }
            m.setStatus(Milestone.MilestoneStatus.PENDING);
        }
        
        milestones.sort((a, b) -> Integer.compare(
            a.getSequenceNumber() != null ? a.getSequenceNumber() : 99,
            b.getSequenceNumber() != null ? b.getSequenceNumber() : 99
        ));
        
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
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        boolean modified = false;
        for (Milestone m : milestones) {
            if (m.getTitle() != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                if (matcher.find()) {
                    int phaseNum = Integer.parseInt(matcher.group(1));
                    if (m.getSequenceNumber() == null || m.getSequenceNumber() != phaseNum) {
                        m.setSequenceNumber(phaseNum);
                        modified = true;
                    }
                }
            }
        }
        if (modified) {
            milestoneRepository.saveAll(milestones);
        }
        milestones.sort((a, b) -> Integer.compare(
            a.getSequenceNumber() != null ? a.getSequenceNumber() : 99,
            b.getSequenceNumber() != null ? b.getSequenceNumber() : 99
        ));
        return ResponseEntity.ok(milestones);
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

    @PostMapping("/{milestoneId}/activate")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> activateMilestone(@PathVariable UUID projectId, @PathVariable UUID milestoneId) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        if (milestone.getStatus() != Milestone.MilestoneStatus.LOCKED) {
            return ResponseEntity.badRequest().body(new MessageResponse("Only LOCKED milestones can be activated. Current status: " + milestone.getStatus()));
        }
        milestone.setStatus(Milestone.MilestoneStatus.IN_PROGRESS);
        milestoneRepository.save(milestone);
        auditLogService.logAction(milestone.getId(), "MILESTONE_ACTIVATED", "Milestone activated by NGO");
        return ResponseEntity.ok(milestone);
    }
}
