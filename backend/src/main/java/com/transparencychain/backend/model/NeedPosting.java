package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "need_postings")
public class NeedPosting {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id", nullable = false)
    private NgoProfile ngo;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    private Project.SdgGoal sdgGoal;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal estimatedBudgetMin;

    @Column(precision = 15, scale = 2)
    private BigDecimal estimatedBudgetMax;

    private String category;
    private Integer targetBeneficiaries;
    
    private String geographyVillage;
    private String geographyDistrict;
    private String geographyState;
    
    @Enumerated(EnumType.STRING)
    private UrgencyLevel urgencyLevel;

    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    private NeedStatus status;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum NeedStatus {
        OPEN, MATCHED, CLOSED
    }

    public enum UrgencyLevel {
        LOW, MEDIUM, HIGH
    }
}
