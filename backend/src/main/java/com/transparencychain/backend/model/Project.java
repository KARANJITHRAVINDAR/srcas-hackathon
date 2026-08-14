package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Entity
@Table(name = "projects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "funder_id")
    @JsonIgnore
    private FunderProfile funder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id")
    @JsonIgnore
    private NgoProfile ngo;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    private SdgGoal sdgGoal;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalBudget;

    private String geography;

    // Authoritative geographic coordinates
    private Double latitude;
    private Double longitude;

    // Complete human-readable location metadata
    @Column(columnDefinition = "TEXT")
    private String displayAddress;

    private String locationName;
    private String road;
    private String neighbourhood;
    private String suburb;
    private String locality;
    private String city;
    private String district;
    private String state;
    private String postcode;
    private String country;
    private String countryCode;
    private String geocodingProvider;
    private LocalDateTime geocodedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_status")
    private LocationStatus locationStatus = LocationStatus.UNVERIFIED;

    @Column(columnDefinition = "VARCHAR(255)")
    private String locationBlockchainHash;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "VARCHAR(255)")
    private ProjectStatus status;

    private String sdgTarget;
    private String projectDuration;
    private String impactKpi;
    private Integer expectedBeneficiaries;

    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (locationStatus == null) {
            locationStatus = LocationStatus.UNVERIFIED;
        }
    }

    public enum LocationStatus {
        UNVERIFIED,
        USER_CONFIRMED,
        VERIFIED,
        FLAGGED
    }

    public enum SdgGoal {
        SDG1, SDG2, SDG3, SDG4, SDG5, SDG6, SDG7, SDG8, SDG9, SDG10, SDG11, SDG12, SDG13, SDG14, SDG15, SDG16, SDG17
    }

    public enum ProjectStatus {
        DRAFT, PUBLISHED, SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, APPROVED, REJECTED, FUNDED, ESCROWED, ACTIVE, IN_PROGRESS, PAUSED, COMPLETED, CLOSED, FLAGGED, CANCELLED
    }
}
