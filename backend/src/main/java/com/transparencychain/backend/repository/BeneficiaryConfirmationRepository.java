package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryConfirmation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BeneficiaryConfirmationRepository extends JpaRepository<BeneficiaryConfirmation, UUID> {
    List<BeneficiaryConfirmation> findByMilestoneId(UUID milestoneId);
}
