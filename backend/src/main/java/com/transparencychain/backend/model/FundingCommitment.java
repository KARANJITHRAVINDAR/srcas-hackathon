package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "funding_commitments")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FundingCommitment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funder_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user", "projects"})
    private FunderProfile funder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "funder", "ngo"})
    private Project project;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal totalCommittedAmount;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "funding_commitment_id")
    private List<FundingMilestoneCommitment> committedMilestoneBreakdown;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FundingCommitmentStatus status = FundingCommitmentStatus.PENDING;

    private boolean budgetExceededWarning = false;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum FundingCommitmentStatus {
        PENDING, ACTIVE, PARTIALLY_RELEASED, FULLY_RELEASED, CANCELLED
    }
}
