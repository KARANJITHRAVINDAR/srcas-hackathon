package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/projects/{projectId}/funds")
@PreAuthorize("hasRole('NGO')")
public class ProjectFundsController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private FundTransactionRepository fundTransactionRepository;

    @Autowired
    private AdditionalFundingRequestRepository additionalFundingRequestRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getFundsSummary(@PathVariable UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        List<Milestone> milestones = milestoneRepository.findByProjectIdOrderByDueDateAsc(projectId);

        BigDecimal approvedBudget = project.getTotalBudget() != null ? project.getTotalBudget() : BigDecimal.ZERO;
        
        BigDecimal allocatedToMilestones = milestones.stream()
                .map(m -> m.getAmountAllocated() != null ? m.getAmountAllocated() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Sum of original released amount (excluding additional funding)
        // Wait, how do we distinguish original release from additional release if both are in releasedAmount?
        // We will sum the fund transactions by type!
        List<FundTransaction> txs = fundTransactionRepository.findByProjectIdOrderByTransactionDateDesc(projectId);
        
        BigDecimal originalReleased = txs.stream()
                .filter(t -> t.getType() == FundTransaction.TransactionType.MILESTONE_RELEASE && t.getStatus() == FundTransaction.TransactionStatus.RELEASED)
                .map(FundTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal additionalReleased = txs.stream()
                .filter(t -> t.getType() == FundTransaction.TransactionType.ADDITIONAL_FUND_RELEASE && t.getStatus() == FundTransaction.TransactionStatus.RELEASED)
                .map(FundTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalReleased = originalReleased.add(additionalReleased);

        BigDecimal totalSpent = expenseRepository.calculateTotalSpentForProject(projectId);
        if (totalSpent == null) totalSpent = BigDecimal.ZERO;

        BigDecimal approvedAdditionalFunding = txs.stream()
                .filter(t -> t.getType() == FundTransaction.TransactionType.ADDITIONAL_FUND_APPROVAL)
                .map(FundTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingRelease = approvedBudget.add(approvedAdditionalFunding).subtract(totalReleased);

        Map<String, Object> response = new HashMap<>();
        response.put("approvedBudget", approvedBudget);
        response.put("allocatedToMilestones", allocatedToMilestones);
        response.put("originalFundsReleased", originalReleased);
        response.put("additionalFundsReleased", additionalReleased);
        response.put("totalFundsReleased", totalReleased);
        response.put("totalSpent", totalSpent);
        response.put("pendingRelease", pendingRelease);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/milestones")
    public ResponseEntity<?> getMilestoneFinancials(@PathVariable UUID projectId) {
        List<Milestone> milestones = milestoneRepository.findByProjectId(projectId);
        for (Milestone m : milestones) {
            if (m.getTitle() != null) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Phase\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(m.getTitle());
                if (matcher.find()) {
                    m.setSequenceNumber(Integer.parseInt(matcher.group(1)));
                }
            }
        }
        milestones.sort((a, b) -> Integer.compare(
            a.getSequenceNumber() != null ? a.getSequenceNumber() : 99,
            b.getSequenceNumber() != null ? b.getSequenceNumber() : 99
        ));

        List<FundTransaction> txs = fundTransactionRepository.findByProjectIdOrderByTransactionDateDesc(projectId);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Milestone m : milestones) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("title", m.getTitle());
            map.put("status", m.getStatus());
            map.put("sequenceNumber", m.getSequenceNumber());
            map.put("allocatedAmount", m.getAmountAllocated() != null ? m.getAmountAllocated() : BigDecimal.ZERO);
            
            // Calculate released amount dynamically from fund transactions
            BigDecimal milestoneReleased = txs.stream()
                .filter(t -> t.getMilestone() != null && t.getMilestone().getId().equals(m.getId()) 
                          && (t.getType() == FundTransaction.TransactionType.MILESTONE_RELEASE || t.getType() == FundTransaction.TransactionType.ADDITIONAL_FUND_RELEASE)
                          && t.getStatus() == FundTransaction.TransactionStatus.RELEASED)
                .map(FundTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (milestoneReleased.compareTo(BigDecimal.ZERO) == 0 && m.getReleasedAmount() != null) {
                milestoneReleased = m.getReleasedAmount();
            }

            map.put("releasedAmount", milestoneReleased);
            map.put("additionalAllocatedAmount", m.getAdditionalAllocatedAmount() != null ? m.getAdditionalAllocatedAmount() : BigDecimal.ZERO);
            
            // Total spent for THIS milestone
            BigDecimal milestoneSpent = expenseRepository.findByMilestoneId(m.getId()).stream()
                .filter(e -> e.getStatus() != Expense.ExpenseStatus.REJECTED && e.getStatus() != Expense.ExpenseStatus.FLAGGED)
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            map.put("spentAmount", milestoneSpent != null ? milestoneSpent : BigDecimal.ZERO);

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(@PathVariable UUID projectId) {
        return ResponseEntity.ok(fundTransactionRepository.findByProjectIdOrderByTransactionDateDesc(projectId));
    }

    @GetMapping("/additional-requests")
    public ResponseEntity<?> getAdditionalRequests(@PathVariable UUID projectId) {
        return ResponseEntity.ok(additionalFundingRequestRepository.findByMilestone_ProjectIdOrderByCreatedAtDesc(projectId));
    }

    @PostMapping("/additional-requests")
    public ResponseEntity<?> createAdditionalRequest(@PathVariable UUID projectId,
                                                     @RequestParam("milestoneId") UUID milestoneId,
                                                     @RequestParam("requestedAmount") BigDecimal requestedAmount,
                                                     @RequestParam("reason") String reason,
                                                     @RequestParam(value = "proof", required = false) MultipartFile proof) {
        Milestone milestone = milestoneRepository.findById(milestoneId).orElseThrow();
        
        AdditionalFundingRequest req = new AdditionalFundingRequest();
        req.setMilestone(milestone);
        req.setRequestedAmount(requestedAmount);
        req.setReason(reason);
        if (proof != null) {
            req.setProofUrl(proof.getOriginalFilename());
        }
        req.setStatus(AdditionalFundingRequest.RequestStatus.PENDING);
        additionalFundingRequestRepository.save(req);

        // Record a transaction for audit trail
        FundTransaction tx = new FundTransaction();
        tx.setProject(milestone.getProject());
        tx.setMilestone(milestone);
        tx.setType(FundTransaction.TransactionType.ADDITIONAL_FUND_REQUEST);
        tx.setAmount(requestedAmount);
        tx.setStatus(FundTransaction.TransactionStatus.REQUESTED);
        tx.setReference("REQ-" + req.getId().toString().substring(0, 8));
        fundTransactionRepository.save(tx);

        return ResponseEntity.ok(req);
    }
}
