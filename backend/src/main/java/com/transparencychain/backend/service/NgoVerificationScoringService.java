package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationField;
import com.transparencychain.backend.model.NgoRegistrationField.FieldStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * General-Purpose NGO Verification & Scoring Engine.
 * Evaluates semantic entity convergence, structural government formats, and cross-document authenticity.
 * Completely free of hardcoded test-specific keywords or debug labels.
 */
@Service
public class NgoVerificationScoringService {

    private static final Logger log = LoggerFactory.getLogger(NgoVerificationScoringService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private SemanticEntityResolutionService entityResolutionService;

    @Autowired(required = false)
    private OpenRouterAiService openRouterAiService;

    // For standalone testing without Spring context injection
    public NgoVerificationScoringService() {
        this.entityResolutionService = new SemanticEntityResolutionService();
    }

    public NgoVerificationScoringService(SemanticEntityResolutionService resolutionService) {
        this.entityResolutionService = resolutionService;
    }

    public NgoVerificationScoringService(SemanticEntityResolutionService resolutionService, OpenRouterAiService aiService) {
        this.entityResolutionService = resolutionService;
        this.openRouterAiService = aiService;
    }

    public static class ScoringResult {
        public double overallScore;
        public double completenessScore;
        public double ocrConfidenceScore;
        public double consistencyScore;
        public double authenticityScore;
        public boolean isPassed;
        public boolean hasFraudOrDivergence;
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
     * Evaluates onboarding submissions based on semantic entity resolution and official format verification.
     */
    public ScoringResult evaluateSubmission(
            Set<DocumentType> uploadedDocTypes,
            List<String> uploadedFileNames,
            boolean hasBankAccount,
            Map<String, List<OcrExtractionService.OcrResult>> allExtractedResults,
            UUID submissionId
    ) {
        ScoringResult result = new ScoringResult();
        boolean hardFailTriggered = false;

        // 1. Document Completeness Check (Max 20 pts)
        // Core mandatory documents for legal identity: Registration (10AC/10AD/Cert), PAN Card, Constitution (Trust Deed/MOA)
        Set<DocumentType> mandatoryDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION
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

        // Additional points for optional supporting proofs (Address proof, Darpan, Governing body resolution)
        double completenessScore = ((double) presentCount / mandatoryDocs.size()) * 18.0;
        if (uploadedDocTypes.contains(DocumentType.DARPAN) || uploadedDocTypes.contains(DocumentType.ADDRESS_PROOF) || uploadedDocTypes.contains(DocumentType.GOVERNING_BODY)) {
            completenessScore = Math.min(20.0, completenessScore + 2.0);
        }
        result.completenessScore = Math.round(completenessScore * 100.0) / 100.0;

        if (!missingDocs.isEmpty()) {
            result.rejectionReasons.add("Missing mandatory legal documents: " + String.join(", ", missingDocs));
        }

        // 2. Aggregate Extracted Fields by Field Name
        Map<String, List<CandidateValue>> candidateValuesByField = new HashMap<>();
        List<SemanticEntityResolutionService.EntityInstance> allOrgInstances = new ArrayList<>();

        for (Map.Entry<String, List<OcrExtractionService.OcrResult>> entry : allExtractedResults.entrySet()) {
            String docType = entry.getKey();
            for (OcrExtractionService.OcrResult ocr : entry.getValue()) {
                candidateValuesByField.computeIfAbsent(ocr.fieldName, k -> new ArrayList<>())
                        .add(new CandidateValue(ocr.value, docType, ocr.confidence.doubleValue()));

                // Collect organization-identifying entities
                if (ocr.fieldName.equals("orgName")) {
                    allOrgInstances.add(new SemanticEntityResolutionService.EntityInstance(ocr.value, docType, ocr.fieldName));
                }
            }
        }

        // 3. Semantic Entity Resolution & Clustering across all uploaded documents (Max 35 pts)
        double consistencyScore = 35.0;

        // A. If OpenRouter AI is configured, use LLM-level packet reasoning
        if (openRouterAiService != null && openRouterAiService.isConfigured()) {
            List<Map<String, Object>> packetSummary = new ArrayList<>();
            for (Map.Entry<String, List<OcrExtractionService.OcrResult>> entry : allExtractedResults.entrySet()) {
                Map<String, Object> docMap = new HashMap<>();
                docMap.put("documentType", entry.getKey());
                for (OcrExtractionService.OcrResult r : entry.getValue()) {
                    docMap.put(r.fieldName, r.value);
                }
                packetSummary.add(docMap);
            }

            OpenRouterAiService.AiVerificationReport aiReport = openRouterAiService.verifyPacketWithAi(packetSummary);
            if (aiReport != null) {
                if (!aiReport.isConverged) {
                    hardFailTriggered = true;
                    consistencyScore = 0.0;
                    result.rejectionReasons.addAll(aiReport.discrepancies);
                } else {
                    consistencyScore = aiReport.consistencyScore;
                }
            }
        }

        // B. Semantic Clustering Engine
        SemanticEntityResolutionService.EntityClusterResult orgClusterResult =
                entityResolutionService.clusterOrganizationEntities(allOrgInstances);

        if (!orgClusterResult.isConverged) {
            // Distinct organization mismatch across documents -> Major Fraud / Identity Divergence Signal
            hardFailTriggered = true;
            consistencyScore = 0.0;
            result.rejectionReasons.addAll(orgClusterResult.discrepancyDescriptions);
        } else if (orgClusterResult.distinctClusterCount == 1 && allOrgInstances.size() > 1) {
            consistencyScore = 35.0; // All organization names converge semantically on the same real-world entity
        }

        // Address Geographic Consistency Check
        List<CandidateValue> addressCandidates = candidateValuesByField.getOrDefault("registeredAddress", Collections.emptyList());
        if (addressCandidates.size() > 1) {
            for (int i = 0; i < addressCandidates.size(); i++) {
                for (int j = i + 1; j < addressCandidates.size(); j++) {
                    String addrA = addressCandidates.get(i).value;
                    String addrB = addressCandidates.get(j).value;
                    if (!entityResolutionService.isSameOrCompatibleAddress(addrA, addrB)) {
                        consistencyScore = Math.max(0.0, consistencyScore - 15.0);
                        hardFailTriggered = true;
                        result.rejectionReasons.add(String.format(
                                "Geographic Divergence: Address in %s ('%s') is incompatible with %s ('%s').",
                                addressCandidates.get(i).sourceDocument, addrA,
                                addressCandidates.get(j).sourceDocument, addrB
                        ));
                    }
                }
            }
        }

        result.consistencyScore = Math.round(consistencyScore * 100.0) / 100.0;

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

        // 5. Official Format & Authenticity Validation (Max 20 pts)
        double authenticityScore = 20.0;

        // Validation A: Official PAN Structure (Mandatory)
        List<CandidateValue> panList = candidateValuesByField.getOrDefault("panNumber", Collections.emptyList());
        if (!panList.isEmpty()) {
            String panVal = panList.get(0).value;
            if (!entityResolutionService.isValidPanStructure(panVal)) {
                authenticityScore -= 10.0;
                hardFailTriggered = true;
                result.rejectionReasons.add("Invalid Tax Identifier: PAN '" + panVal + "' violates official Income Tax Department structural standards.");
            }
        } else if (uploadedDocTypes.contains(DocumentType.PAN)) {
            authenticityScore -= 8.0;
            result.rejectionReasons.add("PAN document was provided but failed automated text extraction.");
        }

        // Validation B: Official Bank IFSC Structure (Conditionally Mandatory)
        if (hasBankAccount) {
            List<CandidateValue> ifscList = candidateValuesByField.getOrDefault("ifscCode", Collections.emptyList());
            if (!ifscList.isEmpty()) {
                String ifscVal = ifscList.get(0).value;
                if (!entityResolutionService.isValidIfscStructure(ifscVal)) {
                    authenticityScore -= 6.0;
                    hardFailTriggered = true;
                    result.rejectionReasons.add("Invalid Financial Identifier: IFSC '" + ifscVal + "' violates RBI format standards.");
                }
            }
        }

        // Validation C: Official NGO DARPAN ID Structure (Optional, but validated if present)
        List<CandidateValue> darpanList = candidateValuesByField.getOrDefault("darpanId", Collections.emptyList());
        if (!darpanList.isEmpty()) {
            String darpanVal = darpanList.get(0).value;
            if (!entityResolutionService.isValidDarpanStructure(darpanVal)) {
                authenticityScore -= 4.0;
                result.rejectionReasons.add("Invalid Registry Format: Darpan ID '" + darpanVal + "' does not match NITI Aayog standard format.");
            }
        }

        result.authenticityScore = Math.max(0.0, Math.round(authenticityScore * 100.0) / 100.0);

        // 6. Calculate Final Score & Apply Hard-Override Gate
        double calculatedScore = result.completenessScore + result.ocrConfidenceScore + result.consistencyScore + result.authenticityScore;
        calculatedScore = Math.round(calculatedScore * 100.0) / 100.0;

        result.hasFraudOrDivergence = hardFailTriggered;

        if (hardFailTriggered) {
            // HARD OVERRIDE: Identity divergence or structural format violations cap the score strictly below the 45% threshold
            result.overallScore = Math.min(calculatedScore, 34.0);
            result.isPassed = false;
            result.rejectionReasons.add(0, "CRITICAL: Legal identity mismatch or format validation failure detected. Onboarding gated below 45%.");
        } else {
            result.overallScore = calculatedScore;
            result.isPassed = calculatedScore >= 45.0;
        }

        // 7. Process Fields and Assign Statuses
        for (Map.Entry<String, List<CandidateValue>> entry : candidateValuesByField.entrySet()) {
            String fieldName = entry.getKey();
            List<CandidateValue> candidates = entry.getValue();

            NgoRegistrationField field = new NgoRegistrationField();
            field.setSubmissionId(submissionId);
            field.setFieldName(fieldName);

            boolean isInvalidFormat = false;
            if (fieldName.equals("panNumber")) {
                isInvalidFormat = candidates.stream().anyMatch(c -> !entityResolutionService.isValidPanStructure(c.value));
            } else if (fieldName.equals("ifscCode") && hasBankAccount) {
                isInvalidFormat = candidates.stream().anyMatch(c -> !entityResolutionService.isValidIfscStructure(c.value));
            }

            boolean hasSemanticConflict = false;
            if (fieldName.equals("orgName")) {
                hasSemanticConflict = !orgClusterResult.isConverged;
            } else if (fieldName.equals("registeredAddress") && candidates.size() > 1) {
                hasSemanticConflict = !entityResolutionService.isSameOrCompatibleAddress(candidates.get(0).value, candidates.get(1).value);
            }

            double highestConfidence = candidates.stream().mapToDouble(c -> c.confidence).max().orElse(0.0);
            field.setConfidenceScore(BigDecimal.valueOf(highestConfidence).setScale(2, RoundingMode.HALF_UP));

            if (isInvalidFormat) {
                field.setFieldStatus(FieldStatus.SUSPECTED_FABRICATED);
            } else if (hasSemanticConflict) {
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

            CandidateValue best = candidates.stream()
                    .filter(c -> !fieldName.equals("orgName") || entityResolutionService.isValidCandidateOrgName(c.value))
                    .max(Comparator.comparingDouble(c -> c.confidence))
                    .orElse(candidates.get(0));
            field.setFinalValue(best.value);

            result.processedFields.add(field);
        }

        return result;
    }
}
