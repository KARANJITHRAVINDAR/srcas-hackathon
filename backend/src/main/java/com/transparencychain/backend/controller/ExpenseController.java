package com.transparencychain.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.dto.ExpenseRequest;
import com.transparencychain.backend.dto.ExpenseResponse;
import com.transparencychain.backend.service.ExpenseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/expenses")
@PreAuthorize("hasRole('NGO')")
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    @GetMapping
    public ResponseEntity<?> getAllExpenses() {
        return ResponseEntity.ok(expenseService.getAllExpensesForNgo());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getProjectExpenses(@PathVariable UUID projectId) {
        return ResponseEntity.ok(expenseService.getExpensesForProject(projectId));
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        return ResponseEntity.ok(expenseService.getExpenseSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExpenseById(@PathVariable UUID id) {
        return ResponseEntity.ok(expenseService.getExpenseById(id));
    }

    @PostMapping
    public ResponseEntity<?> createExpense(
            @RequestParam("data") String dataJson,
            @RequestParam("file") MultipartFile file) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ExpenseRequest request = mapper.readValue(dataJson, ExpenseRequest.class);
            ExpenseResponse response = expenseService.createExpense(request, file);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
