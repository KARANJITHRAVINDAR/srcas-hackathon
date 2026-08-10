package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.BeneficiaryConfirmation;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.repository.BeneficiaryConfirmationRepository;
import com.transparencychain.backend.repository.MilestoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/milestones/{milestoneId}/beneficiaries")
public class BeneficiaryController {
    
    @Autowired
    BeneficiaryConfirmationRepository beneficiaryRepository;
    
    @Autowired
    MilestoneRepository milestoneRepository;

    @PostMapping("/simulate-ivrs")
    public ResponseEntity<?> simulateCall(@PathVariable UUID milestoneId) {
        Milestone m = milestoneRepository.findById(milestoneId).orElseThrow();
        
        BeneficiaryConfirmation bc = new BeneficiaryConfirmation();
        bc.setMilestone(m);
        bc.setPhoneNumberHash(UUID.randomUUID().toString().substring(0, 10)); // Simulated hash
        bc.setIsConfirmed(Math.random() > 0.2); // 80% confirm rate
        bc.setFeedbackAudioUrl("https://ipfs.io/ipfs/QmMockAudioHash");
        
        beneficiaryRepository.save(bc);
        return ResponseEntity.ok(bc);
    }
    
    @GetMapping
    public ResponseEntity<?> getConfirmations(@PathVariable UUID milestoneId) {
        return ResponseEntity.ok(beneficiaryRepository.findByMilestoneId(milestoneId));
    }
}
