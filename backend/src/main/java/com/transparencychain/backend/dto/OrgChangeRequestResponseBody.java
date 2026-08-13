package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body for Funder/Org to respond to a pending change request.
 */
@Data
public class OrgChangeRequestResponseBody {

    public enum Decision {
        ACCEPT,
        COUNTER,
        REJECT
    }

    private Decision decision;

    private String responseNote;

    // Counter-proposal fields (only used when decision = COUNTER)
    private String counterName;
    private BigDecimal counterBudget;
    private Integer counterSequence;
    private LocalDate counterDueDate;
}
