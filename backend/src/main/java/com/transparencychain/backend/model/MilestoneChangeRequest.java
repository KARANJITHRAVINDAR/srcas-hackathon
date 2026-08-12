package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A formal change proposal from an organisation (funder) on a single milestone.
 *
 * State machine:
 *   PENDING -> ACCEPTED   (NGO accepts the proposed version as-is)
 *   PENDING -> COUNTERED  (NGO submits a counter-proposal, creating a new MilestoneVersion authored by NGO)
 *   PENDING -> REJECTED   (NGO rejects outright — negotiation ends, original version stands)
 *
 * Design note (spec §3 key decision):
 *   An org's edit is NEVER a direct write to the milestone.
 *   It is always this record + a MilestoneVersion row.
 *   The milestone's currentVersionId is only updated when this request reaches ACCEPTED.
 */
@Data
@Entity
@Table(name = "milestone_change_requests")
public class MilestoneChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    /** The funder organisation that raised this change request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_org_id", nullable = false)
    private FunderProfile requestedByOrg;

    /** Snapshot of what the milestone looked like before this change was proposed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_version_id", nullable = false)
    private MilestoneVersion originalVersion;

    /** The funder's proposed new values — a new MilestoneVersion row authored by FUNDER. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_version_id", nullable = false)
    private MilestoneVersion proposedVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChangeRequestStatus status = ChangeRequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String ngoResponseNote;

    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ChangeRequestStatus {
        PENDING,
        ACCEPTED,
        COUNTERED,   // NGO submitted a counter-proposal (a new MilestoneVersion by NGO was created)
        REJECTED,
        WITHDRAWN    // Org withdrew before NGO responded
    }
}
