package com.transparencychain.backend.controller;

import com.transparencychain.backend.model.*;
import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationSubmission.SubmissionStatus;
import com.transparencychain.backend.repository.*;
import com.transparencychain.backend.service.DocumentClassifierService;
import com.transparencychain.backend.service.NgoVerificationScoringService;
import com.transparencychain.backend.service.OcrExtractionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/ngo/register")
@CrossOrigin(origins = "*")
public class NgoRegistrationController {

    private static final Logger log = LoggerFactory.getLogger(NgoRegistrationController.class);

    @Autowired private DocumentClassifierService classifierService;
    @Autowired private OcrExtractionService ocrService;
    @Autowired private NgoVerificationScoringService scoringService;

    @Autowired private NgoRegistrationSubmissionRepository submissionRepository;
    @Autowired private NgoRegistrationDocumentRepository documentRepository;
    @Autowired private NgoRegistrationFieldRepository fieldRepository;

    @Autowired private NgoProfileRepository ngoProfileRepository;
    @Autowired private NgoBoardMemberRepository boardMemberRepository;
    @Autowired private UserRepository userRepository;

    /**
     * Upload onboarding documents, classify types, execute OCR extraction,
     * compute 4-part verification score, and apply hard 45% gate.
     */
    @PostMapping("/documents")
    public ResponseEntity<?> uploadDocuments(
            @RequestParam("userId") UUID userId,
            @RequestParam(value = "hasBankAccount", defaultValue = "true") boolean hasBankAccount,
            @RequestParam("files") MultipartFile[] files
    ) {
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
        }

