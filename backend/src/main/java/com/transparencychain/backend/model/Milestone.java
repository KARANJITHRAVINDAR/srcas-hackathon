package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "milestones")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    private Integer sequenceNumber;

    @Column(columnDefinition = "TEXT")
    private String requiredEvidence;

    @Column(columnDefinition = "TEXT")
    private String verificationRequirements;

    /**
     * Points to the currently accepted/active MilestoneVersion for this milestone.
     * Null until the first MilestoneVersion is created (i.e., while the milestone
     * is still in its initial NGO-authored state from bulk creation).
     *
     * This is a plain UUID column (not a FK relation) to avoid circular dependency
     * between Milestone <-> MilestoneVersion during JPA persistence.
     */
    private UUID currentVersionId;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(50)")
    private MilestoneType milestoneType = MilestoneType.STANDARD;

    public enum MilestoneType {
        STANDARD, CLOSURE
    }

    public boolean isClosure() {
        return milestoneType == MilestoneType.CLOSURE;
    }

    public enum MilestoneStatus {
        PENDING, MODIFIED, LOCKED, AVAILABLE, IN_PROGRESS, EVIDENCE_SUBMITTED, TICKET_RAISED, UNDER_REVIEW, READY_FOR_APPROVAL, AWAITING_FUNDER_APPROVAL, CHANGES_REQUIRED, ACCEPTED, REJECTED, DISBURSED, CLOSED, IN_REVIEW, VERIFIED, COMPLETED
    }
}
