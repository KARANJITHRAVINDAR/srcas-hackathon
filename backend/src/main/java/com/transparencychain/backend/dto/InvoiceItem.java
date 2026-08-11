package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class InvoiceItem {
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal total;
}
