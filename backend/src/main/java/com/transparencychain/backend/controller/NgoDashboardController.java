package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/dashboard")
@PreAuthorize("hasRole('NGO')")
public class NgoDashboardController {

    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getDashboardSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));
                
        List<Project> projects = projectRepository.findByNgoId(ngo.getId());
        
        long activeProjects = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.ACTIVE || p.getStatus() == Project.ProjectStatus.IN_PROGRESS).count();
        long fundingRequested = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.UNDER_REVIEW || p.getStatus() == Project.ProjectStatus.SUBMITTED || p.getStatus() == Project.ProjectStatus.PUBLISHED).count();
        long approvedProjects = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.APPROVED || p.getStatus() == Project.ProjectStatus.FUNDED || p.getStatus() == Project.ProjectStatus.ACTIVE || p.getStatus() == Project.ProjectStatus.COMPLETED || p.getStatus() == Project.ProjectStatus.CLOSED).count();
        
        BigDecimal totalFundsReceived = BigDecimal.ZERO;
        List<Map<String, Object>> projectSummaries = new ArrayList<>();
        List<Map<String, Object>> actionRequiredList = new ArrayList<>();
        long totalPendingVerification = 0;
        long totalPendingActions = 0;

        for (Project project : projects) {
            List<Milestone> milestones = milestoneRepository.findByProjectIdOrderBySequenceNumberAsc(project.getId());
            
            BigDecimal projectBudget = project.getTotalBudget() != null ? project.getTotalBudget() : BigDecimal.ZERO;
            BigDecimal projectReleased = BigDecimal.ZERO;
            String currentMilestoneName = "No Milestones";
            
            for (Milestone m : milestones) {
                if (m.getReleasedAmount() != null) {
                    projectReleased = projectReleased.add(m.getReleasedAmount());
                    totalFundsReceived = totalFundsReceived.add(m.getReleasedAmount());
                }
                
                if (m.getStatus() == Milestone.MilestoneStatus.IN_PROGRESS) {
                    currentMilestoneName = m.getTitle();
                    // Action item for NGO: submit evidence for in_progress milestone
                    Map<String, Object> action = new HashMap<>();
                    action.put("projectId", project.getId());
                    action.put("type", "SUBMIT_EVIDENCE");
                    action.put("title", "Evidence submission needed");
                    action.put("subtitle", project.getTitle() + " — " + m.getTitle());
                    actionRequiredList.add(action);
                    totalPendingActions++;
                }

                // Check pending tickets
                List<Ticket> tickets = ticketRepository.findByMilestoneId(m.getId());
                for (Ticket t : tickets) {
                    if (t.getStatus() == Ticket.TicketStatus.OPEN) {
                        totalPendingVerification++;
                    }
                }
            }

            int progressPercent = projectBudget.compareTo(BigDecimal.ZERO) > 0
                    ? projectReleased.multiply(BigDecimal.valueOf(100)).divide(projectBudget, 0, BigDecimal.ROUND_HALF_UP).intValue()
                    : 0;

            Map<String, Object> pMap = new HashMap<>();
            pMap.put("id", project.getId());
            pMap.put("title", project.getTitle());
            pMap.put("status", project.getStatus().name());
            pMap.put("currentMilestone", currentMilestoneName);
            pMap.put("totalBudget", projectBudget);
            pMap.put("spent", projectReleased);
            pMap.put("progress", progressPercent);
            projectSummaries.add(pMap);
        }

        // Recent Activity for NGO
        List<AuditLog> auditLogs = auditLogRepository.findRecentEventsForNgo(ngo.getId(), PageRequest.of(0, 10));
        List<Map<String, Object>> recentActivity = auditLogs.stream().map(log -> {
            Map<String, Object> act = new HashMap<>();
            act.put("id", log.getId());
            act.put("message", log.getEntityType() + ": " + log.getPayload());
            act.put("timestamp", log.getTimestamp());
            return act;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("activeProjects", activeProjects);
        response.put("fundingRequested", fundingRequested);
        response.put("approvedProjects", approvedProjects);
        response.put("fundsReceived", totalFundsReceived);
        response.put("pendingVerification", totalPendingVerification);
        response.put("pendingActions", totalPendingActions);
        response.put("projects", projectSummaries);
        response.put("actionRequired", actionRequiredList);
        response.put("recentActivity", recentActivity);
        
        return ResponseEntity.ok(response);
    }
}
