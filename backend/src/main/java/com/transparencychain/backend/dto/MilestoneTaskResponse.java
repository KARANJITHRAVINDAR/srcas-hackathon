package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.MilestoneTask;
import lombok.Data;
import java.util.UUID;

@Data
public class MilestoneTaskResponse {
    private UUID id;
    private UUID milestoneId;
    private String taskName;
    private String description;
    private Integer sequenceNumber;
    private String requiredEvidenceType;
    private String requiredEvidence;
    private MilestoneTask.TaskStatus status;
    private UUID proofId;
    private String proofUrl;
    private String proofStatus;
}
