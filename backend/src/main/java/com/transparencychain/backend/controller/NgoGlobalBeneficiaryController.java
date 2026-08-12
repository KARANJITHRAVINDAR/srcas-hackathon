package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/beneficiary-forms")
@PreAuthorize("hasRole('NGO')")
public class NgoGlobalBeneficiaryController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BeneficiaryVerificationFormRepository formRepository;

    @Autowired
    private BeneficiaryFormResponseRepository responseRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getGlobalSummary(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        NgoProfile ngoProfile = ngoProfileRepository.findByUserId(user.getId()).orElseThrow();

        List<Project> projects = projectRepository.findByNgoId(ngoProfile.getId());
        
        long totalActiveForms = 0;
        long totalResponses = 0;
        long totalYesResponses = 0;
        long totalTargetResponses = 0;
        
        List<Map<String, Object>> formsSummary = new ArrayList<>();

        for (Project project : projects) {
            List<BeneficiaryVerificationForm> forms = formRepository.findByProjectIdOrderByCreatedAtDesc(project.getId());
            for (BeneficiaryVerificationForm form : forms) {
                if (form.getStatus() == BeneficiaryVerificationForm.FormStatus.ACTIVE) {
                    totalActiveForms++;
                }

                long formResponses = responseRepository.countByFormId(form.getId());
                long formYesResponses = responseRepository.countByFormIdAndOverallResponse(form.getId(), BeneficiaryFormResponse.OverallResponse.YES);
                
                totalResponses += formResponses;
                totalYesResponses += formYesResponses;
                totalTargetResponses += form.getTargetResponses();

                Map<String, Object> formDto = new HashMap<>();
                formDto.put("id", form.getId());
                formDto.put("projectId", project.getId());
                formDto.put("projectTitle", project.getTitle());
                formDto.put("formTitle", form.getTitle());
                formDto.put("status", form.getStatus().name());
                formDto.put("targetResponses", form.getTargetResponses());
                formDto.put("responsesReceived", formResponses);
                
                double posRate = formResponses > 0 ? (double) formYesResponses / formResponses * 100 : 0;
                formDto.put("positiveRate", posRate);
                
                formsSummary.add(formDto);
            }
        }

        double globalPositiveRate = totalResponses > 0 ? (double) totalYesResponses / totalResponses * 100 : 0;
        double globalResponseRate = totalTargetResponses > 0 ? (double) totalResponses / totalTargetResponses * 100 : 0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalActiveForms", totalActiveForms);
        summary.put("totalResponses", totalResponses);
        summary.put("globalPositiveRate", globalPositiveRate);
        summary.put("globalResponseRate", globalResponseRate);
        summary.put("totalTargetResponses", totalTargetResponses);
        summary.put("forms", formsSummary);

        return ResponseEntity.ok(summary);
    }
}
