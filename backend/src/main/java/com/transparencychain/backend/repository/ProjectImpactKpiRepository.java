package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ProjectImpactKpi;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProjectImpactKpiRepository extends JpaRepository<ProjectImpactKpi, UUID> {
    List<ProjectImpactKpi> findByProjectId(UUID projectId);
}
