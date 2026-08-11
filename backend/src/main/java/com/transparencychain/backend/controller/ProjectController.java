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

    @PostMapping
    @PreAuthorize("hasRole('FUNDER')")
    public ResponseEntity<?> createProject(@RequestBody ProjectRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        FunderProfile funder = funderProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Funder not found"));
                
        Project project = new Project();
        project.setFunder(funder);
        project.setTitle(request.getTitle());
        project.setSdgGoal(request.getSdgGoal());
        project.setDescription(request.getDescription());
        project.setTotalBudget(request.getTotalBudget());
        project.setGeography(request.getGeography());
        project.setLatitude(request.getLatitude());
        project.setLongitude(request.getLongitude());
        
        // New fields
        project.setSdgTarget(request.getSdgTarget());
        project.setProjectDuration(request.getProjectDuration());
        project.setImpactKpi(request.getImpactKpi());
        project.setExpectedBeneficiaries(request.getExpectedBeneficiaries());
        
        // Assign NGO if provided
        if (request.getNgoId() != null) {
            com.transparencychain.backend.model.NgoProfile ngo = ngoProfileRepository.findById(request.getNgoId())
                    .orElseThrow(() -> new RuntimeException("NGO not found"));
            project.setNgo(ngo);
        }

        project.setStatus(Project.ProjectStatus.DRAFT);
        project = projectRepository.save(project);
        
        // Create Milestones
        if (request.getMilestones() != null && !request.getMilestones().isEmpty()) {
            for (com.transparencychain.backend.dto.MilestoneRequest milestoneReq : request.getMilestones()) {
                com.transparencychain.backend.model.Milestone milestone = new com.transparencychain.backend.model.Milestone();
                milestone.setProject(project);
                milestone.setTitle(milestoneReq.getTitle());
                milestone.setDescription(milestoneReq.getDescription());
                milestone.setAmountAllocated(milestoneReq.getAmountAllocated());
                milestone.setDueDate(milestoneReq.getDueDate());
                milestone.setRequiredEvidence(milestoneReq.getRequiredEvidence());
                milestone.setVerificationRequirements(milestoneReq.getVerificationRequirements());
                milestone.setStatus(com.transparencychain.backend.model.Milestone.MilestoneStatus.PENDING);
                milestoneRepository.save(milestone);
            }
        }
        
        auditLogService.logAction(project.getId(), "PROJECT", "Project created in DRAFT status with budget " + project.getTotalBudget());
        
        return ResponseEntity.ok(project);
    }
    
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
        
        project.setStatus(Project.ProjectStatus.ESCROWED);
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
}
