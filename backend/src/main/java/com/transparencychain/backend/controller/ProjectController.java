package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.dto.ProjectRequest;
import com.transparencychain.backend.model.EscrowAccount;
import com.transparencychain.backend.model.FunderProfile;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.EscrowAccountRepository;
import com.transparencychain.backend.repository.FunderProfileRepository;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import com.transparencychain.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {
    
    @Autowired
    ProjectRepository projectRepository;
    
    @Autowired
    FunderProfileRepository funderProfileRepository;
    
    @Autowired
    EscrowAccountRepository escrowAccountRepository;
    
    @Autowired
    AuditLogService auditLogService;
    
    @Autowired
    com.transparencychain.backend.repository.NgoProfileRepository ngoProfileRepository;
    
    @Autowired
    com.transparencychain.backend.repository.MilestoneRepository milestoneRepository;
    
    @Autowired
    com.transparencychain.backend.service.BlockchainService blockchainService;
    
    @Autowired
    com.transparencychain.backend.service.MilestoneAutoGenerator milestoneAutoGenerator;

    @Autowired
    com.transparencychain.backend.service.ImpactGenerationService impactGenerationService;


    @PostMapping("/{id}/escrow")
    @PreAuthorize("hasRole('FUNDER')")
    public ResponseEntity<?> lockInEscrow(@PathVariable UUID id) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Project not found"));
        
        if (project.getStatus() != Project.ProjectStatus.DRAFT) {
            return ResponseEntity.badRequest().body(new MessageResponse("Project must be in DRAFT status to escrow."));
        }
        
        if (project.getNgo() != null && project.getNgo().getVerificationStatus() != com.transparencychain.backend.model.NgoProfile.VerificationStatus.VERIFIED) {
            return ResponseEntity.badRequest().body(new MessageResponse("Cannot lock escrow: The matched NGO is not VERIFIED."));
        }
        
        EscrowAccount escrow = new EscrowAccount();
        escrow.setProject(project);
        escrow.setLockedAmount(project.getTotalBudget());
        escrow.setStatus(EscrowAccount.EscrowStatus.LOCKED);
        escrowAccountRepository.save(escrow);
        
        project.setStatus(Project.ProjectStatus.FUNDED);
        projectRepository.save(project);
        
        auditLogService.logAction(project.getId(), "PROJECT", "Funds locked in escrow. EscrowAccount ID: " + escrow.getId());
        
        // Blockchain Interaction
        String txHash = blockchainService.deployEscrow(project.getId(), project.getTotalBudget(), project.getNgo() != null ? project.getNgo().getId().toString() : "0x0");
        auditLogService.logAction(project.getId(), "BLOCKCHAIN", "Smart Contract Escrow deployed. Tx Hash: " + txHash);
        
        return ResponseEntity.ok(new MessageResponse("Funds successfully locked in Escrow."));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable UUID id) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Project not found"));
        return ResponseEntity.ok(project);
    }
    
    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects(
            @RequestParam(required = false) UUID funderId,
            @RequestParam(required = false) UUID ngoId,
            @RequestParam(required = false) UUID ngoUserId,
            @RequestParam(required = false) Project.ProjectStatus status) {
            
        if (funderId != null) {
            return ResponseEntity.ok(projectRepository.findByFunderId(funderId));
        } else if (ngoUserId != null) {
            com.transparencychain.backend.model.NgoProfile ngo = ngoProfileRepository.findByUserId(ngoUserId).orElse(null);
            if (ngo != null) {
                return ResponseEntity.ok(projectRepository.findByNgoId(ngo.getId()));
            }
            return ResponseEntity.ok(java.util.Collections.emptyList());
        } else if (ngoId != null) {
            return ResponseEntity.ok(projectRepository.findByNgoId(ngoId));
        } else if (status != null) {
            return ResponseEntity.ok(projectRepository.findByStatus(status));
        }
        return ResponseEntity.ok(projectRepository.findAll());
    }
    
    @PostMapping("/propose")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> proposeProject(@RequestBody ProjectRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        com.transparencychain.backend.model.NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));
                
        Project project = new Project();
        project.setNgo(ngo);
        project.setTitle(request.getTitle());
        project.setSdgGoal(request.getSdgGoal());
        project.setDescription(request.getDescription());
        project.setTotalBudget(request.getTotalBudget());
        project.setGeography(request.getGeography());
        project.setLatitude(request.getLatitude());
        project.setLongitude(request.getLongitude());
        project.setSdgTarget(request.getSdgTarget());
        project.setProjectDuration(request.getProjectDuration());
        project.setImpactKpi(request.getImpactKpi());
        project.setExpectedBeneficiaries(request.getExpectedBeneficiaries());
        
        if (request.getFunderId() != null) {
            FunderProfile funder = funderProfileRepository.findById(request.getFunderId())
                    .orElseThrow(() -> new RuntimeException("Funder not found"));
            project.setFunder(funder);
        }
        
        project.setStatus(request.getFunderId() != null ? Project.ProjectStatus.SUBMITTED : Project.ProjectStatus.PUBLISHED);
        project = projectRepository.save(project);
        
        // Auto-generate default milestones based on budget/duration
        java.util.List<com.transparencychain.backend.model.Milestone> autoMilestones = milestoneAutoGenerator.generate(project);
        
        // Auto-generate AI impact metrics tailored to project goal & scope
        try {
            impactGenerationService.initializeProjectMetrics(project);
        } catch (Exception ex) {
            System.err.println("Impact metric auto-gen warning: " + ex.getMessage());
        }
        
        auditLogService.logAction(project.getId(), "PROJECT", "Project PROPOSED by NGO " + ngo.getOrgName()
                + " with " + autoMilestones.size() + " auto-generated milestones");
        
        // Return both project and auto-generated milestones
        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("project", project);
        response.put("milestones", autoMilestones);
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('FUNDER')")
    public ResponseEntity<?> reviewProposal(@PathVariable UUID id, @RequestBody java.util.Map<String, String> request) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Project not found"));
        
        String newStatusStr = request.get("status");
        if (newStatusStr == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Status is required"));
        }
        
        Project.ProjectStatus newStatus = Project.ProjectStatus.valueOf(newStatusStr);
        project.setStatus(newStatus);
        
        // If approved and no funder was assigned, assign the approving funder
        if (newStatus == Project.ProjectStatus.APPROVED && project.getFunder() == null) {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            FunderProfile funder = funderProfileRepository.findByUserId(userDetails.getId())
                    .orElseThrow(() -> new RuntimeException("Funder not found"));
            project.setFunder(funder);
        }
        
        projectRepository.save(project);
        
        auditLogService.logAction(project.getId(), "PROJECT_REVIEW", "Project status updated to " + newStatusStr);
        
        return ResponseEntity.ok(new MessageResponse("Project status updated successfully"));
    }
}
