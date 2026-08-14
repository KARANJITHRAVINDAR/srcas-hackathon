package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationField;
import com.transparencychain.backend.model.NgoRegistrationField.FieldStatus;
import com.transparencychain.backend.model.NgoRegistrationSubmission;
import com.transparencychain.backend.model.NgoRegistrationSubmission.SubmissionStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Core scoring and cross-document consistency verification service for NGO Onboarding.
 * Implements the 4-part weighted scoring model (0-100) and hard 45% gating rule.
 */
@Service
public class NgoVerificationScoringService {

    private static final Logger log = LoggerFactory.getLogger(NgoVerificationScoringService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static class ScoringResult {
        public double overallScore;
        public double completenessScore;
        public double ocrConfidenceScore;
        public double consistencyScore;
        public double authenticityScore;
        public boolean isPassed;
        public List<String> rejectionReasons = new ArrayList<>();
        public List<NgoRegistrationField> processedFields = new ArrayList<>();
    }

    public static class CandidateValue {
        public String value;
        public String sourceDocument;
        public double confidence;

        public CandidateValue() {}
        public CandidateValue(String value, String sourceDocument, double confidence) {
            this.value = value;
            this.sourceDocument = sourceDocument;
            this.confidence = confidence;
        }
    }

    /**
     * Computes the 4-tier score, performs cross-document consistency checks,
     * builds per-field statuses, and decides on registration pass/fail gate.
     */
    public ScoringResult evaluateSubmission(
            Set<DocumentType> uploadedDocTypes,
            boolean hasBankAccount,
            Map<String, List<OcrExtractionService.OcrResult>> allExtractedResults,
            UUID submissionId
    ) {
        ScoringResult result = new ScoringResult();

        // 1. Document Completeness Check (Max 20 pts)
        Set<DocumentType> requiredDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));
        if (hasBankAccount) {
            requiredDocs.add(DocumentType.BANK_ACCOUNT);
        }
        // Note: DARPAN is optional and never required

        int presentCount = 0;
        List<String> missingDocs = new ArrayList<>();
        for (DocumentType req : requiredDocs) {
            if (uploadedDocTypes.contains(req)) {
                presentCount++;
            } else {
                missingDocs.add(req.name());
            }
        }

        double completenessScore = ((double) presentCount / requiredDocs.size()) * 20.0;
        result.completenessScore = Math.round(completenessScore * 100.0) / 100.0;

        if (!missingDocs.isEmpty()) {
            result.rejectionReasons.add("Missing required documents: " + String.join(", ", missingDocs));
        }

        // 2. Aggregate & Merge Extracted Fields by Name
        Map<String, List<CandidateValue>> candidateValuesByField = new HashMap<>();
        for (Map.Entry<String, List<OcrExtractionService.OcrResult>> entry : allExtractedResults.entrySet()) {
            String docType = entry.getKey();
            for (OcrExtractionService.OcrResult ocr : entry.getValue()) {
                candidateValuesByField.computeIfAbsent(ocr.fieldName, k -> new ArrayList<>())
                        .add(new CandidateValue(ocr.value, docType, ocr.confidence.doubleValue()));
            }
        }

        // 3. Cross-Document Consistency Check (Max 35 pts)
        double consistencyPoints = 35.0;
        List<String> conflictMessages = new ArrayList<>();

        // Check Org Name consistency across Constitution, PAN, Bank Account, DARPAN
        List<CandidateValue> orgNameCandidates = candidateValuesByField.getOrDefault("orgName", Collections.emptyList());
        if (orgNameCandidates.size() > 1) {
            String firstNormalized = normalize(orgNameCandidates.get(0).value);
            for (int i = 1; i < orgNameCandidates.size(); i++) {
                String candidateNormalized = normalize(orgNameCandidates.get(i).value);
                if (!isFuzzyMatch(firstNormalized, candidateNormalized)) {
                    consistencyPoints -= 20.0; // Major deduction for org name mismatch
                    conflictMessages.add(String.format("Organization Name mismatch between %s ('%s') and %s ('%s')",
                            orgNameCandidates.get(0).sourceDocument, orgNameCandidates.get(0).value,
                            orgNameCandidates.get(i).sourceDocument, orgNameCandidates.get(i).value));
                    break;
                }
            }
        }

        // Check Registered Address consistency across Constitution and Address Proof
        List<CandidateValue> addressCandidates = candidateValuesByField.getOrDefault("registeredAddress", Collections.emptyList());
        if (addressCandidates.size() > 1) {
            String firstAddr = normalize(addressCandidates.get(0).value);
            for (int i = 1; i < addressCandidates.size(); i++) {
                String candidateAddr = normalize(addressCandidates.get(i).value);
                if (!isFuzzyMatch(firstAddr, candidateAddr)) {
                    consistencyPoints -= 15.0; // Deduction for address mismatch
                    conflictMessages.add(String.format("Registered Address mismatch between %s and %s",
                            addressCandidates.get(0).sourceDocument, addressCandidates.get(i).sourceDocument));
                    break;
                }
            }
        }

        result.consistencyScore = Math.max(0.0, Math.round(consistencyPoints * 100.0) / 100.0);
        result.rejectionReasons.addAll(conflictMessages);

