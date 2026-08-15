package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxLineData {
    private String label;      // e.g. "CGST", "SGST", "IGST"
    private BigDecimal rate;   // e.g. 9.0 (percentage)
    private BigDecimal amount; // e.g. 17550.00
}
