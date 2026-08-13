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

    @Autowired
    com.transparencychain.backend.service.BlockchainService blockchainService;
    
    @PostMapping("/milestones/{milestoneId}/proofs")
    @PreAuthorize("hasRole('NGO')")
    public ResponseEntity<?> submitProof(@PathVariable UUID milestoneId, 
                                         @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                         @RequestParam("metadata") String metadata,
                                         @RequestParam(value = "expectedType", defaultValue = "INVOICE") String expectedType) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        boolean isValid = (contentType != null && (contentType.startsWith("video/") || contentType.equals("application/pdf") || contentType.startsWith("image/"))) ||
                          (originalFilename != null && (originalFilename.toLowerCase().endsWith(".mp4") ||
                                                        originalFilename.toLowerCase().endsWith(".mov") ||
                                                        originalFilename.toLowerCase().endsWith(".avi") ||
                                                        originalFilename.toLowerCase().endsWith(".mkv") ||
                                                        originalFilename.toLowerCase().endsWith(".webm") ||
                                                        originalFilename.toLowerCase().endsWith(".pdf") ||
                                                        originalFilename.toLowerCase().endsWith(".png") ||
                                                        originalFilename.toLowerCase().endsWith(".jpg") ||
                                                        originalFilename.toLowerCase().endsWith(".jpeg")));
        if (!isValid) {
            return ResponseEntity.badRequest().body(new MessageResponse("Only video, PDF, or image files are allowed for evidence."));
        }
        
        ProofSubmission proof = new ProofSubmission();
        proof.setMilestone(milestone);
        proof.setFileUrl(file.getOriginalFilename());
        proof.setFileType(file.getContentType());
        proof.setMetadata(metadata);
        proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
        proofRepository.save(proof);
        
        milestone.setStatus(Milestone.MilestoneStatus.EVIDENCE_SUBMITTED);
        milestoneRepository.save(milestone);
        
        String txHash = "0xhash";
        try {
            txHash = blockchainService.anchorEvidence(milestone.getId(), originalFilename, file.getBytes());
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        auditLogService.logAction(milestone.getId(), "MILESTONE", "Evidence submitted and anchored. ID: " + proof.getId() + ", Tx Hash: " + txHash);
        
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

    @GetMapping("/projects/{projectId}/proofs")
    public ResponseEntity<?> getProjectProofs(@PathVariable UUID projectId) {
        return ResponseEntity.ok(proofRepository.findByMilestone_ProjectIdOrderBySubmittedAtDesc(projectId));
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
