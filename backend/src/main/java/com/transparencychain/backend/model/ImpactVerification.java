package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "impact_verifications")
public class ImpactVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "impact_report_id", nullable = false)
    private ImpactReport impactReport;

    private Double verifiedValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VerificationMethod verificationMethod;

    private UUID verifiedBy; // ID of Auditor, System, etc.
    
    @Column(columnDefinition = "TEXT")
    private String comments;

    private LocalDateTime verifiedAt;

    @PrePersist
    protected void onCreate() {
        verifiedAt = LocalDateTime.now();
    }

    public enum VerificationMethod {
        FIELD_OFFICER, AUDITOR, BENEFICIARY, SYSTEM, EVIDENCE
    }
}
