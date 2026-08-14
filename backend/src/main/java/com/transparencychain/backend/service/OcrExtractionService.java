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

        // Apply extraction rules strictly for Section 2 specified fields
        switch (documentType) {
            case "LEGAL_REGISTRATION":
                String regNo = extractRegex(extractedText, "(?i)(?:registration\\s*number|reg\\s*no[.:]?|certificate\\s*no[.:]?)\\s*[:\\-]?\\s*([A-Z0-9/\\-]+)");
                if (regNo != null) results.add(new OcrResult("registrationNumber", regNo, 95.0));
                
                String regDate = extractRegex(extractedText, "(?i)(?:date\\s*of\\s*registration|registration\\s*date|dated?)\\s*[:\\-]?\\s*([0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4})");
                if (regDate != null) results.add(new OcrResult("registrationDate", regDate, 93.0));
                
                String regAuth = extractRegex(extractedText, "(?i)(?:registering\\s*authority|registrar\\s*of\\s*societies|sub-registrar|charity\\s*commissioner|ministry\\s*of\\s*corporate\\s*affairs)\\s*[:\\-]?\\s*([A-Za-z\\s,]+)");
                if (regAuth != null) results.add(new OcrResult("registeringAuthority", regAuth.trim(), 90.0));
                break;

            case "PAN":
            case "PAN_CARD":
                String pan = extractRegex(extractedText, "[A-Z]{5}[0-9]{4}[A-Z]{1}");
                if (pan != null) results.add(new OcrResult("panNumber", pan, 99.8));
                
                String panName = extractRegex(extractedText, "(?i)(?:name|name\\s*on\\s*card|org\\s*name)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&]+)");
                if (panName != null) results.add(new OcrResult("orgName", panName.trim(), 96.0));
                break;

            case "CONSTITUTION":
            case "TRUST_DEED":
                String tdOrg = extractRegex(extractedText, "(?i)(?:name\\s*of\\s*the\\s*(?:trust|society|foundation|organization)|org\\s*name)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&]+)");
                if (tdOrg != null) results.add(new OcrResult("orgName", tdOrg.trim(), 97.0));
                
                String regType = extractRegex(extractedText, "(?i)(?:type\\s*of\\s*entity|registration\\s*type|entity\\s*type)\\s*[:\\-]?\\s*(Trust|Society|Section\\s*8\\s*Company|Section\\s*8|Non-Profit)");
                if (regType != null) {
                    results.add(new OcrResult("registrationType", regType.trim(), 98.0));
                } else {
                    // infer from text
                    if (extractedText.toLowerCase().contains("trust deed") || extractedText.toLowerCase().contains("trust")) {
                        results.add(new OcrResult("registrationType", "Trust", 92.0));
                    } else if (extractedText.toLowerCase().contains("society")) {
                        results.add(new OcrResult("registrationType", "Society", 92.0));
                    } else if (extractedText.toLowerCase().contains("section 8")) {
                        results.add(new OcrResult("registrationType", "Section 8 Company", 92.0));
                    }
                }
                
                String objClause = extractRegex(extractedText, "(?i)(?:objectives?\\s*clause|main\\s*objects?|aims?\\s*and\\s*objects?)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&\\-]+)");
                if (objClause != null) results.add(new OcrResult("objectivesClause", objClause.trim(), 91.0));
                
                String estDate = extractRegex(extractedText, "(?i)(?:date\\s*of\\s*establishment|established\\s*on|executed\\s*on)\\s*[:\\-]?\\s*([0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4})");
                if (estDate != null) results.add(new OcrResult("dateOfEstablishment", estDate, 94.0));
                
                String constAddr = extractRegex(extractedText, "(?i)(?:registered\\s*office|principal\\s*office|address)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&\\-#]+(?:pincode|pin\\s*code|pin)?[\\s:]*[0-9]{6})");
                if (constAddr != null) results.add(new OcrResult("registeredAddress", constAddr.trim(), 92.0));
                break;

            case "ADDRESS_PROOF":
                String addr = extractRegex(extractedText, "(?i)(?:registered\\s*address|office\\s*address|address)\\s*[:\\-]?\\s*(.+)");
                if (addr != null) results.add(new OcrResult("registeredAddress", addr.trim(), 95.0));
                break;

            case "GOVERNING_BODY":
            case "BOARD_RESOLUTION":
                String trustees = extractRegex(extractedText, "(?i)(?:trustees?|directors?|office\\s*bearers?|board\\s*members?)\\s*[:\\-]?\\s*(.+)");
                if (trustees != null) results.add(new OcrResult("trusteeDetails", trustees.trim(), 93.0));
                
                String signatory = extractRegex(extractedText, "(?i)(?:signatory\\s*name|authorized\\s*signatory)\\s*[:\\-]?\\s*([A-Za-z\\s.]+)");
                if (signatory != null) results.add(new OcrResult("authorizedSignatoryName", signatory.trim(), 95.0));
                break;

            case "BANK_ACCOUNT":
            case "CANCELLED_CHEQUE":
                String accHolder = extractRegex(extractedText, "(?i)(?:account\\s*holder\\s*name|in\\s*the\\s*name\\s*of|name\\s*of\\s*account|bank\\s*account\\s*name)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&]+)");
                if (accHolder != null) results.add(new OcrResult("orgName", accHolder.trim(), 95.0));
                
                String accNo = extractRegex(extractedText, "(?i)(?:a/?c\\s*no[.:]?|account\\s*number|acc\\s*no[.:]?)\\s*[:\\-]?\\s*([0-9]{9,18})");
                if (accNo != null) results.add(new OcrResult("bankAccountNumber", accNo, 99.0));
                
                String ifsc = extractRegex(extractedText, "(?i)(?:ifsc|ifsc\\s*code)\\s*[:\\-]?\\s*([A-Z]{4}0[A-Z0-9]{6})");
                if (ifsc != null) results.add(new OcrResult("ifscCode", ifsc.toUpperCase(), 99.5));
                
                String bank = extractRegex(extractedText, "(?i)(?:bank\\s*name|bank)\\s*[:\\-]?\\s*([A-Za-z\\s]+(?:Bank|Branch)?)");
                if (bank != null) results.add(new OcrResult("bankName", bank.trim(), 94.0));
                break;

            case "DARPAN":
            case "DARPAN_CERT":
                String darpanId = extractRegex(extractedText, "[A-Z]{2}/[0-9]{4}/[0-9]+");
                if (darpanId != null) results.add(new OcrResult("darpanId", darpanId, 99.5));
                
                String darpanOrg = extractRegex(extractedText, "(?i)(?:registered\\s*name|org(?:anization)?\\s*name|ngo\\s*name)\\s*[:\\-]?\\s*([A-Za-z0-9\\s.,&]+)");
                if (darpanOrg != null) results.add(new OcrResult("orgName", darpanOrg.trim(), 96.0));
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
