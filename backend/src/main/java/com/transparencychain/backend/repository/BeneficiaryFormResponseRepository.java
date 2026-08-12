package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryFormResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BeneficiaryFormResponseRepository extends JpaRepository<BeneficiaryFormResponse, UUID> {
    List<BeneficiaryFormResponse> findByFormIdOrderBySubmittedAtDesc(UUID formId);
    long countByFormId(UUID formId);
    long countByFormIdAndOverallResponse(UUID formId, BeneficiaryFormResponse.OverallResponse response);
}
