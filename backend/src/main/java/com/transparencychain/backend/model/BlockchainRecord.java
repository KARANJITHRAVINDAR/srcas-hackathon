package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "blockchain_records")
public class BlockchainRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id")
    private String projectId;

    @Column(name = "milestone_id")
    private String milestoneId;

    @Column(name = "evidence_hash")
    private String evidenceHash;

    @Column(name = "verification_result")
    private String verificationResult;

    @Column(name = "verifier_id")
    private String verifierId;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "disbursement_reference")
    private String disbursementReference;

    @Column(name = "transaction_hash")
    private String transactionHash;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
