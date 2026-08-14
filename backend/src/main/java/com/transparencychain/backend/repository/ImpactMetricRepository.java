package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ImpactMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ImpactMetricRepository extends JpaRepository<ImpactMetric, UUID> {
    List<ImpactMetric> findByProjectId(UUID projectId);
}
