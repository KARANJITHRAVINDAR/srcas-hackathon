package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "impact_reports")
public class ImpactReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = false)
    private ProjectImpactKpi kpi;

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
        submittedAt = LocalDateTime.now();
        if(status == null) status = ReportStatus.PENDING;
    }

    public enum ReportStatus {
        PENDING, PARTIALLY_VERIFIED, VERIFIED, REQUIRES_REVIEW, REJECTED
    }
}
