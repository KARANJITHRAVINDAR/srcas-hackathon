package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "beneficiary_form_responses")
public class BeneficiaryFormResponse {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    @JsonIgnore
    private BeneficiaryVerificationForm form;

    private String responseToken; // To prevent duplicates from same device/session
    private LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    private OverallResponse overallResponse;

    private Integer rating;
    
    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Enumerated(EnumType.STRING)
    private ResponseStatus status;

    @OneToMany(mappedBy = "response", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BeneficiaryFormAnswer> answers;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
        if (status == null) {
            status = ResponseStatus.VALID;
        }
    }

    public enum OverallResponse {
        YES, NO, PENDING
    }

    public enum ResponseStatus {
        VALID, REQUIRES_REVIEW, REJECTED
    }
}
