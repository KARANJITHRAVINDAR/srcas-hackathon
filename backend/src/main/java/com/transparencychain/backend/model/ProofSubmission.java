package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "proof_submissions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ProofSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id") // changed to nullable = true since it could be tied to a task directly instead of milestone directly, though wait, we can just keep milestone_id and add task_id.
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_task_id")
    private MilestoneTask milestoneTask;

    @Column(nullable = false)
    private String fileUrl; // URL to S3/IPFS

    private String fileType; // e.g., image/jpeg, application/pdf

    private String metadata; // e.g., JSON containing EXIF data, geo-tags

    @Enumerated(EnumType.STRING)
    private ProofStatus status;
    
    @OneToOne(mappedBy = "proof", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private EvidenceAnalysis evidenceAnalysis;

    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }

    public enum ProofStatus {
        PENDING_AI_CHECK, AI_VERIFIED, AI_FLAGGED, MANUALLY_OVERRIDDEN
    }
}
