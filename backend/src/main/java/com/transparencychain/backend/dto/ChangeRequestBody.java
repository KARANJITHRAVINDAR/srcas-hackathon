package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body for POST /api/org/projects/{id}/milestones/{milestoneId}/change-request
 *
 * All fields are optional — only include the ones the funder wants to change.
 * At least one field must be non-null (validated in the service).
 * The reason field is required to enforce auditability.
 */
@Data
public class ChangeRequestBody {

    /** New proposed title (null = keep existing). */
    private String name;

    /** New proposed budget (null = keep existing). */
    private BigDecimal budget;

    /** New proposed sequence number in the milestone list (null = keep existing). */
    private Integer sequence;

    /** New proposed due date (null = keep existing). */
    private LocalDate dueDate;

    /** Mandatory: why this change is being proposed. */
    private String reason;
}
