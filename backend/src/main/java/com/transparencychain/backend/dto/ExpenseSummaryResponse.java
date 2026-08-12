package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ExpenseSummaryResponse {
    private BigDecimal totalAllocated;
    private BigDecimal totalSpent;
    private BigDecimal remaining;
    private long pendingReviewCount;
    private long flaggedCount;
}
