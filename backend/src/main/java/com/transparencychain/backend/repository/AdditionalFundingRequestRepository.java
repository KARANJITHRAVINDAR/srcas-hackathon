package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.AdditionalFundingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AdditionalFundingRequestRepository extends JpaRepository<AdditionalFundingRequest, UUID> {
    List<AdditionalFundingRequest> findByMilestone_ProjectIdOrderByCreatedAtDesc(UUID projectId);
}
