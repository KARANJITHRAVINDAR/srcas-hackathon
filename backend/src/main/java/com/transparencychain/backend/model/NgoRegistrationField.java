package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ngo_registration_fields")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NgoRegistrationField {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "source_document_type")
    private String sourceDocumentType;

    @Column(name = "extracted_values", columnDefinition = "TEXT")
    private String extractedValues; // JSON candidate values with source docs

    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_status", nullable = false)
    private FieldStatus fieldStatus = FieldStatus.VERIFIED;

    @Column(name = "final_value", columnDefinition = "TEXT")
    private String finalValue;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum FieldStatus {
        VERIFIED,
        CONFLICTING,
        LOW_CONFIDENCE,
        SUSPECTED_FABRICATED,
        UNVERIFIED_MANUAL_ENTRY
    }
}
