package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An immutable, versioned snapshot of a milestone's scope, cost, and schedule.
 *
 * Design rule (from spec §3):
 *   Never mutate milestones.amountAllocated directly once a project is committed.
 *   Always insert a new MilestoneVersion and update Milestone.currentVersionId.
 *
 * proposed_by tracks whether this version was authored by the NGO or the Funder,
 * giving a full negotiation history for audit purposes.
 */
@Data
@Entity
@Table(name = "milestone_versions")
public class MilestoneVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @Column(nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProposedBy proposedBy;

    // The proposed field values (any may change from the previous version)
    private String name;

    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    private Integer sequence;
    private LocalDate dueDate;

    @Column(columnDefinition = "TEXT")
    private String changeReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VersionStatus status = VersionStatus.PROPOSED;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ProposedBy {
        NGO, FUNDER
    }

    public enum VersionStatus {
        PROPOSED,
        ACCEPTED,
        REJECTED,
        SUPERSEDED   // A newer version has been submitted, this one is no longer active
    }
}
