package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "funder_profiles")
public class FunderProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private FunderType orgType;

    private String orgName;
    private String cinNumber;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalDonated = BigDecimal.ZERO;

    public enum FunderType {
        COMPANY, GOVT, INDIVIDUAL
    }
}
