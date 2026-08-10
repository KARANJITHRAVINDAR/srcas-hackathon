package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.MessageResponse;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.service.AiFraudDetectionService;
import com.transparencychain.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/milestones/{milestoneId}/proofs")
public class ProofController {

    @Autowired
    ProofSubmissionRepository proofRepository;
    
    @Autowired
    MilestoneRepository milestoneRepository;
    
    @Autowired
    FraudCheckRepository fraudCheckRepository;
    
    @Autowired
    AiFraudDetectionService aiFraudDetectionService;
    
    @Autowired
    AuditLogService auditLogService;
    
    @Autowired
    com.transparencychain.backend.service.BlockchainService blockchainService;
    
    @Autowired
    EscrowAccountRepository escrowAccountRepository;
    
    @PostMapping
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> submitProof(@PathVariable UUID milestoneId, @RequestBody Map<String, String> request) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        
        ProofSubmission proof = new ProofSubmission();
        proof.setMilestone(milestone);
        proof.setFileUrl(request.get("fileUrl"));
        proof.setFileType(request.get("fileType"));
        proof.setMetadata(request.get("metadata"));
        proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
        proofRepository.save(proof);
        
        milestone.setStatus(Milestone.MilestoneStatus.IN_REVIEW);
        milestoneRepository.save(milestone);
        
        auditLogService.logAction(milestone.getId(), "MILESTONE", "Proof submitted. ID: " + proof.getId());
        
        // Trigger async AI analysis
        new Thread(() -> {
            String aiResult = aiFraudDetectionService.analyzeProof(proof.getFileUrl(), proof.getMetadata());
            
            FraudCheck fraudCheck = new FraudCheck();
            fraudCheck.setProof(proof);
            fraudCheck.setAiAnalysisResult(aiResult);
            
            if (aiResult.contains("\"fraud\": true")) {
                fraudCheck.setIsFraudulent(true);
                fraudCheck.setOverallConfidenceScore(100 - Double.parseDouble(aiResult.split("\"score\": ")[1].split(",")[0]));
                proof.setStatus(ProofSubmission.ProofStatus.AI_FLAGGED);
                milestone.setStatus(Milestone.MilestoneStatus.REJECTED);
            } else {
                fraudCheck.setIsFraudulent(false);
                fraudCheck.setOverallConfidenceScore(Double.parseDouble(aiResult.split("\"score\": ")[1].split(",")[0]));
                proof.setStatus(ProofSubmission.ProofStatus.AI_VERIFIED);
                milestone.setStatus(Milestone.MilestoneStatus.VERIFIED);
                
                // Smart contract logic to release funds
                String txHash = blockchainService.releaseFunds(milestone.getProject().getId(), milestone.getId(), milestone.getAmountAllocated());
                auditLogService.logAction(milestone.getId(), "BLOCKCHAIN", "Funds released via Smart Contract. Tx Hash: " + txHash);
                
                EscrowAccount escrow = escrowAccountRepository.findByProjectId(milestone.getProject().getId()).orElse(null);
                if (escrow != null) {
                    escrow.setReleasedAmount(escrow.getReleasedAmount().add(milestone.getAmountAllocated()));
                    escrowAccountRepository.save(escrow);
                }
            }
            
            fraudCheckRepository.save(fraudCheck);
            proofRepository.save(proof);
            milestoneRepository.save(milestone);
            
            auditLogService.logAction(proof.getId(), "PROOF", "AI analysis completed. Fraudulent: " + fraudCheck.getIsFraudulent());
        }).start();

        return ResponseEntity.ok(new MessageResponse("Proof submitted and sent for AI analysis."));
    }
    
    @GetMapping
    public ResponseEntity<?> getProofs(@PathVariable UUID milestoneId) {
        return ResponseEntity.ok(proofRepository.findByMilestoneId(milestoneId));
    }
}
