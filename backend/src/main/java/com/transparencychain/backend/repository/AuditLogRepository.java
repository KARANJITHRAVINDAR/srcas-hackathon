package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByEntityIdOrderByTimestampAsc(UUID entityId);
    Optional<AuditLog> findTopByOrderByTimestampDesc();

    @Query("SELECT a FROM AuditLog a WHERE a.entityId IN (SELECT e.project.id FROM OrgProjectEngagement e WHERE e.funder.id = :funderId) ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentEventsForFunder(@Param("funderId") UUID funderId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.entityId IN (SELECT p.id FROM Project p WHERE p.ngo.id = :ngoId) ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentEventsForNgo(@Param("ngoId") UUID ngoId, Pageable pageable);
}
