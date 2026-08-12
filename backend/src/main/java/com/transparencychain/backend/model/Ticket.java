package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "tickets")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "raised_by_ngo_id", nullable = false)
    private User raisedByNgo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "evidence_id", nullable = false)
    private ProofSubmission evidence;

    @Column(precision = 5, scale = 2)
    private BigDecimal riskScore;

    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel;

    @Enumerated(EnumType.STRING)
    private TicketStatus status;

    private LocalDateTime raisedAt;
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        this.raisedAt = LocalDateTime.now();
    }

    public enum RiskLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum TicketStatus {
        OPEN, UNDER_ORG_REVIEW, CLARIFICATION_REQUESTED, ACCEPTED, REJECTED, ESCALATED
    }
}
