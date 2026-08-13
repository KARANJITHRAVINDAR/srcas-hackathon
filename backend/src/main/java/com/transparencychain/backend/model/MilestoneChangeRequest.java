package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A formal change proposal on a single milestone.
 * Can be initiated by EITHER an organisation (funder) OR the NGO — supporting
 * bidirectional negotiation per the master project flow.
 *
 * State machine:
 *   PENDING -> ACCEPTED   (other party accepts the proposed version as-is)
 *   PENDING -> COUNTERED  (other party submits a counter-proposal)
 *   PENDING -> REJECTED   (other party rejects outright — original version stands)
 *   PENDING -> WITHDRAWN  (initiator withdraws before other party responds)
 *
 * Invariant: exactly one of requestedByOrg / requestedByNgo is non-null.
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

    /** The funder organisation that raised this change request (null if NGO-initiated). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_org_id")
    private FunderProfile requestedByOrg;

    /** The NGO that raised this change request (null if funder-initiated). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_ngo_id")
    private NgoProfile requestedByNgo;

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
