package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.MilestoneTaskResponse;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.MilestoneTask;
import com.transparencychain.backend.model.ProofSubmission;
import com.transparencychain.backend.repository.MilestoneRepository;
import com.transparencychain.backend.repository.MilestoneTaskRepository;
import com.transparencychain.backend.repository.ProofSubmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MilestoneTaskService {

    @Autowired
    private MilestoneTaskRepository milestoneTaskRepository;
    
    @Autowired
    private MilestoneRepository milestoneRepository;
    
    @Autowired
    private ProofSubmissionRepository proofSubmissionRepository;

    public MilestoneTask createTask(UUID milestoneId, MilestoneTask task) {
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new RuntimeException("Milestone not found"));
        task.setMilestone(milestone);
        return milestoneTaskRepository.save(task);
    }

    public List<MilestoneTaskResponse> getTasksForMilestone(UUID milestoneId) {
        List<MilestoneTask> tasks = milestoneTaskRepository.findByMilestoneId(milestoneId);
        List<ProofSubmission> proofs = proofSubmissionRepository.findByMilestoneId(milestoneId);
        
        return tasks.stream().map(task -> {
            MilestoneTaskResponse res = new MilestoneTaskResponse();
            res.setId(task.getId());
            res.setMilestoneId(task.getMilestone().getId());
            res.setTaskName(task.getTaskName());
            res.setDescription(task.getDescription());
            res.setSequenceNumber(task.getSequenceNumber());
            res.setRequiredEvidenceType(task.getRequiredEvidenceType());
            res.setRequiredEvidence(task.getRequiredEvidence());
            res.setStatus(task.getStatus());
            
            // Find proof for this task
            ProofSubmission proof = proofs.stream()
                .filter(p -> p.getMilestoneTask() != null && p.getMilestoneTask().getId().equals(task.getId()))
                .findFirst().orElse(null);
                
            if (proof != null) {
                res.setProofId(proof.getId());
                res.setProofUrl(proof.getFileUrl());
                res.setProofStatus(proof.getStatus().name());
            }
            return res;
        }).collect(Collectors.toList());
    }
}
