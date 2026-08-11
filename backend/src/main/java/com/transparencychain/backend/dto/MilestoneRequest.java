package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MilestoneRequest {
    private String title;
    private String description;
    private BigDecimal amountAllocated;
    private LocalDate dueDate;
    private String requiredEvidence;
    private String verificationRequirements;
}
