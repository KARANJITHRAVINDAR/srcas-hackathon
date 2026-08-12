package com.transparencychain.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body for POST /api/ngo/change-requests/{id}/respond
 *
 * decision is mandatory.
 * If decision = COUNTER, at least one proposed field must be non-null
 * and responseNote should explain the counter-proposal.
 * If decision = ACCEPT or REJECT, proposed fields are ignored.
 */
@Data
public class NgoChangeRequestResponseBody {

    public enum Decision {
        ACCEPT,
        COUNTER,
        REJECT
    }

    private Decision decision;

    /** Mandatory for REJECT and COUNTER; recommended for ACCEPT. */
    private String responseNote;

    // Counter-proposal fields (only used when decision = COUNTER)
    private String counterName;
    private BigDecimal counterBudget;
    private Integer counterSequence;
    private LocalDate counterDueDate;
}
