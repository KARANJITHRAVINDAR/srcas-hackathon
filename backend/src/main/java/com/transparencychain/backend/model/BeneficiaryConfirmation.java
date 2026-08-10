package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "beneficiary_confirmations")
public class BeneficiaryConfirmation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "milestone_id", nullable = false)
    private Milestone milestone;

    private String phoneNumberHash; // Privacy-preserving hash of beneficiary phone number
    
    private Boolean isConfirmed; // True if they pressed 1 on IVRS
    
    private String feedbackAudioUrl; // Mock URL
    
    private LocalDateTime calledAt;

    @PrePersist
    protected void onCreate() {
        calledAt = LocalDateTime.now();
    }
}
