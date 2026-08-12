package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "projects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funder_id", nullable = true)
    @JsonIgnore
    private FunderProfile funder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id")
    @JsonIgnore
    private NgoProfile ngo;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    private SdgGoal sdgGoal;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalBudget;

    private String geography;
    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    private ProjectStatus status;

    private String sdgTarget;
    private String projectDuration;
    private String impactKpi;
    private Integer expectedBeneficiaries;

    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum SdgGoal {
        SDG1, SDG2, SDG3, SDG4, SDG5, SDG6, SDG7, SDG8, SDG9, SDG10, SDG11, SDG12, SDG13, SDG14, SDG15, SDG16, SDG17
    }

    public enum ProjectStatus {
        DRAFT, PUBLISHED, ESCROWED, IN_PROGRESS, COMPLETED, FLAGGED, CANCELLED
    }
}
