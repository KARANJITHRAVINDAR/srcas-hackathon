package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.AuditReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditReportRepository extends JpaRepository<AuditReport, UUID> {
    List<AuditReport> findByProjectIdOrderByReportVersionDesc(UUID projectId);
    Optional<AuditReport> findTopByProjectIdOrderByReportVersionDesc(UUID projectId);
}
