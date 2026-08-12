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
@RequestMapping("/api/v1")
public class ProofController {

    @Autowired
    ProofSubmissionRepository proofRepository;
    
    @Autowired
    MilestoneRepository milestoneRepository;
    
    @Autowired
    MilestoneTaskRepository milestoneTaskRepository;
    
    @Autowired
    EvidenceAnalysisRepository evidenceAnalysisRepository;
    
    @Autowired
    AiFraudDetectionService aiFraudDetectionService;
    
    @Autowired
    AuditLogService auditLogService;
    
    @PostMapping("/milestones/{milestoneId}/proofs")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> submitProof(@PathVariable UUID milestoneId, 
                                         @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                         @RequestParam("metadata") String metadata,
                                         @RequestParam(value = "expectedType", defaultValue = "INVOICE") String expectedType) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        
        ProofSubmission proof = new ProofSubmission();
        proof.setMilestone(milestone);
        proof.setFileUrl(file.getOriginalFilename());
        proof.setFileType(file.getContentType());
        proof.setMetadata(metadata);
        proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
        proofRepository.save(proof);
        
        milestone.setStatus(Milestone.MilestoneStatus.AWAITING_FUNDER_APPROVAL);
        milestoneRepository.save(milestone);
        
        auditLogService.logAction(milestone.getId(), "MILESTONE", "Evidence submitted. ID: " + proof.getId());
        
        try {
            // Trigger async AI analysis
            new Thread(() -> {
                EvidenceAnalysis analysis = aiFraudDetectionService.analyzeProof(file, proof, expectedType);
                
                if (analysis.getResult() == EvidenceAnalysisResult.FLAGGED) {
                    proof.setStatus(ProofSubmission.ProofStatus.AI_FLAGGED);
                } else if (analysis.getResult() == EvidenceAnalysisResult.LOW_RISK || analysis.getResult() == EvidenceAnalysisResult.NOT_APPLICABLE) {
                    proof.setStatus(ProofSubmission.ProofStatus.AI_VERIFIED); // Note: AI doesn't release funds, just marks its own check passed
                } else {
                    proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK); // Stay in review
                }
                
                proofRepository.save(proof);
                auditLogService.logAction(proof.getId(), "PROOF", "AI analysis completed. Result: " + analysis.getResult());
            }).start();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new MessageResponse("Failed to read uploaded file"));
        }

        return ResponseEntity.ok(proof);
    }
    
    @PostMapping("/projects/{projectId}/milestones/{milestoneId}/tasks/{taskId}/evidence")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> submitTaskProof(@PathVariable UUID projectId,
                                             @PathVariable UUID milestoneId,
                                             @PathVariable UUID taskId,
                                             @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                             @RequestParam(value = "metadata", required = false) String metadata,
                                             @RequestParam(value = "expectedType", defaultValue = "INVOICE") String expectedType) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        MilestoneTask task = milestoneTaskRepository.findById(taskId).orElseThrow();
        
        ProofSubmission proof = new ProofSubmission();
        proof.setMilestone(milestone);
        proof.setMilestoneTask(task);
        proof.setFileUrl(file.getOriginalFilename());
        proof.setFileType(file.getContentType());
        proof.setMetadata(metadata);
        proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
        proofRepository.save(proof);
        
        task.setStatus(MilestoneTask.TaskStatus.PROOF_SUBMITTED);
        milestoneTaskRepository.save(task);
        
        auditLogService.logAction(milestone.getId(), "TASK_EVIDENCE", "Evidence submitted for task: " + task.getTaskName() + " ID: " + proof.getId());
        
        try {
            // Trigger async AI analysis
            new Thread(() -> {
                EvidenceAnalysis analysis = aiFraudDetectionService.analyzeProof(file, proof, expectedType);
                
                if (analysis.getResult() == EvidenceAnalysisResult.FLAGGED) {
                    proof.setStatus(ProofSubmission.ProofStatus.AI_FLAGGED);
                    task.setStatus(MilestoneTask.TaskStatus.REJECTED);
                } else if (analysis.getResult() == EvidenceAnalysisResult.LOW_RISK || analysis.getResult() == EvidenceAnalysisResult.NOT_APPLICABLE) {
                    proof.setStatus(ProofSubmission.ProofStatus.AI_VERIFIED);
                    task.setStatus(MilestoneTask.TaskStatus.UNDER_VALIDATION); // Real logic might advance directly to completed depending on human validation
                } else {
                    proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
                }
                
                proofRepository.save(proof);
                milestoneTaskRepository.save(task);
                auditLogService.logAction(proof.getId(), "PROOF", "AI analysis completed. Result: " + analysis.getResult());
            }).start();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new MessageResponse("Failed to read uploaded file"));
        }

        return ResponseEntity.ok(proof);
    }
    
    @GetMapping("/milestones/{milestoneId}/proofs")
    public ResponseEntity<?> getProofs(@PathVariable UUID milestoneId) {
        return ResponseEntity.ok(proofRepository.findByMilestoneId(milestoneId));
    }

    @PostMapping("/evidence/{evidenceId}/analyze")
    public ResponseEntity<?> analyzeEvidence(@PathVariable UUID evidenceId, 
                                             @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                             @RequestParam(value = "expectedType", defaultValue = "INVOICE") String expectedType) {
        ProofSubmission proof = proofRepository.findById(evidenceId).orElseThrow();
        EvidenceAnalysis analysis = aiFraudDetectionService.analyzeProof(file, proof, expectedType);
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/evidence/{evidenceId}/analysis")
    public ResponseEntity<?> getAnalysis(@PathVariable UUID evidenceId) {
        EvidenceAnalysis analysis = evidenceAnalysisRepository.findByProofId(evidenceId);
        if (analysis == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(analysis);
    }
}
