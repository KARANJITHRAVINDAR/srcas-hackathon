package com.transparencychain.backend;

import com.transparencychain.backend.dto.evidence.*;
import com.transparencychain.backend.service.AutomatedEvidenceVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class AutomatedEvidenceVerificationTest {

    private AutomatedEvidenceVerificationService service;
    private ProjectContextData projectContext;
    private MilestoneContextData milestoneContext;

    @BeforeEach
    public void setUp() {
        service = new AutomatedEvidenceVerificationService(
                new BigDecimal("1.00"), // ₹1 tolerance
                5.0,                   // 5 km max radius
                7                      // 7 days grace period
        );

        projectContext = ProjectContextData.builder()
                .title("Coimbatore Rural Water Project")
                .startDate(LocalDate.of(2026, 1, 1))
                .registeredLatitude(11.023240)
                .registeredLongitude(76.986230) // Keeranatham Village, Coimbatore
                .geography("Keeranatham Village, Coimbatore – 641035")
                .build();

        milestoneContext = MilestoneContextData.builder()
                .title("Phase 1 Water Storage Installation")
                .sequenceNumber(1)
                .evidenceSubmissionDeadline(LocalDate.of(2026, 8, 31))
                .build();
    }

    @Test
    @DisplayName("Section 5 Worked Test Case: Invoice arithmetic HARD_FAIL + Photos PASS")
    public void testSection5WorkedTestCase() {
        // 1. Fabricated/Tampered Invoice (SHREE CONSTRUCTIONS SC/24-25/0087)
        EvidenceItemData invoice = EvidenceItemData.builder()
                .id("inv-001")
                .fileName("Invoice_SC_24-25_0087.pdf")
                .type(EvidenceItemData.EvidenceType.INVOICE)
                .subtotal(new BigDecimal("195000.00"))
                .taxLines(Arrays.asList(
                        TaxLineData.builder().label("CGST").rate(new BigDecimal("9.0")).amount(new BigDecimal("17550.00")).build(),
                        TaxLineData.builder().label("SGST").rate(new BigDecimal("9.0")).amount(new BigDecimal("17550.00")).build()
                ))
                .statedTotal(new BigDecimal("211000.00")) // Stated: 2,11,000 | Computed: 2,30,100
                .amountInWords("Two Lakh Eleven Thousand Only")
                .printedAddress("Keeranatham Village, Coimbatore – 641035")
                .evidenceDate(LocalDate.of(2026, 8, 15))
                .build();

        // 2. Geotagged Photo 1 (Site Survey)
        EvidenceItemData photo1 = EvidenceItemData.builder()
                .id("img-001")
                .fileName("site_photo_1.jpg")
                .type(EvidenceItemData.EvidenceType.GEOTAGGED_PHOTO)
                .gpsLatitude(11.023242)
                .gpsLongitude(76.986233)
                .evidenceDate(LocalDate.of(2026, 8, 15))
                .build();

        // 3. Geotagged Photo 2 (Pipe Installation)
        EvidenceItemData photo2 = EvidenceItemData.builder()
                .id("img-002")
                .fileName("site_photo_2.jpg")
                .type(EvidenceItemData.EvidenceType.GEOTAGGED_PHOTO)
                .gpsLatitude(11.023243)
                .gpsLongitude(76.986232)
                .evidenceDate(LocalDate.of(2026, 8, 15))
                .build();

        // Single invoice verification test
        ItemVerificationResult invResult = service.verifyItem(invoice, projectContext, milestoneContext, Arrays.asList(invoice, photo1, photo2));
        assertEquals(ItemVerificationResult.Status.HARD_FAIL, invResult.getArithmeticStatus());
        assertEquals(new BigDecimal("19100.00"), invResult.getArithmeticDiscrepancy());
        assertTrue(invResult.getArithmeticReason().contains("does not match subtotal + tax"));

        // Photos individual verification test
        ItemVerificationResult photo1Result = service.verifyItem(photo1, projectContext, milestoneContext, Arrays.asList(invoice, photo1, photo2));
        assertEquals(ItemVerificationResult.Status.PASS, photo1Result.getGeoStatus());
        assertEquals(ItemVerificationResult.Status.PASS, photo1Result.getTemporalStatus());
        assertEquals(ItemVerificationResult.Status.PASS, photo1Result.getOverallStatus());

        ItemVerificationResult photo2Result = service.verifyItem(photo2, projectContext, milestoneContext, Arrays.asList(invoice, photo1, photo2));
        assertEquals(ItemVerificationResult.Status.PASS, photo2Result.getGeoStatus());
        assertEquals(ItemVerificationResult.Status.PASS, photo2Result.getTemporalStatus());

        // Batch submission test
        BatchVerificationResult batchResult = service.evaluateEvidenceSubmission(
                Arrays.asList(invoice, photo1, photo2), projectContext, milestoneContext
        );

        assertEquals(BatchVerificationResult.Decision.REJECTED_RESUBMISSION_REQUIRED, batchResult.getDecision());
        assertEquals(1, batchResult.getFailingItemIds().size());
        assertEquals("inv-001", batchResult.getFailingItemIds().get(0));
    }

    @Test
    @DisplayName("Clean Invoice Control Test: subtotal + tax = total exactly (PASS)")
    public void testCleanInvoicePasses() {
        EvidenceItemData cleanInvoice = EvidenceItemData.builder()
                .id("inv-clean")
                .fileName("Clean_Vendor_Bill.pdf")
                .type(EvidenceItemData.EvidenceType.INVOICE)
                .subtotal(new BigDecimal("100000.00"))
                .taxLines(Arrays.asList(
                        TaxLineData.builder().label("CGST").rate(new BigDecimal("9.0")).amount(new BigDecimal("9000.00")).build(),
                        TaxLineData.builder().label("SGST").rate(new BigDecimal("9.0")).amount(new BigDecimal("9000.00")).build()
                ))
                .statedTotal(new BigDecimal("118000.00"))
                .amountInWords("One Lakh Eighteen Thousand Only")
                .evidenceDate(LocalDate.of(2026, 8, 10))
                .build();

        ItemVerificationResult res = service.verifyItem(cleanInvoice, projectContext, milestoneContext, Arrays.asList(cleanInvoice));
        assertEquals(ItemVerificationResult.Status.PASS, res.getArithmeticStatus());
        assertEquals(ItemVerificationResult.Status.PASS, res.getOverallStatus());
    }

    @Test
    @DisplayName("Geo Cross-Check Test: Photo coordinates 50km away -> FLAG_FOR_REVIEW")
    public void testGeoMismatchFlagsForReview() {
        EvidenceItemData farPhoto = EvidenceItemData.builder()
                .id("img-far")
                .fileName("wrong_location_photo.jpg")
                .type(EvidenceItemData.EvidenceType.GEOTAGGED_PHOTO)
                .gpsLatitude(11.400000) // ~50 km away from Keeranatham
                .gpsLongitude(77.300000)
                .evidenceDate(LocalDate.of(2026, 8, 15))
                .build();

        ItemVerificationResult res = service.verifyItem(farPhoto, projectContext, milestoneContext, Arrays.asList(farPhoto));
        assertEquals(ItemVerificationResult.Status.FLAG_FOR_REVIEW, res.getGeoStatus());
        assertTrue(res.getGeoReason().contains("Evidence location is"));
        assertEquals(ItemVerificationResult.Status.FLAG_FOR_REVIEW, res.getOverallStatus());
    }

    @Test
    @DisplayName("Temporal Check Test: Evidence predating project start date -> FLAG_FOR_REVIEW")
    public void testTemporalPredatingFlagsForReview() {
        EvidenceItemData oldInvoice = EvidenceItemData.builder()
                .id("inv-old")
                .fileName("Pre_Project_Invoice.pdf")
                .type(EvidenceItemData.EvidenceType.INVOICE)
                .subtotal(new BigDecimal("5000.00"))
                .statedTotal(new BigDecimal("5000.00"))
                .evidenceDate(LocalDate.of(2025, 12, 1)) // Project started 2026-01-01
                .build();

        ItemVerificationResult res = service.verifyItem(oldInvoice, projectContext, milestoneContext, Arrays.asList(oldInvoice));
        assertEquals(ItemVerificationResult.Status.FLAG_FOR_REVIEW, res.getTemporalStatus());
        assertTrue(res.getTemporalReason().contains("predates the project's start date"));
    }

    @Test
    @DisplayName("Guardrail 6.1 Test: Per-item surgical rejection (only bad item rejected)")
    public void testPerItemSurgicalRejection() {
        EvidenceItemData badInvoice = EvidenceItemData.builder()
                .id("bad-inv")
                .fileName("bad_invoice.pdf")
                .type(EvidenceItemData.EvidenceType.INVOICE)
                .subtotal(new BigDecimal("10000.00"))
                .taxAmount(new BigDecimal("1800.00"))
                .statedTotal(new BigDecimal("9000.00")) // Mismatch!
                .evidenceDate(LocalDate.of(2026, 8, 1))
                .build();

        EvidenceItemData goodPhoto = EvidenceItemData.builder()
                .id("good-photo")
                .fileName("good_photo.jpg")
                .type(EvidenceItemData.EvidenceType.GEOTAGGED_PHOTO)
                .gpsLatitude(11.023240)
                .gpsLongitude(76.986230)
                .evidenceDate(LocalDate.of(2026, 8, 1))
                .build();

        BatchVerificationResult batch = service.evaluateEvidenceSubmission(
                Arrays.asList(badInvoice, goodPhoto), projectContext, milestoneContext
        );

        assertEquals(BatchVerificationResult.Decision.REJECTED_RESUBMISSION_REQUIRED, batch.getDecision());
        assertEquals(1, batch.getFailingItemIds().size());
        assertTrue(batch.getFailingItemIds().contains("bad-inv"));
        assertFalse(batch.getFailingItemIds().contains("good-photo"));
    }
}
