package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "ticket_reviews")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TicketReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    @JsonIgnore
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by_org_user_id", nullable = false)
    private User reviewedByOrgUser;

    @Enumerated(EnumType.STRING)
    private TicketReviewDecision decision;

    @Column(columnDefinition = "TEXT")
    private String comment;

    private LocalDateTime reviewedAt;

    @PrePersist
    protected void onCreate() {
        this.reviewedAt = LocalDateTime.now();
    }

    public enum TicketReviewDecision {
        ACCEPT, REQUEST_CLARIFICATION, REJECT
    }
}
