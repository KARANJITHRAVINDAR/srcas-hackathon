package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.OrgProjectEngagement;
import com.transparencychain.backend.model.Project;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full project detail response for the org's Project Detail screen.
 * Combines project metadata, complete location information, the NGO trust profile panel, and the milestone list.
 */
@Data
public class ProjectDetailDto {

    // Project fields
    private UUID projectId;
    private String title;
    private String description;
    private Project.SdgGoal sdgGoal;
    private String sdgTarget;
    private BigDecimal totalBudget;
    private String geography;
    private Double latitude;
    private Double longitude;

    // Location metadata
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
    private Project.LocationStatus locationStatus;
    private String locationBlockchainHash;

    private String projectDuration;
    private String impactKpi;
    private Integer expectedBeneficiaries;
    private Project.ProjectStatus status;
    private LocalDateTime createdAt;

    // Engagement state for the requesting org
    private OrgProjectEngagement.EngagementStatus engagementStatus;
    private UUID engagementId;
    private LocalDateTime withdrawnAt;
    private UUID withdrawnBy;
    private String withdrawalReason;
    private String withdrawnFunderName;
    private OrgProjectEngagement.RemodifyStatus remodifyStatus;

    // NGO trust profile (multi-dimensional panel)
    private NgoTrustProfileDto ngoTrustProfile;

    // Milestones as proposed by NGO
    private List<MilestoneSummaryDto> milestones;
}
