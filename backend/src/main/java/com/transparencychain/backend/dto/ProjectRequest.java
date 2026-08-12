package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.Project;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProjectRequest {
    private String title;
    private Project.SdgGoal sdgGoal;
    private String description;
    private BigDecimal totalBudget;
    private String geography;
    private Double latitude;
    private Double longitude;
    
    // New fields
    private String sdgTarget;
    private String projectDuration;
    private String impactKpi;
    private Integer expectedBeneficiaries;
    
    private java.util.UUID ngoId;
    private java.util.UUID funderId;
    private java.util.List<MilestoneRequest> milestones;
}
