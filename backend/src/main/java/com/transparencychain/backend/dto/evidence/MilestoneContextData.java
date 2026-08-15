package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneContextData {
    private UUID milestoneId;
    private String title;
    private Integer sequenceNumber;
    private LocalDate evidenceSubmissionDeadline;
}
