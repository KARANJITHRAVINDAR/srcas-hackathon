package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/public/beneficiary-forms")
public class PublicBeneficiaryFormController {

    @Autowired
    private BeneficiaryVerificationFormRepository formRepository;

    @Autowired
    private BeneficiaryFormResponseRepository responseRepository;
    
    @Autowired
    private BeneficiaryFormAnswerRepository answerRepository;
    
    @Autowired
    private BeneficiaryFormQuestionRepository questionRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private com.transparencychain.backend.service.AuditLogService auditLogService;

    @Autowired
    private com.transparencychain.backend.service.ImpactGenerationService impactGenerationService;

    @Autowired
    private com.transparencychain.backend.service.NotificationService notificationService;

    @GetMapping("/{secureToken}")
    public ResponseEntity<?> getForm(@PathVariable String secureToken) {
        BeneficiaryVerificationForm form = formRepository.findByShareToken(secureToken).orElse(null);
        if (form == null || form.getStatus() != BeneficiaryVerificationForm.FormStatus.ACTIVE) {
            return ResponseEntity.badRequest().body("Form is not active or does not exist.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("formId", form.getId());
        response.put("title", form.getTitle());
        response.put("description", form.getDescription());
        response.put("projectTitle", form.getProject().getTitle());
        response.put("projectLocation", form.getProject().getGeography());

        List<Map<String, Object>> qList = new ArrayList<>();
        for (BeneficiaryFormQuestion q : form.getQuestions()) {
            Map<String, Object> qMap = new HashMap<>();
            qMap.put("id", q.getId());
            qMap.put("text", q.getQuestionText());
            qMap.put("type", q.getQuestionType().name());
            qMap.put("required", q.isRequired());
            qList.add(qMap);
        }
        response.put("questions", qList);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{secureToken}/responses")
    public ResponseEntity<?> submitResponse(@PathVariable String secureToken, @RequestBody Map<String, Object> payload) {
        BeneficiaryVerificationForm form = formRepository.findByShareToken(secureToken).orElseThrow();
        if (form.getStatus() != BeneficiaryVerificationForm.FormStatus.ACTIVE) {
            return ResponseEntity.badRequest().body("Form is closed.");
        }

        BeneficiaryFormResponse response = new BeneficiaryFormResponse();
        response.setForm(form);
        
        // Parse answers
        List<Map<String, Object>> answers = (List<Map<String, Object>>) payload.get("answers");
        boolean hasNo = false;
        Integer rating = null;
        String feedback = null;

        response = responseRepository.save(response); // Save first to get ID
        
        for (Map<String, Object> ans : answers) {
            UUID qId = UUID.fromString((String) ans.get("questionId"));
            String answerVal = (String) ans.get("answer");
            
            BeneficiaryFormQuestion q = questionRepository.findById(qId).orElse(null);
            if (q != null) {
                BeneficiaryFormAnswer formAnswer = new BeneficiaryFormAnswer();
                formAnswer.setResponse(response);
                formAnswer.setQuestion(q);
                formAnswer.setAnswerText(answerVal);
                answerRepository.save(formAnswer);

                if (q.getQuestionType() == BeneficiaryFormQuestion.QuestionType.YES_NO) {
                    if ("NO".equalsIgnoreCase(answerVal)) hasNo = true;
                } else if (q.getQuestionType() == BeneficiaryFormQuestion.QuestionType.RATING) {
                    try { rating = Integer.parseInt(answerVal); } catch (Exception e) {}
                } else if (q.getQuestionType() == BeneficiaryFormQuestion.QuestionType.SHORT_TEXT) {
                    feedback = answerVal;
                }
            }
        }

        response.setOverallResponse(hasNo ? BeneficiaryFormResponse.OverallResponse.NO : BeneficiaryFormResponse.OverallResponse.YES);
        response.setRating(rating);
        response.setFeedback(feedback);
        responseRepository.save(response);

        // Record in AI-driven BeneficiaryFeedback model
        try {
            com.transparencychain.backend.model.BeneficiaryFeedback.FeedbackStatus fbStatus = hasNo 
                    ? com.transparencychain.backend.model.BeneficiaryFeedback.FeedbackStatus.DISPUTED 
                    : com.transparencychain.backend.model.BeneficiaryFeedback.FeedbackStatus.CONFIRMED;
            String videoUrl = (String) payload.get("videoUrl");
            impactGenerationService.recordBeneficiaryFeedback(
                form.getProject().getId(),
                form.getMilestone() != null ? form.getMilestone().getId() : null,
                videoUrl,
                feedback,
                fbStatus
            );
        } catch (Exception e) {
            System.err.println("Failed to record beneficiary feedback in Impact service: " + e.getMessage());
        }

        if (!hasNo && form.getMilestone() != null) {
            Milestone milestone = form.getMilestone();
            if (milestone.getStatus() == Milestone.MilestoneStatus.IN_PROGRESS ||
                milestone.getStatus() == Milestone.MilestoneStatus.EVIDENCE_SUBMITTED) {
                milestone.setStatus(Milestone.MilestoneStatus.IN_REVIEW);
                milestoneRepository.save(milestone);
                auditLogService.logAction(milestone.getId(), "MILESTONE_AUTO_COMPLETE",
                        "Milestone automatically moved to IN_REVIEW due to beneficiary YES confirmation");
            }
        }

        // Notify NGO & Funders of beneficiary feedback
        try {
            if (form.getProject().getNgo() != null && form.getProject().getNgo().getUser() != null) {
                notificationService.create(
                        Notification.RecipientType.NGO,
                        form.getProject().getNgo().getUser(),
                        form.getProject(),
                        form.getMilestone(),
                        Notification.NotificationEventType.BENEFICIARY_FEEDBACK_SUBMITTED,
                        "New Beneficiary Feedback Recorded",
                        "Ground beneficiary submitted verification response (Status: " + (hasNo ? "Disputed" : "Confirmed") + ") for project '" + form.getProject().getTitle() + "'.",
                        "/ngo/projects/" + form.getProject().getId()
                );
            }

            notificationService.notifyProjectFunders(
                    form.getProject(),
                    form.getMilestone(),
                    Notification.NotificationEventType.BENEFICIARY_FEEDBACK_SUBMITTED,
                    "Beneficiary Verification Feedback Received",
                    "A ground beneficiary submitted confirmation feedback for project '" + form.getProject().getTitle() + "'.",
                    "/funder/projects"
            );
        } catch (Exception ex) {
            System.err.println("Beneficiary notification dispatch warning: " + ex.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Response submitted successfully"));
    }
}
