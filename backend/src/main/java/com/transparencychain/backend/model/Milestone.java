package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "milestones")
public class Milestone {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal amountAllocated;

    @Column(precision = 15, scale = 2)
    private BigDecimal releasedAmount = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal additionalAllocatedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private MilestoneStatus status;

    private java.time.LocalDate dueDate;
    
    @Column(columnDefinition = "TEXT")
    private String requiredEvidence;
    
    @Column(columnDefinition = "TEXT")
    private String verificationRequirements;

    public enum MilestoneStatus {
        LOCKED, AVAILABLE, IN_PROGRESS, READY_FOR_APPROVAL, AWAITING_FUNDER_APPROVAL, CHANGES_REQUIRED, COMPLETED, REJECTED
    }
}
