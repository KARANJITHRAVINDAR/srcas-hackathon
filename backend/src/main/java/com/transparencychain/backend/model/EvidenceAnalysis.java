package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "evidence_analysis")
public class EvidenceAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evidence_id", nullable = false)
    private ProofSubmission proof;

    private String vendorName;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String gstin;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal invoiceAmount;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal taxAmount;

    private Integer ocrConfidence;
    private Integer duplicateScore;
    private Integer priceAnomalyScore;
    private Integer vendorRiskScore;
    private Integer documentQualityScore;
    private Integer fraudScore;

    @Enumerated(EnumType.STRING)
    private EvidenceAnalysisResult result;

    @Column(columnDefinition = "TEXT")
    private String analysisDetails; // JSON containing specifics

    @Column(columnDefinition = "TEXT")
    private String rawOcrText;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
