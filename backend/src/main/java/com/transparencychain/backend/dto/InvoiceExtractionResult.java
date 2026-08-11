package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class InvoiceExtractionResult {
    private String vendorName;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String gstin;
    private BigDecimal totalAmount;
    private BigDecimal taxAmount;
    private String currency;
    private List<InvoiceItem> items;
    private String rawText;
    private int ocrConfidence;
}
