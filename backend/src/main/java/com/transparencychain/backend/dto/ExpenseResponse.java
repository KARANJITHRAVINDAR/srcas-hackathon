package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.Expense;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ExpenseResponse {
    private UUID id;
    private UUID projectId;
    private String projectTitle;
    private UUID milestoneId;
    private String milestoneTitle;
    private Expense.ExpenseCategory category;
    private String description;
    private String vendorName;
    private String invoiceNumber;
    private String expenseDate;
    private BigDecimal amount;
    private String currency;
    private Expense.ExpenseStatus status;
    
    private UUID evidenceId;
    private String evidenceUrl;
    
    private Integer aiRiskScore;
    private String aiRiskLevel;
    private Boolean ocrProcessed;
    
    private LocalDateTime submittedAt;
    private LocalDateTime verifiedAt;
    private LocalDateTime createdAt;
}
