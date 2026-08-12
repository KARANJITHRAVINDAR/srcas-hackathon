package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MilestoneCommitmentDto {
    private UUID milestoneId;
    private BigDecimal amount;
}
