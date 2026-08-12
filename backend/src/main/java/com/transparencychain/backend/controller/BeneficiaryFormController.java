package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ngo/projects/{projectId}/beneficiary-form")
@PreAuthorize("hasRole('NGO')")
public class BeneficiaryFormController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private BeneficiaryVerificationFormRepository formRepository;

    @Autowired
    private BeneficiaryFormResponseRepository responseRepository;

    @GetMapping
    public ResponseEntity<?> getProjectForm(@PathVariable UUID projectId) {
        List<BeneficiaryVerificationForm> forms = formRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (forms.isEmpty()) {
            return ResponseEntity.ok(null); // No form exists yet
        }
        return ResponseEntity.ok(forms.get(0)); // Return latest form
    }

    @PostMapping
    public ResponseEntity<?> generateForm(@PathVariable UUID projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        
        BeneficiaryVerificationForm form = new BeneficiaryVerificationForm();
        form.setProject(project);
        form.setTitle("Final Impact Verification");
        form.setDescription("Please help us verify the impact of " + project.getTitle());
        form.setStatus(BeneficiaryVerificationForm.FormStatus.DRAFT);
        form.setTargetResponses(project.getExpectedBeneficiaries());
        form.setMinimumResponsePercentage(20); // e.g. 20% of target
        form.setMinimumPositivePercentage(80); // 80% of responses must be YES

        List<BeneficiaryFormQuestion> questions = new ArrayList<>();
        
        BeneficiaryFormQuestion q1 = new BeneficiaryFormQuestion();
        q1.setForm(form);
        q1.setQuestionText("Did the project provide the promised facility to your area?");
        q1.setQuestionType(BeneficiaryFormQuestion.QuestionType.YES_NO);
        q1.setRequired(true);
        q1.setDisplayOrder(1);
        questions.add(q1);

        BeneficiaryFormQuestion q2 = new BeneficiaryFormQuestion();
        q2.setForm(form);
        q2.setQuestionText("Is the facility currently usable?");
        q2.setQuestionType(BeneficiaryFormQuestion.QuestionType.YES_NO);
        q2.setRequired(true);
        q2.setDisplayOrder(2);
        questions.add(q2);

        BeneficiaryFormQuestion q3 = new BeneficiaryFormQuestion();
        q3.setForm(form);
        q3.setQuestionText("How would you rate the benefit?");
        q3.setQuestionType(BeneficiaryFormQuestion.QuestionType.RATING);
        q3.setRequired(false);
        q3.setDisplayOrder(3);
        questions.add(q3);

        form.setQuestions(questions);
        
        form = formRepository.save(form);
        return ResponseEntity.ok(form);
    }

    @PostMapping("/{formId}/publish")
    public ResponseEntity<?> publishForm(@PathVariable UUID projectId, @PathVariable UUID formId) {
        BeneficiaryVerificationForm form = formRepository.findById(formId).orElseThrow();
        if (form.getStatus() == BeneficiaryVerificationForm.FormStatus.DRAFT) {
            form.setStatus(BeneficiaryVerificationForm.FormStatus.ACTIVE);
            form.setPublishedAt(LocalDateTime.now());
            formRepository.save(form);
        }
        return ResponseEntity.ok(form);
    }

    @GetMapping("/{formId}/summary")
    public ResponseEntity<?> getFormSummary(@PathVariable UUID projectId, @PathVariable UUID formId) {
        BeneficiaryVerificationForm form = formRepository.findById(formId).orElseThrow();
        
        long totalResponses = responseRepository.countByFormId(formId);
        long yesResponses = responseRepository.countByFormIdAndOverallResponse(formId, BeneficiaryFormResponse.OverallResponse.YES);
        long noResponses = responseRepository.countByFormIdAndOverallResponse(formId, BeneficiaryFormResponse.OverallResponse.NO);
        long pending = responseRepository.countByFormIdAndOverallResponse(formId, BeneficiaryFormResponse.OverallResponse.PENDING);

        double positiveRate = totalResponses > 0 ? (double) yesResponses / totalResponses * 100 : 0;
        double responseRate = form.getTargetResponses() > 0 ? (double) totalResponses / form.getTargetResponses() * 100 : 0;

        boolean thresholdSatisfied = (responseRate >= form.getMinimumResponsePercentage() && positiveRate >= form.getMinimumPositivePercentage());
        String milestoneStatus = thresholdSatisfied ? "READY FOR FUNDER REVIEW" : "REQUIRES MORE RESPONSES";

        List<BeneficiaryFormResponse> recentResponses = responseRepository.findByFormIdOrderBySubmittedAtDesc(formId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("form", form);
        summary.put("totalResponses", totalResponses);
        summary.put("yesResponses", yesResponses);
        summary.put("noResponses", noResponses);
        summary.put("pendingResponses", pending);
        summary.put("positiveRate", positiveRate);
        summary.put("responseRate", responseRate);
        summary.put("thresholdSatisfied", thresholdSatisfied);
        summary.put("milestoneStatus", milestoneStatus);
        
        List<Map<String, Object>> responseDtos = new ArrayList<>();
        for (BeneficiaryFormResponse r : recentResponses) {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", r.getId());
            dto.put("submittedAt", r.getSubmittedAt());
            dto.put("overallResponse", r.getOverallResponse().name());
            dto.put("rating", r.getRating());
            dto.put("status", r.getStatus().name());
            responseDtos.add(dto);
        }
        summary.put("recentResponses", responseDtos);

        return ResponseEntity.ok(summary);
    }
}
