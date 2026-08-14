package com.transparencychain.backend;

import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.model.NgoRegistrationField;
import com.transparencychain.backend.model.NgoRegistrationField.FieldStatus;
import com.transparencychain.backend.service.NgoVerificationScoringService;
import com.transparencychain.backend.service.NgoVerificationScoringService.ScoringResult;
import com.transparencychain.backend.service.OcrExtractionService.OcrResult;
import com.transparencychain.backend.service.SemanticEntityResolutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class NgoVerificationScoringServiceTest {

    private SemanticEntityResolutionService entityResolutionService;
    private NgoVerificationScoringService scoringService;

    @BeforeEach
    public void setup() {
        entityResolutionService = new SemanticEntityResolutionService();
        scoringService = new NgoVerificationScoringService(entityResolutionService);
    }

    @Test
    @DisplayName("Scenario 1 (Clean Genuine Set - False Positive Check): Must pass with high score >= 90%")
    public void testScenario1CleanGenuineSet() {
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
                new OcrResult("registrationDate", "2015-05-10", 94.0),
                new OcrResult("orgName", "Pratham Education Foundation", 95.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru, Karnataka 560001", 95.0),
                new OcrResult("orgName", "Pratham Education Foundation", 94.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Dr. Ramesh Kumar, Managing Trustee", 92.0),
                new OcrResult("authorizedSignatoryName", "Dr. Ramesh Kumar", 95.0),
                new OcrResult("orgName", "Pratham Education Foundation", 94.0)
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

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 1: Clean Genuine Document Set ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Authenticity: " + result.authenticityScore + "/20");
        System.out.println("Passed: " + result.isPassed);

        assertTrue(result.isPassed);
        assertEquals(35.0, result.consistencyScore);
        assertEquals(20.0, result.authenticityScore);
        assertTrue(result.overallScore >= 90.0);
    }

    @Test
    @DisplayName("Scenario 2 (Stylistic Name Variants of SAME Entity): Semantic resolution converges, must PASS")
    public void testScenario2StylisticNameVariants() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        // Stylistic variations of the same legal entity
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "The Pratham Education Foundation", 96.0),
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 93.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATP1234K", 99.0),
                new OcrResult("orgName", "Pratham Education Foundation", 96.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TRUST/BLR/2015/001", 95.0),
                new OcrResult("orgName", "Pratham Education Foundation Trust", 95.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Ramesh Kumar, Managing Trustee", 92.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Pratham Education Foundation", 95.0),
                new OcrResult("bankAccountNumber", "9876543210123", 99.0),
                new OcrResult("ifscCode", "SBIN0001234", 99.5)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 2: Stylistic Name Variants ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Passed: " + result.isPassed);

        assertTrue(result.isPassed, "Stylistic variants of the same core entity must NOT be falsely rejected");
        assertEquals(35.0, result.consistencyScore, "Semantic entity resolution must converge variants to 35/35");
        assertTrue(result.overallScore >= 85.0);
    }

    @Test
    @DisplayName("Scenario 3 (Realistic Multi-Entity Forgery): 7 different NGOs -> Identity Divergence -> REJECTED < 45%")
    public void testScenario3RealisticMultiEntityForgery() {
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
        // Realistic but completely different legal organizations
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "MH/PUN/2018/999", 95.0),
                new OcrResult("orgName", "Shree Ganesh Educational Trust", 94.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATP9999P", 99.0),
                new OcrResult("orgName", "Bright Future Foundation", 96.0) // Different entity
        ));
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Rural Hope Initiative", 97.0), // Different entity
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 92.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("orgName", "Global Green Trust", 93.0), // Different entity
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("orgName", "Apex Healthcare Mission", 94.0), // Different entity
                new OcrResult("authorizedSignatoryName", "Vikram Singhania", 95.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Sunrise Welfare Society", 95.0), // Different entity
                new OcrResult("bankAccountNumber", "50100234567890", 99.0),
                new OcrResult("ifscCode", "HDFC0001234", 99.0)
        ));
        ocrResults.put("DARPAN", Arrays.asList(
                new OcrResult("darpanId", "DL/2020/0045678", 99.0),
                new OcrResult("orgName", "Lotus Child Care Foundation", 96.0) // Different entity
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 3: Realistic Multi-Entity Forgery ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Passed: " + result.isPassed);
        System.out.println("Discrepancies: " + result.rejectionReasons);

        assertFalse(result.isPassed, "Multi-entity forgery MUST be blocked");
        assertEquals(0.0, result.consistencyScore, "Consistency must collapse to 0 on identity divergence");
        assertTrue(result.overallScore < 45.0, "Score must be capped strictly below 45% (got " + result.overallScore + "%)");
    }

    @Test
    @DisplayName("Scenario 4 (Structurally Invalid PAN / IFSC): Format validation fails -> REJECTED < 45%")
    public void testScenario4InvalidStructuralFormats() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Kalyan Child Welfare Trust", 96.0),
                new OcrResult("registeredAddress", "10 North Road, Chennai, Tamil Nadu 600001", 93.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "999INVALIDPAN", 99.0), // STRUCTURALLY INVALID PAN FORMAT
                new OcrResult("orgName", "Kalyan Child Welfare Trust", 96.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TR/CHN/2020/44", 95.0),
                new OcrResult("orgName", "Kalyan Child Welfare Trust", 95.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "10 North Road, Chennai, Tamil Nadu 600001", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "V. Balaji, Trustee", 92.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Kalyan Child Welfare Trust", 95.0),
                new OcrResult("bankAccountNumber", "112233445566", 99.0),
                new OcrResult("ifscCode", "HDFC0000000", 99.0) // STRUCTURALLY INVALID BRANCH CODE 000000
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), true, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 4: Structural Format Failure ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Authenticity: " + result.authenticityScore + "/20");
        System.out.println("Passed: " + result.isPassed);

        assertFalse(result.isPassed, "Structurally invalid tax/banking identifiers MUST trigger hard failure");
        assertTrue(result.overallScore < 45.0, "Score must be capped strictly below 45%");
    }

    @Test
    @DisplayName("Scenario 5 (Geographic Divergence): Incompatible states/cities -> REJECTED < 45%")
    public void testScenario5GeographicDivergence() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Sahyadri Rural Health Mission", 96.0),
                new OcrResult("registeredAddress", "Plot 99 Industrial Area, Noida, Uttar Pradesh 201301", 95.0) // NOIDA UP
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATS5555M", 99.0),
                new OcrResult("orgName", "Sahyadri Rural Health Mission", 96.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TR/UP/2021/10", 95.0),
                new OcrResult("orgName", "Sahyadri Rural Health Mission", 95.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                // INCOMPATIBLE ADDRESS: MUMBAI MAHARASHTRA 400020
                new OcrResult("registeredAddress", "Flat 4B Marine Drive, Nariman Point, Mumbai, Maharashtra 400020", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Anil Deshmukh, President", 92.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), false, ocrResults, UUID.randomUUID());

        System.out.println("=== Scenario 5: Geographic Divergence ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Passed: " + result.isPassed);

        assertFalse(result.isPassed, "Geographic incompatibility across legal documents MUST be rejected");
        assertTrue(result.overallScore < 45.0);
    }
}
