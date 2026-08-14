package com.transparencychain.backend;

import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import com.transparencychain.backend.service.NgoVerificationScoringService;
import com.transparencychain.backend.service.NgoVerificationScoringService.ScoringResult;
import com.transparencychain.backend.service.OcrExtractionService;
import com.transparencychain.backend.service.OcrExtractionService.OcrResult;
import com.transparencychain.backend.service.SemanticEntityResolutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class RealDocumentExtractionTest {

    private OcrExtractionService ocrService;
    private NgoVerificationScoringService scoringService;
    private SemanticEntityResolutionService resolutionService;

    @BeforeEach
    public void setup() {
        ocrService = new OcrExtractionService();
        resolutionService = new SemanticEntityResolutionService();
        scoringService = new NgoVerificationScoringService(resolutionService);
    }

    @Test
    @DisplayName("Test 1: Real Form 10AC (12A Registration Order) Extraction")
    public void testForm10AcExtraction() {
        String form10AcText = """
                FORM NO. 10AC
                (See rule 17A/11AA/2C)
                Order for registration under section 12A of the Income-tax Act, 1961
                
                1. PAN of the Applicant : AAATC9843M
                2. Name of the Applicant : CARE INDIA FOUNDATION
                3. Address of the Applicant : No.11, 2ND STREET, NAGARAJUNANAGAR, RANGARAJAPURAM, CHENNAI, Tamil Nadu, 600024
                4. Order for registration : 12A
                5. Unique Registration Number (URN) : AAATC9843ME20219
                6. Date of order : 23-09-2021
                
                Digitally signed by SIBICHEN K MATHEW, Principal Commissioner of Income Tax / CIT (Exemption)
                """;

        List<OcrResult> results = ocrService.extractFieldsFromText(form10AcText, "LEGAL_REGISTRATION");
        Map<String, String> map = toMap(results);

        System.out.println("=== Form 10AC Extraction Results ===");
        map.forEach((k, v) -> System.out.println(k + " -> " + v));

        assertEquals("AAATC9843M", map.get("panNumber"));
        assertEquals("CARE INDIA FOUNDATION", map.get("orgName"));
        assertEquals("AAATC9843ME20219", map.get("registrationNumber"));
        assertEquals("23-09-2021", map.get("registrationDate"));
        assertTrue(map.get("registeringAuthority").contains("SIBICHEN K MATHEW") || map.get("registeringAuthority").contains("Income Tax"));
        assertTrue(map.get("registeredAddress").contains("600024"));
    }

    @Test
    @DisplayName("Test 2: Real Form 10AD (80G Approval Order) Extraction")
    public void testForm10AdExtraction() {
        String form10AdText = """
                FORM NO. 10AD
                (See rule 17A/11AA/2C)
                Order for approval under clause (iii) of first proviso to subsection (5) of section 80G
                
                1 | PAN | AAATC9843M
                2 | Name and Address | CARE INDIA FOUNDATION, NO.11, 2ND STREET, NAGARAJUNANAGAR RANGARAJAPURAM, CHENNAI 600024, Tamil Nadu, India
                3 | Approval Number | AAATC9843M23CH01
                4 | Date of order | 21/06/2024
                
                MARUTHUPANDIAN S, CIT (EXEMPTION), CHENNAI
                """;

        List<OcrResult> results = ocrService.extractFieldsFromText(form10AdText, "LEGAL_REGISTRATION");
        Map<String, String> map = toMap(results);

        System.out.println("=== Form 10AD Extraction Results ===");
        map.forEach((k, v) -> System.out.println(k + " -> " + v));

        assertEquals("AAATC9843M", map.get("panNumber"));
        assertEquals("CARE INDIA FOUNDATION", map.get("orgName"));
        assertEquals("AAATC9843M23CH01", map.get("registrationNumber"));
        assertEquals("21/06/2024", map.get("registrationDate"));
        assertTrue(map.get("registeringAuthority").contains("MARUTHUPANDIAN S") || map.get("registeringAuthority").contains("CIT (EXEMPTION)"));
    }

    @Test
    @DisplayName("Test 3: Real Physical PAN Card Photo Extraction (No Label Bleed)")
    public void testPanCardExtraction() {
        String panCardText = """
                INCOME TAX DEPARTMENT
                GOVT. OF INDIA
                
                CARE INDIA FOUNDATION
                Permanent Account Number Card
                AAATC9843M
                Date of Incorporation : 18/03/2008
                """;

        List<OcrResult> results = ocrService.extractFieldsFromText(panCardText, "PAN");
        Map<String, String> map = toMap(results);

        System.out.println("=== PAN Card Extraction Results ===");
        map.forEach((k, v) -> System.out.println(k + " -> " + v));

        assertEquals("AAATC9843M", map.get("panNumber"));
        assertEquals("CARE INDIA FOUNDATION", map.get("orgName"));
        assertNotEquals("Designation", map.get("orgName"));
    }

    @Test
    @DisplayName("Test 4: Real Scanned Multi-Page Trust Deed Extraction")
    public void testTrustDeedExtraction() {
        String trustDeedText = """
                THIS DEED OF TRUST executed on this 18th day of March 2008 at Chennai.
                
                WHEREAS the Author is desirous of establishing a public charitable trust in the name of Care India Foundation
                
                REGISTERED OFFICE:
                The Principal Registered Office of the Trust shall be situated at No.11, 2nd Street, Nagarajunanagar, Rangarajapuram, Chennai – 600 024.
                
                TRUSTEES:
                1. S.Chandrasekar, Managing Trustee
                2. Rajasekar, Trustee
                3. S.Gnanasekar, Trustee
                4. C.Jeyalaskhmi, Trustee
                5. C.Vignaesh, Trustee
                6. T.Sivakumar, Trustee
                
                OBJECTIVES:
                To provide educational support, healthcare assistance, and charitable welfare for underprivileged communities.
                """;

        List<OcrResult> results = ocrService.extractFieldsFromText(trustDeedText, "CONSTITUTION");
        Map<String, String> map = toMap(results);

        System.out.println("=== Trust Deed Extraction Results ===");
        map.forEach((k, v) -> System.out.println(k + " -> " + v));

        assertEquals("Care India Foundation", map.get("orgName"));
        assertEquals("Trust", map.get("registrationType"));
        assertTrue(map.get("registeredAddress").contains("600 024") || map.get("registeredAddress").contains("Chennai"));
        assertEquals("18th day of March 2008", map.get("dateOfEstablishment"));
    }

    @Test
    @DisplayName("Test 5: Full End-to-End Onboarding Verification for Care India Foundation Genuine Packet")
    public void testCareIndiaFoundationFullOnboardingPasses() {
        Set<DocumentType> uploadedDocs = new HashSet<>(Arrays.asList(
                DocumentType.LEGAL_REGISTRATION,
                DocumentType.PAN,
                DocumentType.CONSTITUTION,
                DocumentType.ADDRESS_PROOF,
                DocumentType.GOVERNING_BODY
        ));

        Map<String, List<OcrResult>> allResults = new HashMap<>();

        // Form 10AC results
        allResults.put("LEGAL_REGISTRATION", Arrays.asList(
                new OcrResult("panNumber", "AAATC9843M", 99.5),
                new OcrResult("orgName", "CARE INDIA FOUNDATION", 96.0),
                new OcrResult("registrationNumber", "AAATC9843ME20219", 95.0),
                new OcrResult("registrationDate", "23-09-2021", 94.0),
                new OcrResult("registeringAuthority", "Income Tax Department (Exemption)", 92.0),
                new OcrResult("registeredAddress", "No.11, 2ND STREET, NAGARAJUNANAGAR, RANGARAJAPURAM, CHENNAI, Tamil Nadu, 600024", 93.0)
        ));

        // PAN Card results
        allResults.put("PAN", Arrays.asList(
                new OcrResult("panNumber", "AAATC9843M", 99.8),
                new OcrResult("orgName", "CARE INDIA FOUNDATION", 97.0)
        ));

        // Trust Deed results
        allResults.put("CONSTITUTION", Arrays.asList(
                new OcrResult("orgName", "Care India Foundation", 97.0),
                new OcrResult("registrationType", "Trust", 95.0),
                new OcrResult("registeredAddress", "No.11, 2nd Street, Nagarajunanagar, Rangarajapuram, Chennai – 600 024", 94.0),
                new OcrResult("dateOfEstablishment", "18th day of March 2008", 93.0)
        ));

        // Address Proof results
        allResults.put("ADDRESS_PROOF", Arrays.asList(
                new OcrResult("orgName", "Care India Foundation", 94.0),
                new OcrResult("registeredAddress", "No.11, 2nd Street, Nagarajunanagar, Rangarajapuram, Chennai 600024", 95.0)
        ));

        // Governing Body results
        allResults.put("GOVERNING_BODY", Arrays.asList(
                new OcrResult("orgName", "Care India Foundation", 95.0),
                new OcrResult("trusteeDetails", "S.Chandrasekar, Managing Trustee", 93.0),
                new OcrResult("authorizedSignatoryName", "S.Chandrasekar", 95.0)
        ));

        ScoringResult score = scoringService.evaluateSubmission(uploadedDocs, Collections.emptyList(), false, allResults, UUID.randomUUID());

        System.out.println("=== Care India Foundation Onboarding Score ===");
        System.out.println("Overall Score: " + score.overallScore + "%");
        System.out.println("Consistency: " + score.consistencyScore + "/35");
        System.out.println("Authenticity: " + score.authenticityScore + "/20");
        System.out.println("Passed: " + score.isPassed);

        assertTrue(score.isPassed, "Care India Foundation genuine documents must pass onboarding with high score");
        assertEquals(35.0, score.consistencyScore, "Consistency should be 35/35");
        assertEquals(20.0, score.authenticityScore, "Authenticity should be 20/20");
        assertTrue(score.overallScore >= 95.0);
    }

    private Map<String, String> toMap(List<OcrResult> results) {
        Map<String, String> map = new HashMap<>();
        for (OcrResult r : results) {
            map.put(r.fieldName, r.value);
        }
        return map;
    }
}
