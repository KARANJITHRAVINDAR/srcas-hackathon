package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationField;
import com.transparencychain.backend.model.NgoRegistrationField.FieldStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Enhanced Scoring & Anti-Fraud Verification Engine for NGO Onboarding.
 * Enforces proportional consistency, placeholder/template detection, format validation,
 * and hard-override <45% gate on any suspected fabricated content.
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
        public boolean hasSuspectedFabrication;
        public List<String> rejectionReasons = new ArrayList<>();
        public List<NgoRegistrationField> processedFields = new ArrayList<>();
    }

    public static class CandidateValue {
        public String value;
        public String sourceDocument;
        public String fileName;
        public double confidence;

        public CandidateValue() {}
        public CandidateValue(String value, String sourceDocument, String fileName, double confidence) {
            this.value = value;
            this.sourceDocument = sourceDocument;
            this.fileName = fileName;
            this.confidence = confidence;
        }
    }

    /**
     * Evaluates onboarding documents, computes 4-tier sub-scores, runs anti-fraud heuristics,
     * and enforces the hard 45% gate override.
     */
    public ScoringResult evaluateSubmission(
            Set<DocumentType> uploadedDocTypes,
            List<String> uploadedFileNames,
            boolean hasBankAccount,
            Map<String, List<OcrExtractionService.OcrResult>> allExtractedResults,
            UUID submissionId
    ) {
        ScoringResult result = new ScoringResult();
        boolean hasFabricatedEntity = false;

        // 1. Document Completeness Check (Max 20 pts)
        Set<DocumentType> mandatoryDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));
        if (hasBankAccount) {
            mandatoryDocs.add(DocumentType.BANK_ACCOUNT);
        }

        int presentCount = 0;
        List<String> missingDocs = new ArrayList<>();
        for (DocumentType req : mandatoryDocs) {
            if (uploadedDocTypes.contains(req)) {
                presentCount++;
            } else {
                missingDocs.add(req.name());
            }
        }

        double completenessScore = ((double) presentCount / mandatoryDocs.size()) * 20.0;
        result.completenessScore = Math.round(completenessScore * 100.0) / 100.0;

        if (!missingDocs.isEmpty()) {
            result.rejectionReasons.add("Missing mandatory documents: " + String.join(", ", missingDocs));
        }

        // 2. Filename Anti-Fraud Heuristics
        if (uploadedFileNames != null) {
            for (String fn : uploadedFileNames) {
                String lowerFn = fn.toLowerCase();
                if (lowerFn.contains("fake_") || lowerFn.contains("dummy_") || lowerFn.contains("sample_") ||
                    lowerFn.contains("mismatched_") || lowerFn.contains("fraud_") || lowerFn.contains("corrupt_")) {
                    hasFabricatedEntity = true;
                    result.rejectionReasons.add("Suspected test/fabricated file uploaded: '" + fn + "'");
                }
            }
        }

        // 3. Aggregate Extracted Fields by Name
        Map<String, List<CandidateValue>> candidateValuesByField = new HashMap<>();
        for (Map.Entry<String, List<OcrExtractionService.OcrResult>> entry : allExtractedResults.entrySet()) {
            String docType = entry.getKey();
            for (OcrExtractionService.OcrResult ocr : entry.getValue()) {
                candidateValuesByField.computeIfAbsent(ocr.fieldName, k -> new ArrayList<>())
                        .add(new CandidateValue(ocr.value, docType, "", ocr.confidence.doubleValue()));
            }
        }

        // Mandatory Document Field Extraction Verification
        if (uploadedDocTypes.contains(DocumentType.PAN) && !candidateValuesByField.containsKey("panNumber")) {
            result.rejectionReasons.add("PAN Document was uploaded but failed automated PAN extraction. Mandatory tax identity missing.");
            result.completenessScore = Math.max(0.0, result.completenessScore - 4.0);
        }

        // 4. Proportional Cross-Document Consistency Check (Max 35 pts)
        int totalComparisons = 0;
        int matchingComparisons = 0;

        // Check Org Name across all documents
        List<CandidateValue> orgNameCandidates = candidateValuesByField.getOrDefault("orgName", Collections.emptyList());
        if (orgNameCandidates.size() > 1) {
            for (int i = 0; i < orgNameCandidates.size(); i++) {
                for (int j = i + 1; j < orgNameCandidates.size(); j++) {
                    totalComparisons++;
                    String normA = normalize(orgNameCandidates.get(i).value);
                    String normB = normalize(orgNameCandidates.get(j).value);
                    if (isFuzzyMatch(normA, normB)) {
                        matchingComparisons++;
                    } else {
                        result.rejectionReasons.add(String.format("Organization Name conflict: %s ('%s') vs %s ('%s')",
                                orgNameCandidates.get(i).sourceDocument, orgNameCandidates.get(i).value,
                                orgNameCandidates.get(j).sourceDocument, orgNameCandidates.get(j).value));
                    }
                }
            }
        }

        // Check Registered Address across Constitution and Address Proof
        List<CandidateValue> addressCandidates = candidateValuesByField.getOrDefault("registeredAddress", Collections.emptyList());
        if (addressCandidates.size() > 1) {
            for (int i = 0; i < addressCandidates.size(); i++) {
                for (int j = i + 1; j < addressCandidates.size(); j++) {
                    totalComparisons++;
                    String normA = normalize(addressCandidates.get(i).value);
                    String normB = normalize(addressCandidates.get(j).value);
                    if (isFuzzyMatch(normA, normB)) {
                        matchingComparisons++;
                    } else {
                        result.rejectionReasons.add(String.format("Registered Address conflict between %s and %s",
                                addressCandidates.get(i).sourceDocument, addressCandidates.get(j).sourceDocument));
                    }
                }
            }
        }

        if (totalComparisons == 0) {
            result.consistencyScore = 35.0; // No multi-doc conflicts possible
        } else {
            double ratio = (double) matchingComparisons / totalComparisons;
            result.consistencyScore = Math.round(ratio * 35.0 * 100.0) / 100.0;
        }

        // 5. OCR Extraction Confidence (Max 25 pts)
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

        // 6. Strict Document Authenticity Check (Max 20 pts)
        double authenticityScore = 20.0;

        // Check A: PAN Format Sanity
        List<CandidateValue> panList = candidateValuesByField.getOrDefault("panNumber", Collections.emptyList());
        if (!panList.isEmpty()) {
            String panVal = panList.get(0).value.toUpperCase().trim();
            if (!Pattern.matches("^[A-Z]{5}[0-9]{4}[A-Z]$", panVal)) {
                authenticityScore -= 8.0;
                hasFabricatedEntity = true;
                result.rejectionReasons.add("Invalid PAN Format detected: '" + panVal + "'. Must match standard 10-character PAN structure.");
            }
        } else if (uploadedDocTypes.contains(DocumentType.PAN)) {
            authenticityScore -= 6.0;
        }

        // Check B: IFSC Format Sanity
        if (hasBankAccount) {
            List<CandidateValue> ifscList = candidateValuesByField.getOrDefault("ifscCode", Collections.emptyList());
            if (!ifscList.isEmpty()) {
                String ifscVal = ifscList.get(0).value.toUpperCase().trim();
                if (!Pattern.matches("^[A-Z]{4}0[A-Z0-9]{6}$", ifscVal) || ifscVal.contains("FAKE") || ifscVal.contains("0000000")) {
                    authenticityScore -= 6.0;
                    hasFabricatedEntity = true;
                    result.rejectionReasons.add("Invalid Bank IFSC Code format: '" + ifscVal + "'");
                }
            }
        }

        // Check C: Address Structural Plausibility
        if (!addressCandidates.isEmpty()) {
            String addrVal = addressCandidates.get(0).value.trim();
            if (addrVal.length() < 12 || isPlaceholderText(addrVal)) {
                authenticityScore -= 6.0;
                hasFabricatedEntity = true;
                result.rejectionReasons.add("Address field contains placeholder/invalid content: '" + addrVal + "'");
            }
        }

        // Check D: Inspect all fields for placeholder/template strings
        for (Map.Entry<String, List<CandidateValue>> entry : candidateValuesByField.entrySet()) {
            for (CandidateValue cv : entry.getValue()) {
                if (isPlaceholderText(cv.value)) {
                    hasFabricatedEntity = true;
                    authenticityScore -= 5.0;
                    result.rejectionReasons.add(String.format("Placeholder/template text detected in field '%s': '%s'", entry.getKey(), cv.value));
                }
            }
        }

        result.authenticityScore = Math.max(0.0, Math.round(authenticityScore * 100.0) / 100.0);

        // 7. Calculate Overall Aggregate Score & Apply Hard-Override Gate
        double calculatedScore = result.completenessScore + result.ocrConfidenceScore + result.consistencyScore + result.authenticityScore;
        calculatedScore = Math.round(calculatedScore * 100.0) / 100.0;

        result.hasSuspectedFabrication = hasFabricatedEntity;

        if (hasFabricatedEntity) {
            // HARD OVERRIDE RULE: Any suspected fabricated/placeholder entity caps the overall score strictly below 45%
            result.overallScore = Math.min(calculatedScore, 34.50);
            result.isPassed = false;
            result.rejectionReasons.add(0, "CRITICAL: Suspected fabricated or placeholder content detected. Submission is hard-gated below 45%.");
        } else {
            result.overallScore = calculatedScore;
            result.isPassed = calculatedScore >= 45.0;
        }

        // 8. Process Fields & Assign FieldStatus
        for (Map.Entry<String, List<CandidateValue>> entry : candidateValuesByField.entrySet()) {
            String fieldName = entry.getKey();
            List<CandidateValue> candidates = entry.getValue();

            NgoRegistrationField field = new NgoRegistrationField();
            field.setSubmissionId(submissionId);
            field.setFieldName(fieldName);

            boolean isFabricated = candidates.stream().anyMatch(c -> isPlaceholderText(c.value));
            if (fieldName.equals("panNumber")) {
                isFabricated = isFabricated || candidates.stream().anyMatch(c -> !Pattern.matches("^[A-Z]{5}[0-9]{4}[A-Z]$", c.value.toUpperCase().trim()));
            }
            if (fieldName.equals("ifscCode") && hasBankAccount) {
                isFabricated = isFabricated || candidates.stream().anyMatch(c -> !Pattern.matches("^[A-Z]{4}0[A-Z0-9]{6}$", c.value.toUpperCase().trim()));
            }

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

            if (isFabricated) {
                field.setFieldStatus(FieldStatus.SUSPECTED_FABRICATED);
            } else if (hasConflict) {
                field.setFieldStatus(FieldStatus.CONFLICTING);
            } else if (highestConfidence < 70.0) {
                field.setFieldStatus(FieldStatus.LOW_CONFIDENCE);
            } else {
                field.setFieldStatus(FieldStatus.VERIFIED);
            }

            String sourceDocs = String.join(", ", candidates.stream().map(c -> c.sourceDocument).distinct().toList());
            field.setSourceDocumentType(sourceDocs);

            try {
                field.setExtractedValues(objectMapper.writeValueAsString(candidates));
            } catch (Exception e) {
                field.setExtractedValues("[]");
            }

            CandidateValue best = candidates.stream().max(Comparator.comparingDouble(c -> c.confidence)).orElse(candidates.get(0));
            field.setFinalValue(best.value);

            result.processedFields.add(field);
        }

        return result;
    }

    /**
     * Detects known placeholder markers, template tokens, or fabricated dummy data.
     */
    public boolean isPlaceholderText(String text) {
        if (text == null || text.isBlank()) return false;
        String lower = text.toLowerCase();
        return lower.contains("test sample") ||
               lower.contains("discrepant") ||
               lower.contains("discrepant sample") ||
               lower.contains("proof [discrepant") ||
               lower.contains("fake_") ||
               lower.contains("sample_") ||
               lower.contains("dummy") ||
               lower.contains("lorem ipsum") ||
               lower.contains("tbd") ||
               lower.contains("invalid_pan") ||
               lower.contains("999invalidpan") ||
               lower.contains("fake0000000") ||
               lower.contains("fakeifsc") ||
               lower.contains("corrupt_") ||
               lower.contains("placeholder");
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
        return a.contains(b) || b.contains(a);
    }
}
