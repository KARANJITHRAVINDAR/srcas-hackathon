package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "beneficiary_verification_forms")
public class BeneficiaryVerificationForm {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnore
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id")
    @JsonIgnore
    private Milestone milestone;

    private int version = 1;
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private FormStatus status;

    @Column(unique = true)
    private String shareToken;

    private int targetResponses;
    private int minimumResponsePercentage;
    private int minimumPositivePercentage;

    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
    private LocalDateTime closedAt;

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BeneficiaryFormQuestion> questions;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (shareToken == null) {
            shareToken = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        }
    }

    public enum FormStatus {
        DRAFT, ACTIVE, PAUSED, CLOSED
    }
}
