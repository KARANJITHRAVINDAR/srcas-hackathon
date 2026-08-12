package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

@Data
@Entity
@Table(name = "milestone_tasks")
public class MilestoneTask {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    @JsonIgnore
    private Milestone milestone;

    @Column(nullable = false)
    private String taskName;

    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "required_evidence_type")
    private String requiredEvidenceType;

    @Column(columnDefinition = "TEXT")
    private String requiredEvidence;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private TaskStatus status;

    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = TaskStatus.PENDING;
        }
    }

    public enum TaskStatus {
        PENDING, PROOF_SUBMITTED, UNDER_VALIDATION, COMPLETED, REJECTED, CHANGES_REQUIRED
    }
}
