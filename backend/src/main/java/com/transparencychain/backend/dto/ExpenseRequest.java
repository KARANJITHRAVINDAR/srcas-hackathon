package com.transparencychain.backend.dto;

import com.transparencychain.backend.model.Expense;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ExpenseRequest {
    private UUID projectId;
    private UUID milestoneId;
    private Expense.ExpenseCategory category;
    private String description;
    private String vendorName;
    private String invoiceNumber;
    private String expenseDate;
    private BigDecimal amount;
    private String currency = "INR";
}