        // 4. OCR Extraction Confidence (Max 25 pts)
        double totalConfidence = 0.0;
        int totalFieldInstances = 0;
        for (List<CandidateValue> list : candidateValuesByField.values()) {
            for (CandidateValue cv : list) {
                totalConfidence += cv.confidence;
                totalFieldInstances++;
            }
        }
        double avgConfidence = totalFieldInstances > 0 ? (totalConfidence / totalFieldInstances) : 0.0;
        double ocrConfidenceScore = (avgConfidence / 100.0) * 25.0;
        result.ocrConfidenceScore = Math.round(ocrConfidenceScore * 100.0) / 100.0;

        // 5. Document Authenticity Check (Max 20 pts)
        double authenticityPoints = 0.0;
        double totalSanityChecks = 4.0;
        double passedSanityChecks = 0.0;

        // Check A: Valid PAN format
        List<CandidateValue> panList = candidateValuesByField.getOrDefault("panNumber", Collections.emptyList());
        if (!panList.isEmpty() && Pattern.matches("^[A-Z]{5}[0-9]{4}[A-Z]$", panList.get(0).value.toUpperCase().trim())) {
            passedSanityChecks += 1.0;
        }

        // Check B: Valid Registration Number exists
        List<CandidateValue> regNoList = candidateValuesByField.getOrDefault("registrationNumber", Collections.emptyList());
        if (!regNoList.isEmpty() && regNoList.get(0).value.length() >= 3) {
            passedSanityChecks += 1.0;
        }

        // Check C: Valid IFSC or waived
        if (!hasBankAccount) {
            passedSanityChecks += 1.0; // Pre-operational waiver
        } else {
            List<CandidateValue> ifscList = candidateValuesByField.getOrDefault("ifscCode", Collections.emptyList());
            if (!ifscList.isEmpty() && Pattern.matches("^[A-Z]{4}0[A-Z0-9]{6}$", ifscList.get(0).value.toUpperCase().trim())) {
                passedSanityChecks += 1.0;
            }
        }

        // Check D: Pin Code in address or valid address format
        if (!addressCandidates.isEmpty() && addressCandidates.get(0).value.length() >= 10) {
            passedSanityChecks += 1.0;
        }

        authenticityPoints = (passedSanityChecks / totalSanityChecks) * 20.0;
        result.authenticityScore = Math.round(authenticityPoints * 100.0) / 100.0;

        // 6. Calculate Overall Aggregate Score (0-100)
        double overallScore = result.completenessScore + result.ocrConfidenceScore + result.consistencyScore + result.authenticityScore;
        result.overallScore = Math.round(overallScore * 100.0) / 100.0;
        result.isPassed = result.overallScore >= 45.0;

        if (!result.isPassed && result.rejectionReasons.isEmpty()) {
            result.rejectionReasons.add("Overall onboarding verification score (" + result.overallScore + "%) is below the minimum required 45.0% threshold.");
        }

        // 7. Build processed field entities with FieldStatus
        for (Map.Entry<String, List<CandidateValue>> entry : candidateValuesByField.entrySet()) {
            String fieldName = entry.getKey();
            List<CandidateValue> candidates = entry.getValue();

            NgoRegistrationField field = new NgoRegistrationField();
            field.setSubmissionId(submissionId);
            field.setFieldName(fieldName);

            // Determine field status
            boolean hasConflict = false;
            if (candidates.size() > 1) {
                String firstVal = normalize(candidates.get(0).value);
                for (int i = 1; i < candidates.size(); i++) {
                    if (!isFuzzyMatch(firstVal, normalize(candidates.get(i).value))) {
                        hasConflict = true;
                        break;
                    }
                }
            }

            double highestConfidence = candidates.stream().mapToDouble(c -> c.confidence).max().orElse(0.0);
            field.setConfidenceScore(BigDecimal.valueOf(highestConfidence).setScale(2, RoundingMode.HALF_UP));

            if (hasConflict) {
                field.setFieldStatus(FieldStatus.CONFLICTING);
            } else if (highestConfidence < 70.0) {
                field.setFieldStatus(FieldStatus.LOW_CONFIDENCE);
            } else {
                field.setFieldStatus(FieldStatus.VERIFIED);
            }

            // Set source documents and candidate values JSON
            String sourceDocs = String.join(", ", candidates.stream().map(c -> c.sourceDocument).distinct().toList());
            field.setSourceDocumentType(sourceDocs);

            try {
                field.setExtractedValues(objectMapper.writeValueAsString(candidates));
            } catch (Exception e) {
                field.setExtractedValues("[]");
            }

            // Default final value to candidate with highest confidence
            CandidateValue best = candidates.stream().max(Comparator.comparingDouble(c -> c.confidence)).orElse(candidates.get(0));
            field.setFinalValue(best.value);

            result.processedFields.add(field);
        }

        return result;
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.toLowerCase()
                .replaceAll("[^a-z0-9]", "")
                .replaceAll("\\s+", "");
    }

    private boolean isFuzzyMatch(String a, String b) {
        if (a.equals(b)) return true;
        if (a.isEmpty() || b.isEmpty()) return false;
        // Contains check for sub-phrases like "Alpha Foundation" vs "The Alpha Foundation"
        return a.contains(b) || b.contains(a);
    }
}
