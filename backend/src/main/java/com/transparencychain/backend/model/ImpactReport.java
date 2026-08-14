package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "impact_reports")
public class ImpactReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = true)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = true)
    private ProjectImpactKpi kpi;

    private String kpiName;

    private String reportingPeriod;
    
    private Double reportedValue;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String supportingEvidence; // URL or ID of evidence

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    private LocalDateTime submittedAt;
    
    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) submittedAt = LocalDateTime.now();
        if (status == null) status = ReportStatus.VERIFIED;
    }

    public enum ReportStatus {
        PENDING, PARTIALLY_VERIFIED, VERIFIED, REQUIRES_REVIEW, REJECTED
    }
}
