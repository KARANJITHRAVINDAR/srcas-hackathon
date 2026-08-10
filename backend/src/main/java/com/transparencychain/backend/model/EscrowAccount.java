package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "escrow_accounts")
public class EscrowAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", unique = true, nullable = false)
    private Project project;

    @Column(precision = 15, scale = 2)
    private BigDecimal lockedAmount = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal releasedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private EscrowStatus status;

    public enum EscrowStatus {
        LOCKED, PARTIALLY_RELEASED, FULLY_RELEASED
    }
    
    public BigDecimal getBalanceAmount() {
        if(lockedAmount == null) return BigDecimal.ZERO;
        if(releasedAmount == null) return lockedAmount;
        return lockedAmount.subtract(releasedAmount);
    }
}
