package com.transparencychain.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "notifications")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_type", nullable = false)
    private RecipientType recipientType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "milestone_id")
    private Milestone milestone;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private NotificationEventType eventType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "link_to")
    private String linkTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "read_status", nullable = false)
    private ReadStatus readStatus;

    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.readStatus == null) {
            this.readStatus = ReadStatus.UNREAD;
        }
    }

    public enum RecipientType {
        NGO, FUNDER
    }

    public enum ReadStatus {
        UNREAD, READ
    }

    public enum NotificationEventType {
        PROJECT_UNDER_REVIEW,
        CHANGE_REQUEST_PROPOSED,
        CHANGE_REQUEST_RESPONDED,
        FUNDING_COMMITTED,
        EVIDENCE_SUBMITTED,
        AI_VERIFICATION_COMPLETED,
        AUDITOR_REVIEW_REQUIRED,
        CLARIFICATION_REQUESTED,
        CLARIFICATION_RESPONDED,
        FUNDS_RELEASED,
        MILESTONE_COMPLETED,
        BENEFICIARY_FEEDBACK_SUBMITTED,
        PROJECT_COMPLETED,
        FUNDING_CANCELLED,
        PROJECT_WITHDRAWN,
        CLOSURE_VIDEO_SUBMITTED,
        CLOSURE_VIDEO_VERIFIED,
        CLOSURE_VIDEO_REJECTED,
        PROJECT_CLOSURE_ELIGIBLE
    }
}
