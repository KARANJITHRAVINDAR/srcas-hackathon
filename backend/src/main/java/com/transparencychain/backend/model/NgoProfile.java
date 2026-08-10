package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "ngo_profiles")
public class NgoProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String orgName;
    private String darpanId;
    private String panNumber;
    
    @Enumerated(EnumType.STRING)
    private RegistrationType registrationType;
    
    private String registrationNumber;
    private String csr1RegistrationNumber;
    private String reg12aNumber;
    private String reg80gNumber;
    private String fcraNumber;
    private String gstin;
    
    private LocalDateTime dateOfEstablishment;
    private String registeredAddress;
    
    @Column(columnDefinition = "TEXT")
    private String operationalStates; // JSON array
    
    @Column(columnDefinition = "TEXT")
    private String focusSdgGoals; // JSON array
    
    private String bankAccountName;
    
    @Convert(converter = com.transparencychain.backend.security.AttributeEncryptor.class)
    private String bankAccountNumberEncrypted;
    
    private String ifscCode;
    
    private String authorizedSignatoryName;
    private String authorizedSignatoryDesignation;
    private String authorizedSignatoryPan;
    
    private String auditorName;
    private String auditorMembershipNumber;
    
    private String contactEmail;
    private String contactPhone;
    private String website;

    @Enumerated(EnumType.STRING)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;
    
    @Column(precision = 5, scale = 2)
    private BigDecimal trustScore = BigDecimal.ZERO;

    private Double latitude;
    private Double longitude;

    private LocalDateTime verifiedAt;

    public enum RegistrationType {
        TRUST, SOCIETY, SECTION_8
    }

    public enum VerificationStatus {
        PENDING, UNDER_REVIEW, VERIFIED, REJECTED
    }
}
