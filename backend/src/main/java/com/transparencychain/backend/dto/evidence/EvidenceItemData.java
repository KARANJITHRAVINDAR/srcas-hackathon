package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceItemData {

    public enum EvidenceType {
        INVOICE, RECEIPT, GEOTAGGED_PHOTO, DOCUMENT, OTHER
    }

    private String id;
    private String fileName;
    private String fileUrl;
    private EvidenceType type;

    // Arithmetic fields (invoices/bills)
    private BigDecimal subtotal;
    @Builder.Default
    private List<TaxLineData> taxLines = new ArrayList<>();
    private BigDecimal taxAmount; // fallback if taxLines not broken down individually
    private BigDecimal statedTotal;
    private String amountInWords;

    // Geo fields
    private String printedAddress;
    private Double gpsLatitude;
    private Double gpsLongitude;

    // Temporal fields
    private LocalDate evidenceDate;
}
