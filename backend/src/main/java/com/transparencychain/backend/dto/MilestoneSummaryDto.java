package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.Milestone;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Lightweight milestone summary for the Project Detail view.
 * Contains the current proposed values from the NGO.
 */
@Data
public class MilestoneSummaryDto {

    private UUID id;
    private String title;
    private String description;
    private BigDecimal amountAllocated;
    private Integer sequenceNumber;
    private LocalDate dueDate;
    private Milestone.MilestoneStatus status;
    private String requiredEvidence;
    private String verificationRequirements;
}
