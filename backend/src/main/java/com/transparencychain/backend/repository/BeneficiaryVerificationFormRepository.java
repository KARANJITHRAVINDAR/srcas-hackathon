package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.BeneficiaryVerificationForm;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BeneficiaryVerificationFormRepository extends JpaRepository<BeneficiaryVerificationForm, UUID> {
    List<BeneficiaryVerificationForm> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<BeneficiaryVerificationForm> findByShareToken(String shareToken);
}
