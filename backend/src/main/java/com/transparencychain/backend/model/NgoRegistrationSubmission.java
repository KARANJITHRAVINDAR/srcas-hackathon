package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ngo_registration_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NgoRegistrationSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ngo_applicant_id", nullable = false)
    private UUID ngoApplicantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status = SubmissionStatus.PENDING;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "completeness_score")
    private Double completenessScore;

    @Column(name = "ocr_confidence_score")
    private Double ocrConfidenceScore;

    @Column(name = "consistency_score")
    private Double consistencyScore;

    @Column(name = "authenticity_score")
    private Double authenticityScore;

    @Column(name = "has_bank_account", nullable = false)
    private Boolean hasBankAccount = true;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    public enum SubmissionStatus {
        PENDING,
        VERIFIED,
        REJECTED_LOW_SCORE,
        RESUBMITTED
    }
}
