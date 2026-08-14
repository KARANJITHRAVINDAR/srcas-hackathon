package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.Project;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProjectRequest {
    private String title;
    private Project.SdgGoal sdgGoal;
    private String description;
    private BigDecimal totalBudget;
    private String geography;
    private Double latitude;
    private Double longitude;
    
    // Complete location metadata
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
    private Project.LocationStatus locationStatus;
    private String locationBlockchainHash;

    // Project metadata fields
    private String sdgTarget;
    private String projectDuration;
    private String impactKpi;
    private Integer expectedBeneficiaries;
    
    private java.util.UUID ngoId;
    private java.util.UUID funderId;
    private java.util.List<MilestoneRequest> milestones;
}
