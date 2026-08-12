package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.OrgProjectEngagement;
import com.transparencychain.backend.model.Project;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lightweight card used in the Project Marketplace listing view.
 * Omits milestone detail and full trust breakdown for performance.
 */
@Data
public class ProjectCardDto {

    private UUID projectId;
    private String title;
    private String description;
    private Project.SdgGoal sdgGoal;
    private BigDecimal totalBudget;
    private String geography;
    private Integer expectedBeneficiaries;
    private Project.ProjectStatus projectStatus;
    private LocalDateTime createdAt;

    // NGO summary
    private UUID ngoProfileId;
    private String ngoOrgName;
    private BigDecimal ngoTrustScore;
    private String ngoVerificationStatus;

    // Engagement status for the calling org (null if not yet discovered)
    private OrgProjectEngagement.EngagementStatus engagementStatus;
}
