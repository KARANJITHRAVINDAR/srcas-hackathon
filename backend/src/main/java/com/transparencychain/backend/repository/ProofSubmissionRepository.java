package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ProofSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProofSubmissionRepository extends JpaRepository<ProofSubmission, UUID> {
    List<ProofSubmission> findByMilestoneId(UUID milestoneId);
    
    List<ProofSubmission> findByMilestone_ProjectIdOrderBySubmittedAtDesc(UUID projectId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM ProofSubmission p WHERE p.milestone.project.ngo.id = :ngoId AND p.status IN :statuses ORDER BY p.submittedAt DESC")
    List<ProofSubmission> findByNgoIdAndStatuses(@org.springframework.data.repository.query.Param("ngoId") UUID ngoId, @org.springframework.data.repository.query.Param("statuses") List<ProofSubmission.ProofStatus> statuses);
}
