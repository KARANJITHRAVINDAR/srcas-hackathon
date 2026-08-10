package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ProofSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProofSubmissionRepository extends JpaRepository<ProofSubmission, UUID> {
    List<ProofSubmission> findByMilestoneId(UUID milestoneId);
}
