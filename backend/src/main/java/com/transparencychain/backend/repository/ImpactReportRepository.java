package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ImpactReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ImpactReportRepository extends JpaRepository<ImpactReport, UUID> {
    List<ImpactReport> findByKpiIdOrderBySubmittedAtDesc(UUID kpiId);

    @Query("SELECT r FROM ImpactReport r WHERE (r.project.id = :projectId OR (r.kpi IS NOT NULL AND r.kpi.project.id = :projectId)) ORDER BY r.submittedAt DESC")
    List<ImpactReport> findByProjectId(@Param("projectId") UUID projectId);
}
