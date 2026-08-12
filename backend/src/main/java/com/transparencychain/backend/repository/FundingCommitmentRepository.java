package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.FundingCommitment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundingCommitmentRepository extends JpaRepository<FundingCommitment, UUID> {
    List<FundingCommitment> findByFunderId(UUID funderId);
    List<FundingCommitment> findByProjectId(UUID projectId);
    Optional<FundingCommitment> findFirstByProjectIdAndStatus(UUID projectId, FundingCommitment.FundingCommitmentStatus status);
}
