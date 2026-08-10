package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "fraud_checks")
public class FraudCheck {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proof_id", nullable = false)
    private ProofSubmission proof;

    private Double overallConfidenceScore;

    @Column(columnDefinition = "TEXT")
    private String aiAnalysisResult; // JSON containing specifics like "Invoice amounts match: Yes", "Geo-tag spoofed: No"

    private Boolean isFraudulent;

    private LocalDateTime checkedAt;

    @PrePersist
    protected void onCreate() {
        checkedAt = LocalDateTime.now();
    }
}
