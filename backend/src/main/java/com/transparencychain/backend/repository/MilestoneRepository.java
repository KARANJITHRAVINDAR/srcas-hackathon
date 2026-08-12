package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {
    List<Milestone> findByProjectId(UUID projectId);
    List<Milestone> findByProjectIdOrderByDueDateAsc(UUID projectId);
}
