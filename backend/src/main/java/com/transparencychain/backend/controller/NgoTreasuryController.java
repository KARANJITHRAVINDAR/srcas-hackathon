package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/treasury")
@PreAuthorize("hasRole('NGO')")
public class NgoTreasuryController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private FundTransactionRepository fundTransactionRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getTreasurySummary() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));

        List<Project> projects = projectRepository.findByNgoId(ngo.getId());

        BigDecimal totalPortfolioBudget = BigDecimal.ZERO;
        BigDecimal totalFundsReceived = BigDecimal.ZERO;
        BigDecimal totalNgoExpenses = BigDecimal.ZERO;

        List<Map<String, Object>> projectBreakdowns = new ArrayList<>();

        for (Project project : projects) {
            BigDecimal projectBudget = project.getTotalBudget() != null ? project.getTotalBudget() : BigDecimal.ZERO;
            totalPortfolioBudget = totalPortfolioBudget.add(projectBudget);

            // Fetch transactions to find released funds for this project
            List<FundTransaction> txs = fundTransactionRepository.findByProjectIdOrderByTransactionDateDesc(project.getId());
            BigDecimal projectReleased = txs.stream()
                    .filter(t -> (t.getType() == FundTransaction.TransactionType.MILESTONE_RELEASE || t.getType() == FundTransaction.TransactionType.ADDITIONAL_FUND_RELEASE) 
                                 && t.getStatus() == FundTransaction.TransactionStatus.RELEASED)
                    .map(FundTransaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalFundsReceived = totalFundsReceived.add(projectReleased);

            // Fetch expenses for this project
            BigDecimal projectSpent = expenseRepository.calculateTotalSpentForProject(project.getId());
            if (projectSpent == null) projectSpent = BigDecimal.ZERO;
            totalNgoExpenses = totalNgoExpenses.add(projectSpent);

            // Create breakdown entry
            Map<String, Object> pd = new HashMap<>();
            pd.put("id", project.getId());
            pd.put("title", project.getTitle());
            pd.put("status", project.getStatus());
            pd.put("budget", projectBudget);
            pd.put("released", projectReleased);
            pd.put("spent", projectSpent);
            
            BigDecimal remaining = projectBudget.subtract(projectReleased);
            if(remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;
            pd.put("pendingRelease", remaining);

            projectBreakdowns.add(pd);
        }

        BigDecimal totalLiquidity = totalFundsReceived.subtract(totalNgoExpenses);

        Map<String, Object> response = new HashMap<>();
        response.put("totalPortfolioBudget", totalPortfolioBudget);
        response.put("totalFundsReceived", totalFundsReceived);
        response.put("totalNgoExpenses", totalNgoExpenses);
        response.put("totalLiquidity", totalLiquidity);
        response.put("projects", projectBreakdowns);

        return ResponseEntity.ok(response);
    }
}