        if (files == null || files.length == 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "At least one document is required."));
        }

        log.info("[NGO_REGISTRATION] Processing submission for user={}, files={}, hasBankAccount={}",
                userId, files.length, hasBankAccount);

        // Check if there was a previous attempt
        Optional<NgoRegistrationSubmission> prevSubmission = submissionRepository.findTopByNgoApplicantIdOrderBySubmittedAtDesc(userId);

        // Create fresh submission row
        NgoRegistrationSubmission submission = new NgoRegistrationSubmission();
        submission.setNgoApplicantId(userId);
        submission.setHasBankAccount(hasBankAccount);
        submission.setStatus(prevSubmission.isPresent() ? SubmissionStatus.RESUBMITTED : SubmissionStatus.PENDING);
        submission = submissionRepository.save(submission);

        // Classify documents and perform OCR extraction
        Set<DocumentType> uploadedDocTypes = new HashSet<>();
        List<String> fileNames = new ArrayList<>();
        Map<String, List<OcrExtractionService.OcrResult>> allResults = new HashMap<>();

        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
            fileNames.add(originalFilename);
            DocumentType docType = classifierService.classifyDocument(file);
            uploadedDocTypes.add(docType);

            // Record document in DB
            NgoRegistrationDocument regDoc = new NgoRegistrationDocument();
            regDoc.setSubmissionId(submission.getId());
            regDoc.setDocumentType(docType);
            regDoc.setFileName(originalFilename);
            regDoc.setFileReference(originalFilename);
            regDoc.setIsMandatoryForThisSubmission(docType != DocumentType.DARPAN && (docType != DocumentType.BANK_ACCOUNT || hasBankAccount));
            documentRepository.save(regDoc);

            // Extract fields per document type
            List<OcrExtractionService.OcrResult> results = ocrService.extractFields(file, docType.name());
            if (!results.isEmpty()) {
                allResults.computeIfAbsent(docType.name(), k -> new ArrayList<>()).addAll(results);
            }
        }

        // Run 4-part scoring model & anti-fraud verification
        NgoVerificationScoringService.ScoringResult scoring = scoringService.evaluateSubmission(
                uploadedDocTypes,
                fileNames,
                hasBankAccount,
                allResults,
                submission.getId()
        );

        // Save fields
        fieldRepository.saveAll(scoring.processedFields);

        // Update submission scores and status
        submission.setOverallScore(scoring.overallScore);
        submission.setCompletenessScore(scoring.completenessScore);
        submission.setOcrConfidenceScore(scoring.ocrConfidenceScore);
        submission.setConsistencyScore(scoring.consistencyScore);
        submission.setAuthenticityScore(scoring.authenticityScore);
        submission.setDecidedAt(LocalDateTime.now());

        if (scoring.isPassed) {
            submission.setStatus(SubmissionStatus.PENDING); // Pending review & confirm
        } else {
            submission.setStatus(SubmissionStatus.REJECTED_LOW_SCORE);
            submission.setRejectionReason(String.join(" | ", scoring.rejectionReasons));
        }
        submissionRepository.save(submission);

        log.info("[NGO_REGISTRATION] Submission id={}, overallScore={}%, passed={}",
                submission.getId(), scoring.overallScore, scoring.isPassed);

        Map<String, Object> response = new HashMap<>();
        response.put("submissionId", submission.getId());
        response.put("overallScore", scoring.overallScore);
        response.put("completenessScore", scoring.completenessScore);
        response.put("ocrConfidenceScore", scoring.ocrConfidenceScore);
        response.put("consistencyScore", scoring.consistencyScore);
        response.put("authenticityScore", scoring.authenticityScore);
        response.put("isPassed", scoring.isPassed);
        response.put("status", submission.getStatus().name());
        response.put("rejectionReasons", scoring.rejectionReasons);

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve full details of a submission (for Review & Confirm or Rejection display).
     */
    @GetMapping("/submission/{id}")
    public ResponseEntity<?> getSubmission(@PathVariable UUID id) {
        Optional<NgoRegistrationSubmission> subOpt = submissionRepository.findById(id);
        if (subOpt.isEmpty()) return ResponseEntity.notFound().build();

        NgoRegistrationSubmission submission = subOpt.get();
        List<NgoRegistrationField> fields = fieldRepository.findBySubmissionId(id);
        List<NgoRegistrationDocument> docs = documentRepository.findBySubmissionId(id);

        Map<String, Object> response = new HashMap<>();
        response.put("submission", submission);
        response.put("fields", fields);
        response.put("documents", docs);
        return ResponseEntity.ok(response);
    }

    /**
     * Resolve / edit final values for fields on Review & Confirm screen.
     * Manually entered/edited fields receive UNVERIFIED_MANUAL_ENTRY status with capped confidence.
     */
    @PatchMapping("/submission/{id}/fields")
    public ResponseEntity<?> resolveField(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String fieldName = request.get("fieldName");
        String finalValue = request.get("resolvedValue");
        if (finalValue == null) finalValue = request.get("finalValue");

        Optional<NgoRegistrationField> fieldOpt = fieldRepository.findBySubmissionIdAndFieldName(id, fieldName);
        if (fieldOpt.isPresent()) {
            NgoRegistrationField field = fieldOpt.get();
            field.setFinalValue(finalValue);
            field.setFieldStatus(NgoRegistrationField.FieldStatus.UNVERIFIED_MANUAL_ENTRY);
            field.setConfidenceScore(new java.math.BigDecimal("50.00"));
            fieldRepository.save(field);
            return ResponseEntity.ok(field);
        }

        // If field doesn't exist yet, create it as unverified manual entry
        NgoRegistrationField newField = new NgoRegistrationField();
        newField.setSubmissionId(id);
        newField.setFieldName(fieldName);
        newField.setFinalValue(finalValue);
        newField.setFieldStatus(NgoRegistrationField.FieldStatus.UNVERIFIED_MANUAL_ENTRY);
        newField.setConfidenceScore(new java.math.BigDecimal("50.00"));
        fieldRepository.save(newField);
        return ResponseEntity.ok(newField);
    }

    /**
     * Finalizes registration after user confirms on Review & Confirm screen.
     * Enforces >= 45% threshold check before creating NGO Profile.
     */
    @PostMapping("/submission/{id}/confirm")
    public ResponseEntity<?> confirmSubmission(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, Object> extraData
    ) {
        Optional<NgoRegistrationSubmission> subOpt = submissionRepository.findById(id);
        if (subOpt.isEmpty()) return ResponseEntity.notFound().build();

        NgoRegistrationSubmission submission = subOpt.get();
        if (submission.getOverallScore() == null || submission.getOverallScore() < 45.0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Registration blocked: Verification score (" + submission.getOverallScore() + "%) is below the required 45.0% threshold."
            ));
        }

        List<NgoRegistrationField> fields = fieldRepository.findBySubmissionId(id);
        Map<String, String> fieldMap = new HashMap<>();
        for (NgoRegistrationField f : fields) {
            if (f.getFinalValue() != null) {
                fieldMap.put(f.getFieldName(), f.getFinalValue());
            }
        }

        User user = userRepository.findById(submission.getNgoApplicantId()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("message", "User not found"));

        user.setVerified(true);
        userRepository.save(user);

        NgoProfile profile = ngoProfileRepository.findByUserId(user.getId()).orElse(new NgoProfile());
        profile.setUser(user);
        profile.setOrgName(fieldMap.getOrDefault("orgName", "Verified NGO"));
        profile.setDarpanId(fieldMap.get("darpanId"));
        profile.setPanNumber(fieldMap.get("panNumber"));
        
        String regTypeStr = fieldMap.get("registrationType");
        if (regTypeStr != null) {
            if (regTypeStr.toUpperCase().contains("SOCIETY")) {
                profile.setRegistrationType(NgoProfile.RegistrationType.SOCIETY);
            } else if (regTypeStr.toUpperCase().contains("SECTION_8") || regTypeStr.toUpperCase().contains("SECTION 8")) {
                profile.setRegistrationType(NgoProfile.RegistrationType.SECTION_8);
            } else {
                profile.setRegistrationType(NgoProfile.RegistrationType.TRUST);
            }
        }
        
        profile.setRegistrationNumber(fieldMap.get("registrationNumber"));
        profile.setRegisteredAddress(fieldMap.get("registeredAddress"));
        profile.setVerificationStatus(NgoProfile.VerificationStatus.VERIFIED);
        ngoProfileRepository.save(profile);

        submission.setStatus(SubmissionStatus.VERIFIED);
        submissionRepository.save(submission);

        log.info("[NGO_REGISTRATION] Successfully confirmed NGO profile for user={}", user.getEmail());
        return ResponseEntity.ok(Map.of("message", "Registration successfully confirmed!", "profile", profile));
    }
}
