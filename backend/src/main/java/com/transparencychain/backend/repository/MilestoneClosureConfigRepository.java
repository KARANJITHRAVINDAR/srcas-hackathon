package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.MilestoneClosureConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface MilestoneClosureConfigRepository extends JpaRepository<MilestoneClosureConfig, UUID> {
    Optional<MilestoneClosureConfig> findByProjectId(UUID projectId);
}
