package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "impact_metrics")
public class ImpactMetric {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String metricName;

    private BigDecimal targetValue;

    private BigDecimal reportedValue;

    private BigDecimal verifiedValue;

    private String unit;

    private String lastUpdatedFrom;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (reportedValue == null) reportedValue = BigDecimal.ZERO;
        if (verifiedValue == null) verifiedValue = BigDecimal.ZERO;
        if (targetValue == null) targetValue = BigDecimal.ZERO;
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
