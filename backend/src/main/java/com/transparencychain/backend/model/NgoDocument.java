package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "ngo_documents")
public class NgoDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_profile_id", nullable = false)
    private NgoProfile ngoProfile;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType documentType;

    @Column(nullable = false)
    private String ipfsCid;

    private String sha256Hash;
    private String fileName;

    @Enumerated(EnumType.STRING)
    private VerifiedStatus verifiedStatus = VerifiedStatus.PENDING;

    private String verifiedBy;
    private LocalDateTime verifiedAt;

    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }

    public enum DocumentType {
        TRUST_DEED, REG_CERTIFICATE, DARPAN_CERT, CSR1_ACK, TAX_12A, TAX_80G,
        FCRA_CERT, GST_CERT, PAN_CARD, AUDITED_FINANCIALS, ANNUAL_REPORT,
        CANCELLED_CHEQUE, BOARD_RESOLUTION
    }

    public enum VerifiedStatus {
        PENDING, VERIFIED, REJECTED
    }
}
