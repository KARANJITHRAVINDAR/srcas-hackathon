package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.NgoProfile;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Multi-dimensional NGO trust profile surfaced to org users in the Project Detail view.
 * Not a single flat score — each dimension is shown separately per the spec.
 */
@Data
public class NgoTrustProfileDto {

    private UUID ngoProfileId;
    private String orgName;
    private String darpanId;
    private String panNumber;
    private NgoProfile.RegistrationType registrationType;
    private String registrationNumber;
    private String registeredAddress;
    private String contactEmail;
    private String website;

    // Verification
    private NgoProfile.VerificationStatus verificationStatus;
    private LocalDateTime verifiedAt;

    // Trust dimensions (multi-dimensional, not a single number)
    private BigDecimal overallTrustScore;
    private int registrationAgeScore;          // 0–15
    private int documentCompletenessScore;     // 0–20
    private int pastProjectsOnTimeScore;       // 0–25
    private int avgFraudScoreOnBillsScore;     // 0–25
    private int beneficiaryConfirmationRate;   // 0–15

    // Operational context
    private String focusSdgGoals;   // JSON array string
    private String operationalStates;

    // Compliance flags
    private boolean has80G;
    private boolean has12A;
    private boolean hasFcra;
    private boolean hasCsr1;
}
