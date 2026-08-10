package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "proof_submissions")
public class ProofSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @Column(nullable = false)
    private String fileUrl; // URL to S3/IPFS

    private String fileType; // e.g., image/jpeg, application/pdf

    private String metadata; // e.g., JSON containing EXIF data, geo-tags

    @Enumerated(EnumType.STRING)
    private ProofStatus status;
    
    @OneToOne(mappedBy = "proof", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private FraudCheck fraudCheck;

    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }

    public enum ProofStatus {
        PENDING_AI_CHECK, AI_VERIFIED, AI_FLAGGED, MANUALLY_OVERRIDDEN
    }
}
