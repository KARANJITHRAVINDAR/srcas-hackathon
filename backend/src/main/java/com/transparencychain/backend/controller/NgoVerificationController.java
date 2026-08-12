package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/verification")
@PreAuthorize("hasRole('NGO')")
public class NgoVerificationController {

    @Autowired
    private NgoProfileRepository ngoProfileRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private ProofSubmissionRepository proofSubmissionRepository;

    @GetMapping("/actions")
    public ResponseEntity<?> getActionItems() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        NgoProfile ngo = ngoProfileRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("NGO profile not found"));

        List<Map<String, Object>> actions = new ArrayList<>();

        // Fetch FLAGGED / AI_REVIEW expenses
        List<Expense> expenses = expenseRepository.findByNgoIdAndStatuses(ngo.getId(), 
                Arrays.asList(Expense.ExpenseStatus.FLAGGED, Expense.ExpenseStatus.AI_REVIEW, Expense.ExpenseStatus.REJECTED));

        for (Expense e : expenses) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", e.getId());
            item.put("type", "EXPENSE");
            item.put("projectId", e.getProject().getId());
            item.put("projectName", e.getProject().getTitle());
            item.put("title", "Expense Flagged");
            item.put("description", e.getVendorName() + " - " + e.getCategory());
            item.put("status", e.getStatus().toString());
            item.put("date", e.getCreatedAt());
            actions.add(item);
        }

        // Fetch AI_FLAGGED proofs
        List<ProofSubmission> proofs = proofSubmissionRepository.findByNgoIdAndStatuses(ngo.getId(), 
                Arrays.asList(ProofSubmission.ProofStatus.AI_FLAGGED));

        for (ProofSubmission p : proofs) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", p.getId());
            item.put("type", "PROOF");
            item.put("projectId", p.getMilestone().getProject().getId());
            item.put("projectName", p.getMilestone().getProject().getTitle());
            item.put("title", "Evidence Requires Resubmission");
            item.put("description", p.getMilestone().getTitle() + " - AI Flagged");
            item.put("status", p.getStatus().toString());
            item.put("date", p.getSubmittedAt());
            actions.add(item);
        }

        actions.sort((a, b) -> ((java.time.LocalDateTime) b.get("date")).compareTo((java.time.LocalDateTime) a.get("date")));

        return ResponseEntity.ok(actions);
    }
}
