package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.transparencychain.backend.dto.InvoiceExtractionResult;
import com.transparencychain.backend.dto.InvoiceItem;
import com.transparencychain.backend.model.*;
import com.transparencychain.backend.repository.EvidenceAnalysisRepository;
import com.transparencychain.backend.repository.ReferencePriceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.transparencychain.backend.dto.evidence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AiFraudDetectionService {

    @Autowired
    private OcrExtractionService ocrExtractionService;

    @Autowired
    private EvidenceAnalysisRepository evidenceAnalysisRepository;

    @Autowired
    private ReferencePriceRepository referencePriceRepository;

    @Autowired(required = false)
    private AutomatedEvidenceVerificationService automatedVerificationService;

    public EvidenceAnalysis analyzeProof(MultipartFile file, ProofSubmission proof, String expectedType) {
        EvidenceAnalysis analysis = new EvidenceAnalysis();
        analysis.setProof(proof);
        
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode details = mapper.createObjectNode();
        ArrayNode reasons = mapper.createArrayNode();
        
        if (!"INVOICE".equalsIgnoreCase(expectedType) && !"RECEIPT".equalsIgnoreCase(expectedType)) {
            analysis.setResult(EvidenceAnalysisResult.NOT_APPLICABLE);
            reasons.add("Evidence type is not an invoice or receipt, AI analysis skipped.");
            details.set("reasons", reasons);
            analysis.setAnalysisDetails(details.toString());
            return analysis;
        }

        // 1. OCR Extraction
        InvoiceExtractionResult extracted = ocrExtractionService.extractInvoice(file);
        
        analysis.setRawOcrText(extracted.getRawText());
        analysis.setOcrConfidence(extracted.getOcrConfidence());
        analysis.setVendorName(extracted.getVendorName());
        analysis.setInvoiceNumber(extracted.getInvoiceNumber());
        analysis.setInvoiceDate(extracted.getInvoiceDate());
        analysis.setGstin(extracted.getGstin());
        analysis.setInvoiceAmount(extracted.getTotalAmount());
        analysis.setTaxAmount(extracted.getTaxAmount());

        // Automated Evidence Authenticity Checks (Arithmetic, Geo, Temporal)
        if (automatedVerificationService != null && proof != null) {
            Project project = (proof.getMilestone() != null) ? proof.getMilestone().getProject() : null;
            Milestone milestone = proof.getMilestone();

            List<TaxLineData> taxLines = new ArrayList<>();
            if (extracted.getTaxAmount() != null) {
                taxLines.add(new TaxLineData("Tax Amount", BigDecimal.ZERO, extracted.getTaxAmount()));
            }

            EvidenceItemData itemData = EvidenceItemData.builder()
                    .id(proof.getId() != null ? proof.getId().toString() : UUID.randomUUID().toString())
                    .fileName(file != null ? file.getOriginalFilename() : "document.pdf")
                    .type("INVOICE".equalsIgnoreCase(expectedType) ? EvidenceItemData.EvidenceType.INVOICE : EvidenceItemData.EvidenceType.RECEIPT)
                    .subtotal(extracted.getTotalAmount() != null && extracted.getTaxAmount() != null ? extracted.getTotalAmount().subtract(extracted.getTaxAmount()) : extracted.getTotalAmount())
                    .taxLines(taxLines)
                    .taxAmount(extracted.getTaxAmount())
                    .statedTotal(extracted.getTotalAmount())
                    .printedAddress(extracted.getRawText())
                    .evidenceDate(extracted.getInvoiceDate())
                    .build();

            Double projLat = project != null ? project.getLatitude() : null;
            Double projLon = project != null ? project.getLongitude() : null;

            ProjectContextData projContext = project != null ? ProjectContextData.builder()
                    .projectId(project.getId())
                    .title(project.getTitle())
                    .registeredLatitude(projLat)
                    .registeredLongitude(projLon)
                    .geography(project.getGeography())
                    .build() : null;

            MilestoneContextData msContext = milestone != null ? MilestoneContextData.builder()
                    .milestoneId(milestone.getId())
                    .title(milestone.getTitle())
                    .sequenceNumber(milestone.getSequenceNumber())
                    .evidenceSubmissionDeadline(milestone.getDueDate())
                    .build() : null;

            ItemVerificationResult itemResult = automatedVerificationService.verifyItem(itemData, projContext, msContext, List.of(itemData));
            if (itemResult.getOverallStatus() == ItemVerificationResult.Status.HARD_FAIL) {
                reasons.add("HARD FAIL: " + itemResult.getPrimaryFailureReason());
            } else if (itemResult.getOverallStatus() == ItemVerificationResult.Status.FLAG_FOR_REVIEW) {
                reasons.add("REVIEW FLAG: " + itemResult.getPrimaryFailureReason());
            }
            if (itemResult.getSoftWarnings() != null) {
                for (String sw : itemResult.getSoftWarnings()) {
                    reasons.add("SOFT WARNING: " + sw);
                }
            }
        }

        if (extracted.getOcrConfidence() < 50) {
            analysis.setResult(EvidenceAnalysisResult.OCR_FAILED);
            reasons.add("Document could not be reliably read by OCR.");
            details.set("reasons", reasons);
            analysis.setAnalysisDetails(details.toString());
            return analysis;
        }

        int duplicateScore = 0;
        int vendorRiskScore = 0;
        int priceAnomalyScore = 0;
        int docQualityScore = 100;

        // 2. Duplicate Detection
        if (extracted.getInvoiceNumber() != null && extracted.getVendorName() != null) {
            List<EvidenceAnalysis> duplicates = evidenceAnalysisRepository
                .findByVendorNameIgnoreCaseAndInvoiceNumberIgnoreCase(extracted.getVendorName(), extracted.getInvoiceNumber());
            if (!duplicates.isEmpty()) {
                duplicateScore = 100;
                reasons.add("Invoice number already exists for this vendor.");
            } else {
                reasons.add("No duplicate invoice detected.");
            }
        }
        analysis.setDuplicateScore(duplicateScore);

        // 3. Vendor Validation (GSTIN format)
        if (extracted.getGstin() != null && !extracted.getGstin().isEmpty()) {
            if (extracted.getGstin().matches("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")) {
                reasons.add("Vendor GSTIN format is valid.");
            } else {
                vendorRiskScore = 30;
                reasons.add("Vendor GSTIN format is invalid.");
            }
        } else {
            vendorRiskScore = 10;
            reasons.add("Vendor GSTIN is missing.");
        }
        analysis.setVendorRiskScore(vendorRiskScore);

        // 4. Price Anomaly Detection
        if (extracted.getItems() != null && !extracted.getItems().isEmpty()) {
            boolean anomalyFound = false;
            for (InvoiceItem item : extracted.getItems()) {
                ReferencePrice ref = referencePriceRepository.findByItemNameIgnoreCase(item.getDescription()).orElse(null);
                if (ref != null && item.getUnitPrice() != null) {
                    BigDecimal maxAllowed = ref.getReferencePrice()
                        .multiply(BigDecimal.valueOf(1 + (ref.getAllowedVariancePercentage() / 100.0)));
                    if (item.getUnitPrice().compareTo(maxAllowed) > 0) {
                        priceAnomalyScore += 35; // Add points per anomaly
                        anomalyFound = true;
                        reasons.add("Price anomaly detected for: " + item.getDescription());
                    }
                }
            }
            if (!anomalyFound) {
                reasons.add("Prices are within expected reference range.");
            }
        }
        analysis.setPriceAnomalyScore(Math.min(priceAnomalyScore, 100));

        // 5. Document Quality
        if (extracted.getTotalAmount() == null) {
            docQualityScore -= 20;
            reasons.add("Total amount could not be extracted.");
        }
        if (extracted.getInvoiceDate() == null) {
            docQualityScore -= 10;
            reasons.add("Invoice date could not be extracted.");
        }
        if (extracted.getVendorName() == null) {
            docQualityScore -= 15;
            reasons.add("Vendor name could not be extracted.");
        }
        analysis.setDocumentQualityScore(Math.max(docQualityScore, 0));

        // 6. Final Risk Score
        // Weighting: Duplicate(40) + Price(30) + Vendor(20) + Quality(10)
        double weightedDuplicate = (duplicateScore / 100.0) * 40;
        double weightedPrice = (Math.min(priceAnomalyScore, 100) / 100.0) * 30;
        double weightedVendor = (vendorRiskScore / 100.0) * 20;
        double weightedQuality = ((100 - docQualityScore) / 100.0) * 10; // Inverse, lower quality = higher risk

        int finalRiskScore = (int) (weightedDuplicate + weightedPrice + weightedVendor + weightedQuality);
        analysis.setFraudScore(Math.min(finalRiskScore, 100));

        if (finalRiskScore <= 30) {
            analysis.setResult(EvidenceAnalysisResult.LOW_RISK);
        } else if (finalRiskScore <= 60) {
            analysis.setResult(EvidenceAnalysisResult.REVIEW);
        } else {
            analysis.setResult(EvidenceAnalysisResult.FLAGGED);
        }

        details.set("reasons", reasons);
        analysis.setAnalysisDetails(details.toString());

        return evidenceAnalysisRepository.save(analysis);
    }
}
