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
    @DisplayName("Test 1: Clean genuine document set with 0 conflicts scores near 100% and passes")
    public void testCleanGenuineDocumentSet() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT,
                DocumentType.DARPAN
        ));
        List<String> filenames = Arrays.asList("1_legal.png", "2_pan.png", "3_constitution.png", "4_address.png", "5_board.png", "6_cheque.png", "7_darpan.png");

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

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, filenames, true, ocrResults, UUID.randomUUID());

        System.out.println("=== Test 1 Clean Score ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Consistency: " + result.consistencyScore + "/35");
        System.out.println("Authenticity: " + result.authenticityScore + "/20");

        assertTrue(result.isPassed);
        assertEquals(35.0, result.consistencyScore, "0 conflicts should yield 35/35 consistency score");
        assertEquals(20.0, result.authenticityScore);
        assertTrue(result.overallScore >= 90.0);
    }

    @Test
    @DisplayName("Test 2: Proportional Consistency with partial conflicts yields proportional score, not 0")
    public void testProportionalConsistencyScore() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        // 3 matching org names, 1 minor mismatch
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Pratham Education Foundation", 95.0),
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 95.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATP1234K", 95.0),
                new OcrResult("orgName", "Pratham Education Foundation", 95.0)
        ));
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "TRUST/BLR/01", 95.0),
                new OcrResult("orgName", "Pratham Education Trust", 95.0) // Fuzzy match / partial
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "123 MG Road, Bengaluru 560001", 95.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("trusteeDetails", "Ramesh Kumar, Trustee", 95.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), false, ocrResults, UUID.randomUUID());

        System.out.println("=== Test 2 Proportional Consistency Score ===");
        System.out.println("Consistency: " + result.consistencyScore + "/35");

        assertTrue(result.consistencyScore > 10.0 && result.consistencyScore <= 35.0,
                "Partial match should yield a proportional consistency score (got " + result.consistencyScore + "), not 0/35");
        assertEquals(17.5, result.consistencyScore);
    }

    @Test
    @DisplayName("Test 3: The exact fake-packet from bug report is caught and hard-capped < 45% (REJECTED)")
    public void testFakePacketFromBugReportIsBlocked() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY,
                DocumentType.BANK_ACCOUNT,
                DocumentType.DARPAN
        ));

        List<String> filenames = Arrays.asList(
                "1_legal_registration_cert.png",
                "2_pan_card.png",
                "3_constitution_trust_deed.png",
                "4_address_proof.png",
                "5_governing_body_resolution.png",
                "6_bank_cancelled_cheque.png",
                "7_darpan_certificate.png"
        );

        Map<String, List<OcrResult>> ocrResults = new HashMap<>();
        // Mismatched names, corrupted PAN, placeholder tokens
        ocrResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("registrationNumber", "MH/PUN/2018/999", 95.0),
                new OcrResult("registrationDate", "10-01-2018", 93.0),
                new OcrResult("registeringAuthority", "Charity Commissioner Pune", 90.0),
                new OcrResult("orgName", "Shree Ganesh Educational Trust", 94.0)
        ));
        ocrResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "999INVALIDPAN", 99.0), // MALFORMED PAN
                new OcrResult("orgName", "Bright Future Foundation", 96.0)
        ));
        ocrResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Rural Hope Initiative", 97.0),
                new OcrResult("registrationType", "Section 8 Company", 98.0),
                new OcrResult("registeredAddress", "Plot 99 Industrial Area, Noida, Uttar Pradesh 201301", 92.0),
                new OcrResult("objectivesClause", "Environment and pollution control", 91.0)
        ));
        ocrResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("registeredAddress", "Flat 4B Marine Drive, Nariman Point, Mumbai, Maharashtra 400020", 95.0),
                new OcrResult("orgName", "Global Green Trust", 93.0)
        ));
        ocrResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("orgName", "Apex Healthcare Mission", 94.0),
                new OcrResult("authorizedSignatoryName", "Vikram Singhania", 95.0)
        ));
        ocrResults.put("BANK_ACCOUNT", Arrays.asList(
                new OcrResult("orgName", "Sunrise Welfare Society", 95.0),
                new OcrResult("bankAccountNumber", "12345", 99.0),
                new OcrResult("ifscCode", "FAKE0000000", 99.0) // MALFORMED FAKE IFSC
        ));
        ocrResults.put("DARPAN", Arrays.asList(
                new OcrResult("darpanId", "99/CORRUPT/000", 99.0),
                new OcrResult("orgName", "Lotus Child Care NGO", 96.0)
        ));

        ScoringResult result = scoringService.evaluateSubmission(uploadedDocs, filenames, true, ocrResults, UUID.randomUUID());

        System.out.println("=== Test 3 Fake Packet Score ===");
        System.out.println("Overall Score: " + result.overallScore + "%");
        System.out.println("Passed Gate: " + result.isPassed);
        System.out.println("Has Suspected Fabrication: " + result.hasSuspectedFabrication);
        System.out.println("Rejection Reasons: " + result.rejectionReasons);

        assertFalse(result.isPassed, "Fake packet MUST be rejected and marked isPassed = false");
        assertTrue(result.overallScore < 45.0, "Score must be strictly below 45% (got " + result.overallScore + "%)");
        assertTrue(result.hasSuspectedFabrication, "Must detect suspected fabricated content");
        assertFalse(result.rejectionReasons.isEmpty());

        // Verify that malformed PAN is marked SUSPECTED_FABRICATED
        Optional<NgoRegistrationField> panField = result.processedFields.stream()
                .filter(f -> f.getFieldName().equals("panNumber"))
                .findFirst();
        assertTrue(panField.isPresent());
        assertEquals(FieldStatus.SUSPECTED_FABRICATED, panField.get().getFieldStatus());

        // Verify that malformed IFSC is marked SUSPECTED_FABRICATED
        Optional<NgoRegistrationField> ifscField = result.processedFields.stream()
                .filter(f -> f.getFieldName().equals("ifscCode"))
                .findFirst();
        assertTrue(ifscField.isPresent());
        assertEquals(FieldStatus.SUSPECTED_FABRICATED, ifscField.get().getFieldStatus());
    }
}
