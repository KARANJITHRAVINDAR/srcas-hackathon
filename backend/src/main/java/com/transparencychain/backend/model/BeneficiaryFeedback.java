package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "beneficiary_feedback")
public class BeneficiaryFeedback {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    private String videoUrl;

    private String audioUrl;

    @Column(columnDefinition = "TEXT")
    private String feedbackText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackStatus status;

    private String reviewerNotes;

    private LocalDateTime reviewedAt;

    private LocalDateTime submittedAt;

    public enum FeedbackStatus {
        PENDING,
        CONFIRMED,
        DISPUTED
    }

    @PrePersist
    protected void onCreate() {
        if (status == null) status = FeedbackStatus.PENDING;
        submittedAt = LocalDateTime.now();
    }
}
