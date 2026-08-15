package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchVerificationResult {

    public enum Decision {
        ACCEPTED,
        ROUTE_TO_HUMAN_REVIEW,
        REJECTED_RESUBMISSION_REQUIRED
    }

    private Decision decision;
    @Builder.Default
    private List<ItemVerificationResult> itemResults = new ArrayList<>();
    @Builder.Default
    private List<String> rejectionReasons = new ArrayList<>();
    @Builder.Default
    private List<String> reviewReasons = new ArrayList<>();
    @Builder.Default
    private List<String> softWarnings = new ArrayList<>();
    
    // Per-item surgical resubmission list (Section 6.1)
    @Builder.Default
    private List<String> failingItemIds = new ArrayList<>();
}
