package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BeneficiaryFeedbackRepository extends JpaRepository<BeneficiaryFeedback, UUID> {
    List<BeneficiaryFeedback> findByProjectId(UUID projectId);
    List<BeneficiaryFeedback> findByMilestoneId(UUID milestoneId);
    long countByProjectIdAndStatus(UUID projectId, BeneficiaryFeedback.FeedbackStatus status);
}
