package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "generated_by", nullable = false)
    private UUID generatedBy;

    @Column(name = "report_file_url", nullable = false)
    private String reportFileUrl;

    @Column(name = "report_content_hash", nullable = false)
    private String reportContentHash;

    @Column(name = "signature", nullable = false, length = 1000)
    private String signature;

    @Column(name = "signer_wallet_address", nullable = false)
    private String signerWalletAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "onchain_verification_status", nullable = false)
    private OnChainVerificationStatus onchainVerificationStatus;

    @Column(name = "mismatch_details", columnDefinition = "LONGTEXT")
    private String mismatchDetails;

    @Column(name = "report_version", nullable = false)
    private Integer reportVersion;

    public enum OnChainVerificationStatus {
        ALL_VERIFIED,
        MISMATCH_FOUND
    }
}
