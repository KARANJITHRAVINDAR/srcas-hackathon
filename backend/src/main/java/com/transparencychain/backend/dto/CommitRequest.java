package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CommitRequest {
    private BigDecimal totalAmount;
    private List<MilestoneCommitmentDto> milestoneBreakdown;
}
