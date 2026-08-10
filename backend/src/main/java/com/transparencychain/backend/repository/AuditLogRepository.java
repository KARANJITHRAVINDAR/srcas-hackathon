package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findByEntityIdOrderByTimestampAsc(UUID entityId);
    Optional<AuditLog> findTopByOrderByTimestampDesc();
}
