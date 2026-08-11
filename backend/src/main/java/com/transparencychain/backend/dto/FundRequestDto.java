package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FundRequestDto {
    private BigDecimal amount;
    private String reason;
}
