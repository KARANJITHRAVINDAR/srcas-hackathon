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

    @Enumerated(EnumType.STRING)
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

    public enum MilestoneStatus {
        // Pre-commitment lifecycle
        PENDING,
        MODIFIED,          // Org has an open change request on this milestone
        LOCKED,            // Both sides have accepted — budget is frozen
        // Post-commitment lifecycle (existing + extended)
        IN_PROGRESS,
        EVIDENCE_SUBMITTED,
        TICKET_RAISED,
        UNDER_REVIEW,
        ACCEPTED,
        REJECTED,
        DISBURSED,
        CLOSED,
        // Legacy statuses (kept for backward-compat with existing data)
        IN_REVIEW,
        VERIFIED
    }
}
