package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.repository.NgoProfileRepository;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/dashboard")
@PreAuthorize("hasRole('NGO')")
public class NgoDashboardController {

    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getDashboardSummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));
                
        List<Project> projects = projectRepository.findByNgoId(ngo.getId());
        
        long activeProjects = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.ACTIVE).count();
        long fundingRequested = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.UNDER_REVIEW || p.getStatus() == Project.ProjectStatus.SUBMITTED).count();
        long approvedProjects = projects.stream().filter(p -> p.getStatus() == Project.ProjectStatus.APPROVED || p.getStatus() == Project.ProjectStatus.FUNDED).count();
        
        Map<String, Object> response = new HashMap<>();
        response.put("activeProjects", activeProjects);
        response.put("fundingRequested", fundingRequested);
        response.put("approvedProjects", approvedProjects);
        response.put("fundsReceived", 0); // Placeholder, requires full escrow logic
        response.put("pendingVerification", 0);
        response.put("pendingActions", 0);
        
        return ResponseEntity.ok(response);
    }
}
