package com.transparencychain.backend.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ProjectClosureStatusDto {
    private UUID projectId;
    private int targetBeneficiaries;
    private long totalFeedbackCount;
    private long positiveFeedbackCount;
    private double coveragePercentage;
    private double positivePercentage;
    private boolean coverageThresholdMet;
    private boolean positiveThresholdMet;
    private boolean closureVideoSubmitted;
    private boolean eligibleForClosure;
    private boolean isClosed;
}
