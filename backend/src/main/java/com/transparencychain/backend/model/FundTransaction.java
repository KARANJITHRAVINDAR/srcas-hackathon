package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "fund_transactions")
public class FundTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id") // Can be null if it's a project-level adjustment
    private Milestone milestone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    private String reference; // Transaction hash or receipt ID

    private LocalDateTime transactionDate;

    @PrePersist
    protected void onCreate() {
        if (transactionDate == null) {
            transactionDate = LocalDateTime.now();
        }
    }

    public enum TransactionType {
        MILESTONE_ALLOCATION,
        MILESTONE_RELEASE,
        ADDITIONAL_FUND_REQUEST,
        ADDITIONAL_FUND_APPROVAL,
        ADDITIONAL_FUND_RELEASE,
        FUND_ADJUSTMENT,
        FUND_REFUND
    }

    public enum TransactionStatus {
        PENDING, REQUESTED, APPROVED, REJECTED, RELEASED, ALLOCATED, COMPLETED, FAILED
    }
}
