package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemVerificationResult {

    public enum Status {
        PASS,
        HARD_FAIL,
        FLAG_FOR_REVIEW,
        SOFT_WARNING,
        NOT_APPLICABLE
    }

    private String itemId;
    private String fileName;
    private EvidenceItemData.EvidenceType type;

    // Checks status
    private Status arithmeticStatus;
    private String arithmeticReason;
    private BigDecimal arithmeticDiscrepancy;

    private Status geoStatus;
    private String geoReason;
    private Double distanceKm;
    private String evidenceLocationString;
    private String projectLocationString;

    private Status temporalStatus;
    private String temporalReason;

    @Builder.Default
    private List<String> softWarnings = new ArrayList<>();

    // Overall item status
    private Status overallStatus;
    private String primaryFailureReason;
}
