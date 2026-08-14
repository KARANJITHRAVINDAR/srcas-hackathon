package com.transparencychain.backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrExtractionService {

    @Value("${document.ai.project-id:}")
    private String projectId;

    @Value("${document.ai.location:us}")
    private String location;

    @Value("${document.ai.processor-id:}")
    private String processorId;

    public static class OcrResult {
        public String fieldName;
        public String value;
        public BigDecimal confidence;

        public OcrResult(String fieldName, String value, double confidence) {
            this.fieldName = fieldName;
            this.value = value;
            this.confidence = BigDecimal.valueOf(confidence);
        }
    }

    public List<OcrResult> extractFields(MultipartFile file, String documentType) {
        List<OcrResult> results = new ArrayList<>();
        String extractedText = "";

        // File validation
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        String contentType = file.getContentType();
        if (contentType == null || contentType.isEmpty()) {
            if (originalFilename.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (originalFilename.endsWith(".png")) {
                contentType = "image/png";
            } else if (originalFilename.endsWith(".jpg") || originalFilename.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (originalFilename.endsWith(".tiff") || originalFilename.endsWith(".tif")) {
                contentType = "image/tiff";
            } else {
                contentType = "application/octet-stream";
            }
        }

        // Limit size to 20MB
        if (file.getSize() > 20 * 1024 * 1024) {
            System.err.println("[DOCUMENT_AI] File size too large: " + file.getSize());
            return results;
        }

        // Try Google Document AI if configured
        if (projectId != null && !projectId.trim().isEmpty() &&
            processorId != null && !processorId.trim().isEmpty()) {
            try {
                System.out.println("[DOCUMENT_AI] Invoking Google Document AI for document type: " + documentType);
                extractedText = extractRawTextWithDocumentAi(file.getBytes(), contentType);
            } catch (Exception e) {
                System.err.println("[DOCUMENT_AI] Document AI call failed. Falling back to local Tesseract OCR. Error: " + e.getMessage());
            }
        }

        // Fallback to Tesseract if Document AI text extraction is empty
        if (extractedText == null || extractedText.trim().isEmpty()) {
            try {
                BufferedImage image = null;
                if (originalFilename.endsWith(".pdf")) {
                    try (InputStream is = file.getInputStream(); PDDocument document = PDDocument.load(is)) {
                        PDFRenderer pdfRenderer = new PDFRenderer(document);
                        if (document.getNumberOfPages() > 0) {
                            image = pdfRenderer.renderImageWithDPI(0, 300);
                        }
                    }
                } else {
                    image = ImageIO.read(file.getInputStream());
                }

                if (image != null) {
                    ITesseract tesseract = new Tesseract();
                    tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
                    tesseract.setLanguage("eng");
                    extractedText = tesseract.doOCR(image);
                    System.out.println("[TESSERACT] Local OCR Extracted Text: \n" + extractedText);
                }
            } catch (Exception e) {
                System.err.println("[TESSERACT] Local OCR failed: " + e.getMessage());
            }
        }

        if (extractedText == null || extractedText.isEmpty()) {
            return results;
        }

        // Apply Regex to the extracted text
        switch (documentType) {
            case "PAN_CARD":
                String pan = extractRegex(extractedText, "[A-Z]{5}[0-9]{4}[A-Z]{1}");
                if (pan != null) results.add(new OcrResult("panNumber", pan, 99.8));
                String panName = extractRegex(extractedText, "(?i)Name:\\s*(.+)");
                if (panName != null) results.add(new OcrResult("orgName", panName, 95.0));
                break;
                
            case "DARPAN_CERT":
                String darpanId = extractRegex(extractedText, "[A-Z]{2}/[0-9]{4}/[0-9]+");
                if (darpanId != null) results.add(new OcrResult("darpanId", darpanId, 99.5));
                String darpanOrg = extractRegex(extractedText, "(?i)Org Name:\\s*(.+)");
                if (darpanOrg != null) results.add(new OcrResult("orgName", darpanOrg, 97.0));
                String darpanAddr = extractRegex(extractedText, "(?i)Address:\\s*(.+)");
                if (darpanAddr != null) results.add(new OcrResult("registeredAddress", darpanAddr, 95.0));
                break;
                
            case "TRUST_DEED":
                String tdOrg = extractRegex(extractedText, "(?i)Org Name:\\s*(.+)");
                if (tdOrg != null) results.add(new OcrResult("orgName", tdOrg, 96.5));
                String tdRegType = extractRegex(extractedText, "(?i)Registration Type:\\s*(.+)");
                if (tdRegType != null) results.add(new OcrResult("registrationType", tdRegType, 99.1));
                String tdRegNo = extractRegex(extractedText, "(?i)Registration Number:\\s*(.+)");
                if (tdRegNo != null) results.add(new OcrResult("registrationNumber", tdRegNo, 94.2));
                String tdDate = extractRegex(extractedText, "(?i)Date Of Establishment:\\s*(.+)");
                if (tdDate != null) results.add(new OcrResult("dateOfEstablishment", tdDate, 98.0));
                String tdAddr = extractRegex(extractedText, "(?i)Address:\\s*(.+)");
                if (tdAddr != null) results.add(new OcrResult("registeredAddress", tdAddr, 95.0));
                break;
                
            case "CSR1_ACK":
                String csrOrg = extractRegex(extractedText, "(?i)Org Name:\\s*(.+)");
                if (csrOrg != null) results.add(new OcrResult("orgName", csrOrg, 97.5));
                String csr = extractRegex(extractedText, "(?i)CSR1 Number:\\s*(CSR[O0-9]+)");
                if (csr != null) results.add(new OcrResult("csr1RegistrationNumber", csr.replace("O", "0"), 98.8));
                String csrPan = extractRegex(extractedText, "[A-Z]{5}[0-9]{4}[A-Z]{1}");
                if (csrPan != null) results.add(new OcrResult("panNumber", csrPan, 99.0));
                break;
                
            case "CANCELLED_CHEQUE":
                String ifsc = extractRegex(extractedText, "(?i)IFSC Code:\\s*([A-Z]{4}0[A-Z0-9]{6})");
                if (ifsc != null) results.add(new OcrResult("ifscCode", ifsc, 99.0));
                String chqOrg = extractRegex(extractedText, "(?i)Bank Account Name:\\s*(.+)");
                if (chqOrg != null) results.add(new OcrResult("bankAccountName", chqOrg, 96.0));
                String acc = extractRegex(extractedText, "(?i)A.c\\s*No:\\s*([0-9]+)");
                if (acc != null) results.add(new OcrResult("bankAccountNumber", acc, 99.2));
                break;
                
            case "BOARD_RESOLUTION":
                String brName = extractRegex(extractedText, "(?i)Signatory Name:\\s*(.+)");
                if (brName != null) results.add(new OcrResult("authorizedSignatoryName", brName, 95.0));
                String brDesig = extractRegex(extractedText, "(?i)Signatory Designation:\\s*(.+)");
                if (brDesig != null) results.add(new OcrResult("authorizedSignatoryDesignation", brDesig, 94.0));
                String brPan = extractRegex(extractedText, "(?i)Signatory PAN:\\s*([A-Z]{5}[0-9]{4}[A-Z]{1})");
                if (brPan != null) results.add(new OcrResult("authorizedSignatoryPan", brPan, 98.0));
                break;
                
            case "12A_CERT":
                String reg12 = extractRegex(extractedText, "(?i)12A Number:\\s*(12A-[0-9]+-[0-9]+)");
                if (reg12 != null) results.add(new OcrResult("reg12aNumber", reg12, 98.5));
                String org12 = extractRegex(extractedText, "(?i)Org Name:\\s*(.+)");
                if (org12 != null) results.add(new OcrResult("orgName", org12, 97.5));
                break;
                
            case "80G_CERT":
                String reg80 = extractRegex(extractedText, "(?i)80G Number:\\s*(80G-[0-9]+-[0-9]+)");
                if (reg80 != null) results.add(new OcrResult("reg80gNumber", reg80, 97.5));
                String org80 = extractRegex(extractedText, "(?i)Org Name:\\s*(.+)");
                if (org80 != null) results.add(new OcrResult("orgName", org80, 97.5));
                break;
                
            default:
                break;
        }

        return results;
    }

    public com.transparencychain.backend.dto.InvoiceExtractionResult extractInvoice(MultipartFile file) {
        com.transparencychain.backend.dto.InvoiceExtractionResult result = new com.transparencychain.backend.dto.InvoiceExtractionResult();
        
        // Mime and size validation
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        String contentType = file.getContentType();
        if (contentType == null || contentType.isEmpty()) {
            if (originalFilename.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (originalFilename.endsWith(".png")) {
                contentType = "image/png";
            } else if (originalFilename.endsWith(".jpg") || originalFilename.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (originalFilename.endsWith(".tiff") || originalFilename.endsWith(".tif")) {
                contentType = "image/tiff";
            } else {
                contentType = "application/octet-stream";
            }
        }

        if (file.getSize() > 20 * 1024 * 1024) {
            System.err.println("[DOCUMENT_AI] Rejecting file: size exceeds 20MB limit.");
            result.setOcrConfidence(0);
            result.setRawText("File size exceeds 20MB limit.");
            return result;
        }

        if (!contentType.equals("application/pdf") &&
            !contentType.equals("image/png") &&
            !contentType.equals("image/jpeg") &&
            !contentType.equals("image/tiff")) {
            System.err.println("[DOCUMENT_AI] Rejecting file: unsupported MIME type " + contentType);
            result.setOcrConfidence(0);
            result.setRawText("Unsupported MIME type: " + contentType);
            return result;
        }

        // Try Google Document AI if configured
        if (projectId != null && !projectId.trim().isEmpty() &&
            processorId != null && !processorId.trim().isEmpty()) {
            try {
                System.out.println("[DOCUMENT_AI] Calling live Google Cloud Document AI for Invoice Extraction...");
                return processInvoiceWithDocumentAi(file.getBytes(), contentType);
            } catch (Exception e) {
                System.err.println("[DOCUMENT_AI] Document AI call failed. Falling back to local OCR. Error: " + e.getMessage());
                // Set confidence to 0 to trigger the manual verification route, as specified by requirements
                result.setOcrConfidence(0);
                result.setRawText("Google Document AI failed: " + e.getMessage());
                return result;
            }
        }

        // Fallback local OCR logic
        System.out.println("[TESSERACT] Using local fallback Tesseract OCR...");
        String extractedText = "";
        try {
            BufferedImage image = null;
            if (originalFilename.endsWith(".pdf")) {
                try (InputStream is = file.getInputStream(); PDDocument document = PDDocument.load(is)) {
                    PDFRenderer pdfRenderer = new PDFRenderer(document);
                    if (document.getNumberOfPages() > 0) {
                        image = pdfRenderer.renderImageWithDPI(0, 300);
                    }
                }
            } else {
                image = ImageIO.read(file.getInputStream());
            }

            if (image != null) {
                ITesseract tesseract = new Tesseract();
                tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
                tesseract.setLanguage("eng");
                extractedText = tesseract.doOCR(image);
                result.setRawText(extractedText);
                result.setOcrConfidence(90); // default mock/fallback confidence
            }
        } catch (Exception e) {
            e.printStackTrace();
            result.setRawText("");
            result.setOcrConfidence(0);
        }

        if (extractedText == null || extractedText.isEmpty()) {
            return result;
        }

        // Parse with local regex-based fallback heuristics
        String[] lines = extractedText.split("\n");
        if (lines.length > 0) {
            result.setVendorName(lines[0].trim());
        }

        String invNo = extractRegex(extractedText, "(?i)Invoice\\s*(?:No|Number|#)[:\\s]*([A-Z0-9-]+)");
        result.setInvoiceNumber(invNo);

        String dateStr = extractRegex(extractedText, "(?i)Date[:\\s]*([0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4})");
        if (dateStr != null) {
            try {
                result.setInvoiceDate(java.time.LocalDate.parse(dateStr.replaceAll("/", "-")));
            } catch (Exception ignored) {}
        }

        String gstin = extractRegex(extractedText, "(?i)GSTIN[:\\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})");
        result.setGstin(gstin);

        String amountStr = extractRegex(extractedText, "(?i)(?:Total|Amount|Rs\\.?|INR)[\\s:]*([0-9,]+(?:\\.[0-9]{1,2})?)");
        if (amountStr != null) {
            try {
                result.setTotalAmount(new BigDecimal(amountStr.replace(",", "")));
            } catch (Exception ignored) {}
        }

        List<com.transparencychain.backend.dto.InvoiceItem> items = new ArrayList<>();
        Pattern itemPattern = Pattern.compile("(?i)([^\\n]+?)\\s+([0-9]+(?:\\.[0-9]+)?)\\s+([0-9]+(?:\\.[0-9]+)?)\\s+([0-9,]+(?:\\.[0-9]{1,2})?)\\n");
        Matcher itemMatcher = itemPattern.matcher(extractedText);
        while (itemMatcher.find()) {
            try {
                com.transparencychain.backend.dto.InvoiceItem item = new com.transparencychain.backend.dto.InvoiceItem();
                item.setDescription(itemMatcher.group(1).trim());
                item.setQuantity(new BigDecimal(itemMatcher.group(2)));
                item.setUnitPrice(new BigDecimal(itemMatcher.group(3)));
                item.setTotal(new BigDecimal(itemMatcher.group(4).replace(",", "")));
                items.add(item);
            } catch (Exception ignored) {}
        }
        result.setItems(items);

        return result;
    }

    private String extractRawTextWithDocumentAi(byte[] fileBytes, String contentType) throws Exception {
        throw new UnsupportedOperationException("Google Document AI library not active. Using local OCR fallback.");
    }

    private com.transparencychain.backend.dto.InvoiceExtractionResult processInvoiceWithDocumentAi(
            byte[] fileBytes, 
            String contentType
    ) throws Exception {
        throw new UnsupportedOperationException("Google Document AI library not active. Using local OCR fallback.");
    }

    private String extractRegex(String text, String regex) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(matcher.groupCount() > 0 ? 1 : 0).trim();
        }
        return null;
    }
}
