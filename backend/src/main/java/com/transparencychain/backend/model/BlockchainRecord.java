package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persists a record of every blockchain interaction to MySQL.
 * Mirrors the on-chain state for fast querying without RPC calls.
 *
 * SECURITY: Private key is NEVER stored here. Only public cryptographic commitments.
 */
@Data
@Entity
@Table(name = "blockchain_records")
public class BlockchainRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Project and milestone identifiers
    @Column(name = "project_id")
    private String projectId;

    @Column(name = "milestone_id")
    private String milestoneId;

    // Cryptographic commitment — Merkle root of verified evidence hashes
    @Column(name = "merkle_root", length = 66)
    private String merkleRoot;

    // Individual evidence hash (legacy — for single-evidence anchoring)
    @Column(name = "evidence_hash")
    private String evidenceHash;

    // Number of verified evidence files included in this Merkle tree
    @Column(name = "evidence_count")
    private Integer evidenceCount;

    // Blockchain transaction details
    @Column(name = "transaction_hash", length = 66)
    private String transactionHash;

    @Column(name = "block_number")
    private Long blockNumber;

    @Column(name = "contract_address", length = 42)
    private String contractAddress;

    // Network metadata
    @Column(name = "network")
    private String network; // "Polygon Amoy"

    @Column(name = "chain_id")
    private Long chainId; // 80002

    // Confirmation state
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BlockchainStatus status = BlockchainStatus.PENDING;

    // Legacy verification fields (kept for backward compatibility)
    @Column(name = "verification_result")
    private String verificationResult;

    @Column(name = "verifier_id")
    private String verifierId;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type")
    private RecordType recordType = RecordType.EVIDENCE_MERKLE_ROOT;

    @Column(name = "disbursement_amount")
    private java.math.BigDecimal disbursementAmount;

    @Column(name = "disbursement_reference")
    private String disbursementReference;

    @Column(name = "created_at")
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (network == null) {
            network = "Polygon Amoy";
        }
        if (chainId == null) {
            chainId = 80002L;
        }
    }

    public enum BlockchainStatus {
        /** Transaction submitted — hash received but not yet confirmed */
        PENDING,
        /** Transaction confirmed with required block confirmations */
        CONFIRMED,
        /** Transaction reverted or failed on-chain */
        FAILED,
        /** Used for locally simulated records when contract not yet deployed */
        SIMULATED,
        /** Pending retry after network failure */
        PENDING_ANCHOR
    }

    public enum RecordType {
        EVIDENCE_MERKLE_ROOT,
        DISBURSEMENT_ANCHOR,
        ESCROW_DEPLOYED,
        LOCATION_SURVEY
    }
}
