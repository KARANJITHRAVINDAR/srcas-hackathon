package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.MilestoneChangeRequest;
import com.transparencychain.backend.model.MilestoneVersion;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Full change-request view returned to both org and NGO sides.
 * Shows the diff between original and proposed values inline so the
 * reviewer can see exactly what changed at a glance.
 */
@Data
public class ChangeRequestDto {

    private UUID id;
    private UUID milestoneId;
    private String milestoneTitle;

    // Who raised it — exactly one pair is populated
    private UUID requestedByOrgId;
    private String requestedByOrgName;
    private UUID requestedByNgoId;
    private String requestedByNgoName;
    
    /** Convenience field: "FUNDER" or "NGO" — tells the UI who initiated this CR. */
    private String initiatedBy;

    private MilestoneChangeRequest.ChangeRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
    private String ngoResponseNote;

    // Original values (what the milestone currently is)
    private VersionSnapshot original;

    // Proposed values (what the org wants it to become)
    private VersionSnapshot proposed;

    @Data
    public static class VersionSnapshot {
        private UUID versionId;
        private Integer versionNumber;
        private MilestoneVersion.ProposedBy proposedBy;
        private String name;
        private BigDecimal budget;
        private Integer sequence;
        private LocalDate dueDate;
        private String changeReason;
        private MilestoneVersion.VersionStatus status;
        private LocalDateTime createdAt;
    }
}
