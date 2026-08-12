package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ImpactVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ImpactVerificationRepository extends JpaRepository<ImpactVerification, UUID> {
    List<ImpactVerification> findByImpactReportIdOrderByVerifiedAtDesc(UUID reportId);
}
