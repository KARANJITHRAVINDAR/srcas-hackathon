package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks the engagement of a funding organisation with a specific NGO project.
 * Enforces the state machine:
 *   DISCOVERED -> UNDER_REVIEW -> NEGOTIATING -> COMMITTED -> ACTIVE -> COMPLETED
 *   WITHDRAWN is reachable from any pre-COMMITTED state.
 */
@Data
@Entity
@Table(name = "org_project_engagements",
       uniqueConstraints = @UniqueConstraint(columnNames = {"funder_id", "project_id"}))
public class OrgProjectEngagement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funder_id", nullable = false)
    private FunderProfile funder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EngagementStatus status = EngagementStatus.DISCOVERED;

    private LocalDateTime viewedAt;
    private LocalDateTime committedAt;

    private LocalDateTime withdrawnAt;
    private UUID withdrawnBy;

    @Column(columnDefinition = "TEXT")
    private String withdrawalReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemodifyStatus remodifyStatus = RemodifyStatus.NONE;

    @PrePersist
    protected void onCreate() {
        if (viewedAt == null) {
            viewedAt = LocalDateTime.now();
        }
        if (remodifyStatus == null) {
            remodifyStatus = RemodifyStatus.NONE;
        }
    }

    public enum EngagementStatus {
        DISCOVERED,
        UNDER_REVIEW,
        NEGOTIATING,
        COMMITTED,
        ACTIVE,
        COMPLETED,
        WITHDRAWN
    }

    public enum RemodifyStatus {
        NONE,
        PENDING_REMODIFICATION,
        RESUBMITTED
    }
}
