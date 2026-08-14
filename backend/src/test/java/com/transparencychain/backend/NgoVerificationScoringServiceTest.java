package com.transparencychain.backend;

import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationField;
import com.transparencychain.backend.model.NgoRegistrationField.FieldStatus;
import com.transparencychain.backend.service.NgoVerificationScoringService;
import com.transparencychain.backend.service.NgoVerificationScoringService.ScoringResult;
import com.transparencychain.backend.service.OcrExtractionService.OcrResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class NgoVerificationScoringServiceTest {

    private NgoVerificationScoringService scoringService;

    @BeforeEach
    public void setup() {
        scoringService = new NgoVerificationScoringService();
    }

    @Test
    @DisplayName("Scenario 1: Clean full document set passes with high score >= 45%")
    public void testCleanFullDocumentSet() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT,
                DocumentType.DARPAN
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Pratham Education Foundation", 97.0),
                new OcrResult("registrationType", "Trust", 98.0),
                new OcrResult("dateOfEstablishment", "2015-05-10", 95.0),
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru, Karnataka 560001", 93.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATP1234K", 99.0),
                new OcrResult("orgName", "Pratham Education Foundation", 96.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TRUST/BLR/2015/001", 95.0),
                new OcrResult("registrationDate", "2015-05-10", 94.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru, Karnataka 560001", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Dr. Ramesh Kumar, Managing Trustee", 92.0),
                new OcrResult("authorizedSignatoryName", "Dr. Ramesh Kumar", 95.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Pratham Education Foundation", 95.0),
                new OcrResult("bankAccountNumber", "9876543210123", 99.0),
                new OcrResult("ifscCode", "SBIN0001234", 99.5)
        ));
        ocrResults.put("DARPAN", Arrays.asList(
                new OcrResult("darpanId", "KA/2015/0012345", 99.0),
                new OcrResult("orgName", "Pratham Education Foundation", 96.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 1 Score ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Completeness: " + result.completenessScore + "/20");
        System.out.println("OCR Confidence: " + result.ocrConfidenceScore + "/25");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Authenticity: " + result.authenticityScore + "/20");

        assertTrue(result.isPassed);
        assertTrue(result.overallScore >= 80.0);
        assertEquals(20.0, result.completenessScore);
        assertEquals(35.0, result.consistencyScore);
    }

    @Test
    @DisplayName("Scenario 2: Pre-operational entity missing Bank Account does not block (>= 45%)")
    public void testPreOperationalMissingBankAccount() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "New Hope Initiative", 95.0),
                new OcrResult("registeredAddress", "45 Park Street, Kolkata, West Bengal 700016", 92.0),
                new OcrResult("registrationType", "Society", 95.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATN9876L", 99.0),
                new OcrResult("orgName", "New Hope Initiative", 95.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "SOC/KOL/2024/099", 94.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "45 Park Street, Kolkata, West Bengal 700016", 94.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Sunita Sharma, President", 92.0)
        ));

        // hasBankAccount = false (Pre-operational entity)
        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, false, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 2 Score (Pre-operational) ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Completeness: " + result.completenessScore + "/20");

        assertTrue(result.isPassed);
        assertEquals(20.0, result.completenessScore, "Completeness should be 100% (20/20) since bank account is waived");
        assertTrue(result.overallScore >= 45.0);
    }

    @Test
    @DisplayName("Scenario 3: Missing Darpan ID never blocks submission (>= 45%)")
    public void testMissingDarpanIdNeverBlocks() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT
        )); // Darpan omitted

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Rural Health Care Trust", 96.0),
                new OcrResult("registeredAddress", "10 North Road, Chennai, Tamil Nadu 600001", 92.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATR5555M", 99.0),
                new OcrResult("orgName", "Rural Health Care Trust", 95.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TR/CHN/2020/44", 94.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "10 North Road, Chennai, Tamil Nadu 600001", 94.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "V. Balaji, Trustee", 92.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Rural Health Care Trust", 95.0),
                new OcrResult("bankAccountNumber", "112233445566", 99.0),
                new OcrResult("ifscCode", "HDFC0001234", 99.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 3 Score (No Darpan) ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Completeness: " + result.completenessScore + "/20");

        assertTrue(result.isPassed);
        assertEquals(20.0, result.completenessScore);
        assertTrue(result.overallScore >= 45.0);
    }

    @Test
    @DisplayName("Scenario 4: Deliberately mismatched Org Name & Address drops score < 45% and blocks")
    public void testMismatchedDocumentsFailAndBlock() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION
        )); // Missing mandatory docs + severe conflicts

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        // Mismatched Org Name across docs
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Alpha Healthcare Trust", 40.0), // Low confidence
                new OcrResult("registeredAddress", "12 Main St, Delhi", 45.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "INVALID_PAN", 40.0), // Invalid PAN format
                new OcrResult("orgName", "Completely Different Beta Foundation", 40.0) // CONFLICT!
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "X", 30.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 4 Score (Severe Conflicts & Incompleteness) ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Completeness: " + result.completenessScore + "/20");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Rejection Reasons: " + result.rejectionReasons);

        assertFalse(result.isPassed, "Should be blocked because score is below 45%");
        assertTrue(result.overallScore < 45.0);
        assertFalse(result.rejectionReasons.isEmpty());

        // Verify that orgName field is marked as CONFLICTING
        Optional<NgoRegistrationField> orgNameField = result.processedFields.stream()
                .filter(f -> f.getFieldName().equals("orgName"))
                .findFirst();
        assertTrue(orgNameField.isPresent());
        assertEquals(FieldStatus.CONFLICTING, orgNameField.get().getFieldStatus());
    }
}
