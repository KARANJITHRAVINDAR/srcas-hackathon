package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "milestone_closure_config")
public class MilestoneClosureConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "min_coverage_rate", precision = 7, scale = 4, nullable = false)
    private BigDecimal minCoverageRate = new BigDecimal("0.1000"); // 10% (0.10)

    @Column(name = "min_sample_size", nullable = false)
    private Integer minSampleSize = 10; // 10 unique responses floor

    @Column(name = "min_positive_rate", precision = 7, scale = 4, nullable = false)
    private BigDecimal minPositiveRate = new BigDecimal("0.8000"); // 80% (0.80) positive sentiment required

    @Column(nullable = false)
    private Boolean includeNeutralInDenominator = true;

    private UUID projectId; // Nullable for global defaults, or specific to a project snapshot
}
