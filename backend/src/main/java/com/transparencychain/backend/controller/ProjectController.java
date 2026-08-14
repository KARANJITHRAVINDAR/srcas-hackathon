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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import com.transparencychain.backend.model.Milestone;

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

    @Autowired
    com.transparencychain.backend.repository.OrgProjectEngagementRepository engagementRepository;

    @Autowired
    com.transparencychain.backend.service.NotificationService notificationService;

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
        java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", project.getId());
        map.put("title", project.getTitle());
        map.put("description", project.getDescription());
        map.put("sdgGoal", project.getSdgGoal());
        map.put("sdgTarget", project.getSdgTarget());
        map.put("totalBudget", project.getTotalBudget());
        map.put("geography", project.getGeography());
        map.put("latitude", project.getLatitude());
        map.put("longitude", project.getLongitude());
        map.put("projectDuration", project.getProjectDuration());
        map.put("impactKpi", project.getImpactKpi());
        map.put("expectedBeneficiaries", project.getExpectedBeneficiaries());
        map.put("status", project.getStatus());
        map.put("createdAt", project.getCreatedAt());

        if (project.getNgo() != null) {
            java.util.Map<String, Object> ngoMap = new java.util.LinkedHashMap<>();
            ngoMap.put("id", project.getNgo().getId());
            ngoMap.put("orgName", project.getNgo().getOrgName());
            ngoMap.put("verificationStatus", project.getNgo().getVerificationStatus());
            ngoMap.put("trustScore", project.getNgo().getTrustScore());
            map.put("ngo", ngoMap);
        } else {
            map.put("ngo", null);
        }

        if (project.getFunder() != null) {
            java.util.Map<String, Object> funderMap = new java.util.LinkedHashMap<>();
            funderMap.put("id", project.getFunder().getId());
            funderMap.put("orgName", project.getFunder().getOrgName());
            map.put("funder", funderMap);
        } else {
            map.put("funder", null);
        }

        // Check engagements for withdrawal
        List<com.transparencychain.backend.model.OrgProjectEngagement> engagements = engagementRepository.findByProjectId(id);
        com.transparencychain.backend.model.OrgProjectEngagement withdrawnEng = engagements.stream()
                .filter(e -> e.getStatus() == com.transparencychain.backend.model.OrgProjectEngagement.EngagementStatus.WITHDRAWN)
                .findFirst().orElse(null);
        if (withdrawnEng != null) {
            map.put("isWithdrawn", true);
            map.put("withdrawalReason", withdrawnEng.getWithdrawalReason());
            map.put("withdrawnAt", withdrawnEng.getWithdrawnAt());
            map.put("withdrawnBy", withdrawnEng.getWithdrawnBy());
            map.put("remodifyStatus", withdrawnEng.getRemodifyStatus());
            if (withdrawnEng.getFunder() != null) {
                map.put("withdrawnFunderName", withdrawnEng.getFunder().getOrgName());
            }
        } else {
            map.put("isWithdrawn", false);
        }

        return ResponseEntity.ok(map);
    }

    @PostMapping("/{id}/remodify")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> remodifyProject(@PathVariable UUID id, @RequestBody(required = false) java.util.Map<String, Object> payload) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Project not found"));
        
        if (payload != null) {
            if (payload.containsKey("title") && payload.get("title") != null) {
                project.setTitle(payload.get("title").toString());
            }
            if (payload.containsKey("description") && payload.get("description") != null) {
                project.setDescription(payload.get("description").toString());
            }
            if (payload.containsKey("sdgGoal") && payload.get("sdgGoal") != null) {
                try {
                    project.setSdgGoal(Project.SdgGoal.valueOf(payload.get("sdgGoal").toString()));
                } catch (Exception ignored) {}
            }
            if (payload.containsKey("sdgTarget") && payload.get("sdgTarget") != null) {
                project.setSdgTarget(payload.get("sdgTarget").toString());
            }
            if (payload.containsKey("totalBudget") && payload.get("totalBudget") != null) {
                try {
                    project.setTotalBudget(new BigDecimal(payload.get("totalBudget").toString()));
                } catch (Exception ignored) {}
            }
            if (payload.containsKey("geography") && payload.get("geography") != null) {
                project.setGeography(payload.get("geography").toString());
            }
            if (payload.containsKey("projectDuration") && payload.get("projectDuration") != null) {
                project.setProjectDuration(payload.get("projectDuration").toString());
            }
            if (payload.containsKey("expectedBeneficiaries") && payload.get("expectedBeneficiaries") != null) {
                try {
                    project.setExpectedBeneficiaries(Integer.parseInt(payload.get("expectedBeneficiaries").toString()));
                } catch (Exception ignored) {}
            }

            // Update milestones if provided
            if (payload.containsKey("milestones") && payload.get("milestones") != null) {
                try {
                    List<java.util.Map<String, Object>> msList = (List<java.util.Map<String, Object>>) payload.get("milestones");
                    for (java.util.Map<String, Object> msData : msList) {
                        if (msData.containsKey("id") && msData.get("id") != null) {
                            try {
                                UUID msId = UUID.fromString(msData.get("id").toString());
                                Milestone ms = milestoneRepository.findById(msId).orElse(null);
                                if (ms != null) {
                                    if (msData.containsKey("title") && msData.get("title") != null) ms.setTitle(msData.get("title").toString());
                                    if (msData.containsKey("description") && msData.get("description") != null) ms.setDescription(msData.get("description").toString());
                                    if (msData.containsKey("amountAllocated") && msData.get("amountAllocated") != null) {
                                        ms.setAmountAllocated(new BigDecimal(msData.get("amountAllocated").toString()));
                                    }
                                    if (msData.containsKey("sequenceNumber") && msData.get("sequenceNumber") != null) {
                                        ms.setSequenceNumber(Integer.parseInt(msData.get("sequenceNumber").toString()));
                                    }
                                    ms.setStatus(Milestone.MilestoneStatus.PENDING);
                                    milestoneRepository.save(ms);
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        // Set project back to PUBLISHED
        project.setStatus(Project.ProjectStatus.PUBLISHED);
        projectRepository.save(project);

        // Reset engagements: remodifyStatus -> RESUBMITTED, status -> DISCOVERED
        List<com.transparencychain.backend.model.OrgProjectEngagement> engagements = engagementRepository.findByProjectId(id);
        for (com.transparencychain.backend.model.OrgProjectEngagement eng : engagements) {
            eng.setRemodifyStatus(com.transparencychain.backend.model.OrgProjectEngagement.RemodifyStatus.RESUBMITTED);
            eng.setStatus(com.transparencychain.backend.model.OrgProjectEngagement.EngagementStatus.DISCOVERED);
            engagementRepository.save(eng);
        }

        auditLogService.logAction(id, "PROJECT_REMODIFIED", "NGO updated and republished project.");

        return ResponseEntity.ok(new MessageResponse("Project remodified and republished successfully."));
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
