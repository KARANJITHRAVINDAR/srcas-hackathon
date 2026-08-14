package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.ClosureVideo;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class ProjectClosureStatusDto {
    private UUID projectId;
    private int targetBeneficiaries;
    
    // Gate 1: Beneficiary Coverage & Sample Size
    private long uniqueFeedbackCount;
    private long totalFeedbackCount;
    private int minSampleSize = 10;
    private boolean sampleSizeMet;
    private double coveragePercentage;
    private double requiredCoveragePercentage = 10.0;
    private boolean coverageThresholdMet;
    private boolean gate1Passed;

    // Gate 2: Positive Sentiment Rate
    private long positiveCount;
    private long negativeCount;
    private long neutralCount;
    private double positivePercentage;
    private double requiredPositivePercentage = 80.0;
    private boolean positiveThresholdMet;
    private boolean gate2Passed;

    // Gate 3: Geo-tagged Closure Video
    private boolean closureVideoSubmitted;
    private boolean closureVideoVerified;
    private String closureVideoStatus; // PENDING, VERIFIED, REJECTED, NOT_SUBMITTED
    private ClosureVideo closureVideo;
    private boolean gate3Passed;

    // Master Decision
    private boolean eligibleForClosure; // true iff all 3 gates pass
    private boolean canClose;
    private boolean isClosed;

    // Partial-Failure Itemized Explanations
    private List<String> failureReasons = new ArrayList<>();
    private List<String> passHighlights = new ArrayList<>();
}

