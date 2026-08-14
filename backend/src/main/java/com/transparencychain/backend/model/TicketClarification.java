package com.transparencychain.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "ticket_clarifications")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TicketClarification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    @JsonIgnore
    private Ticket ticket;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String funderQuery;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "funder_user_id", nullable = false)
    private User funderUser;

    private LocalDateTime queryCreatedAt;

    @Column(columnDefinition = "TEXT")
    private String ngoAnswer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ngo_evidence_id")
    private ProofSubmission ngoEvidence;

    private LocalDateTime answeredAt;

    @Enumerated(EnumType.STRING)
    private ClarificationStatus status;

    @PrePersist
    protected void onCreate() {
        if (queryCreatedAt == null) {
            queryCreatedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ClarificationStatus.PENDING_RESPONSE;
        }
    }

    public enum ClarificationStatus {
        PENDING_RESPONSE,
        ANSWERED
    }
}
