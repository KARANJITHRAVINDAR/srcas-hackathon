package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "expenses")
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    @JsonIgnore
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id", nullable = false)
    @JsonIgnore
    private NgoProfile ngo;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private ExpenseCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String vendorName;
    private String invoiceNumber;
    private String expenseDate;

    @Column(precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private ExpenseStatus status;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "evidence_id")
    @JsonIgnore
    private ProofSubmission evidence;

    private Integer aiRiskScore;
    private String aiRiskLevel;
    private Boolean ocrProcessed = false;

    private LocalDateTime submittedAt;
    private LocalDateTime verifiedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ExpenseStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ExpenseStatus {
        DRAFT, SUBMITTED, PROCESSING, AI_REVIEW, PENDING_VERIFICATION, VERIFIED, FLAGGED, REJECTED
    }

    public enum ExpenseCategory {
        CONSTRUCTION_MATERIALS, EQUIPMENT, TRANSPORTATION, LABOUR, TRAINING, FOOD, MEDICAL_SUPPLIES, ADMINISTRATIVE, OTHER
    }
}
