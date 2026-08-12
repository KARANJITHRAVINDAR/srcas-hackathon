package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.ExpenseRequest;
import com.transparencychain.backend.dto.ExpenseResponse;
import com.transparencychain.backend.dto.ExpenseSummaryResponse;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private NgoProfileRepository ngoProfileRepository;
    
    @Autowired
    private ProofSubmissionRepository proofSubmissionRepository;

    @Autowired
    private AiFraudDetectionService aiFraudDetectionService;

    public NgoProfile getAuthenticatedNgo() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));
    }

    @Transactional
    public ExpenseResponse createExpense(ExpenseRequest request, MultipartFile file) {
        NgoProfile ngo = getAuthenticatedNgo();
        
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));
                
        if (!project.getNgo().getId().equals(ngo.getId())) {
            throw new RuntimeException("Unauthorized: NGO does not own this project");
        }

        Milestone milestone = milestoneRepository.findById(request.getMilestoneId())
                .orElseThrow(() -> new RuntimeException("Milestone not found"));

        if (!milestone.getProject().getId().equals(project.getId())) {
            throw new RuntimeException("Invalid milestone for the given project");
        }
        
        // Budget Validation
        BigDecimal currentSpent = expenseRepository.calculateTotalSpentForMilestone(milestone.getId());
        if (currentSpent == null) currentSpent = BigDecimal.ZERO;
        
        BigDecimal newTotal = currentSpent.add(request.getAmount());
        if (newTotal.compareTo(milestone.getAmountAllocated()) > 0) {
            throw new RuntimeException("This expense would exceed the approved milestone allocation.");
        }

        Expense expense = new Expense();
        expense.setNgo(ngo);
        expense.setProject(project);
        expense.setMilestone(milestone);
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setVendorName(request.getVendorName());
        expense.setInvoiceNumber(request.getInvoiceNumber());
        expense.setExpenseDate(request.getExpenseDate());
        expense.setAmount(request.getAmount());
        expense.setCurrency(request.getCurrency());
        expense.setStatus(Expense.ExpenseStatus.SUBMITTED);
        
        // Attach Evidence
        if (file != null && !file.isEmpty()) {
            ProofSubmission proof = new ProofSubmission();
            proof.setMilestone(milestone);
            proof.setFileUrl(file.getOriginalFilename());
            proof.setFileType(file.getContentType());
            proof.setStatus(ProofSubmission.ProofStatus.PENDING_AI_CHECK);
            proof = proofSubmissionRepository.save(proof);
            expense.setEvidence(proof);
            
            // Note: Since saving the expense is synchronous, we run AI synchronously for the response
            try {
                EvidenceAnalysis analysis = aiFraudDetectionService.analyzeProof(file, proof, "INVOICE");
                
                expense.setAiRiskScore(analysis.getFraudScore());
                expense.setAiRiskLevel(analysis.getResult().name());
                expense.setOcrProcessed(true);
                
                if (analysis.getResult() == EvidenceAnalysisResult.FLAGGED) {
                    expense.setStatus(Expense.ExpenseStatus.FLAGGED);
                } else if (analysis.getResult() == EvidenceAnalysisResult.REVIEW) {
                    expense.setStatus(Expense.ExpenseStatus.AI_REVIEW);
                } else {
                    expense.setStatus(Expense.ExpenseStatus.PENDING_VERIFICATION);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            throw new RuntimeException("Invoice/Receipt file is required.");
        }

        expense = expenseRepository.save(expense);
        return mapToResponse(expense);
    }

    public List<ExpenseResponse> getAllExpensesForNgo() {
        NgoProfile ngo = getAuthenticatedNgo();
        List<Expense> expenses = expenseRepository.findByNgoIdOrderByCreatedAtDesc(ngo.getId());
        return expenses.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<ExpenseResponse> getExpensesForProject(UUID projectId) {
        NgoProfile ngo = getAuthenticatedNgo();
        List<Expense> expenses = expenseRepository.findByProjectIdAndNgoIdOrderByCreatedAtDesc(projectId, ngo.getId());
        return expenses.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public ExpenseResponse getExpenseById(UUID id) {
        NgoProfile ngo = getAuthenticatedNgo();
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
                
        if (!expense.getNgo().getId().equals(ngo.getId())) {
            throw new RuntimeException("Unauthorized to view this expense");
        }
        
        return mapToResponse(expense);
    }
    
    public ExpenseSummaryResponse getExpenseSummary() {
        NgoProfile ngo = getAuthenticatedNgo();
        
        // Calculate Total Allocated (Sum of all approved milestones)
        List<Project> projects = projectRepository.findByNgoId(ngo.getId());
        BigDecimal totalAllocated = BigDecimal.ZERO;
        for(Project p : projects) {
            List<Milestone> milestones = milestoneRepository.findByProjectId(p.getId());
            for(Milestone m : milestones) {
                if (m.getAmountAllocated() != null) {
                    totalAllocated = totalAllocated.add(m.getAmountAllocated());
                }
            }
        }
        
        BigDecimal totalSpent = expenseRepository.calculateTotalSpentForNgo(ngo.getId());
        if(totalSpent == null) totalSpent = BigDecimal.ZERO;
        
        BigDecimal remaining = totalAllocated.subtract(totalSpent);
        
        long pendingCount = expenseRepository.countByNgoIdAndStatus(ngo.getId(), Expense.ExpenseStatus.PENDING_VERIFICATION)
                          + expenseRepository.countByNgoIdAndStatus(ngo.getId(), Expense.ExpenseStatus.AI_REVIEW);
                          
        long flaggedCount = expenseRepository.countByNgoIdAndStatus(ngo.getId(), Expense.ExpenseStatus.FLAGGED);
        
        ExpenseSummaryResponse summary = new ExpenseSummaryResponse();
        summary.setTotalAllocated(totalAllocated);
        summary.setTotalSpent(totalSpent);
        summary.setRemaining(remaining);
        summary.setPendingReviewCount(pendingCount);
        summary.setFlaggedCount(flaggedCount);
        
        return summary;
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        ExpenseResponse response = new ExpenseResponse();
        response.setId(expense.getId());
        response.setProjectId(expense.getProject().getId());
        response.setProjectTitle(expense.getProject().getTitle());
        response.setMilestoneId(expense.getMilestone().getId());
        response.setMilestoneTitle(expense.getMilestone().getTitle());
        response.setCategory(expense.getCategory());
        response.setDescription(expense.getDescription());
        response.setVendorName(expense.getVendorName());
        response.setInvoiceNumber(expense.getInvoiceNumber());
        response.setExpenseDate(expense.getExpenseDate());
        response.setAmount(expense.getAmount());
        response.setCurrency(expense.getCurrency());
        response.setStatus(expense.getStatus());
        
        if (expense.getEvidence() != null) {
            response.setEvidenceId(expense.getEvidence().getId());
            response.setEvidenceUrl(expense.getEvidence().getFileUrl());
        }
        
        response.setAiRiskScore(expense.getAiRiskScore());
        response.setAiRiskLevel(expense.getAiRiskLevel());
        response.setOcrProcessed(expense.getOcrProcessed());
        response.setSubmittedAt(expense.getSubmittedAt());
        response.setVerifiedAt(expense.getVerifiedAt());
        response.setCreatedAt(expense.getCreatedAt());
        return response;
    }
}
