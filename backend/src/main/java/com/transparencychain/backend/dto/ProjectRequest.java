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
}
