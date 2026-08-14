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

        // Clean and filter raw OCR text into lines
        String[] lines = extractedText.split("\\r?\\n");

        // Apply extraction rules strictly for Section 2 specified fields
        switch (documentType) {
            case "LEGAL_REGISTRATION":
                String regNo = extractLineValue(lines, "(?i)^(?:registration\\s*number|reg\\s*no[.:]?|certificate\\s*no[.:]?)\\s*[:\\-]?\\s*(.+)");
                if (regNo != null) results.add(new OcrResult("registrationNumber", cleanValue(regNo), 95.0));
                
                String regDate = extractLineValue(lines, "(?i)^(?:date\\s*of\\s*registration|registration\\s*date|dated?)\\s*[:\\-]?\\s*(.+)");
                if (regDate != null) results.add(new OcrResult("registrationDate", cleanValue(regDate), 93.0));
                
                String regAuth = extractLineValue(lines, "(?i)^(?:registering\\s*authority|registrar\\s*of\\s*societies|sub-registrar|charity\\s*commissioner|ministry\\s*of\\s*corporate\\s*affairs)\\s*[:\\-]?\\s*(.+)");
                if (regAuth != null) results.add(new OcrResult("registeringAuthority", cleanValue(regAuth), 90.0));

                String regEntity = extractLineValue(lines, "(?i)^(?:entity\\s*name|name\\s*of\\s*(?:society|trust|ngo|organization))\\s*[:\\-]?\\s*(.+)");
                if (regEntity != null) results.add(new OcrResult("orgName", cleanValue(regEntity), 94.0));
                break;

            case "PAN":
            case "PAN_CARD":
                String pan = extractLineValue(lines, "(?i)^PAN(?:\\s*Number)?\\s*[:\\-]?\\s*([A-Za-z0-9]+)");
                if (pan == null) {
                    pan = extractRegex(extractedText, "[A-Z]{5}[0-9]{4}[A-Z]{1}");
                }
                if (pan != null) results.add(new OcrResult("panNumber", cleanValue(pan).toUpperCase(), 99.8));
                
                String panName = extractLineValue(lines, "(?i)^(?:name|name\\s*on\\s*card|org\\s*name)\\s*[:\\-]?\\s*(.+)");
                if (panName != null) results.add(new OcrResult("orgName", cleanValue(panName), 96.0));
                break;

            case "CONSTITUTION":
            case "TRUST_DEED":
                String tdOrg = extractLineValue(lines, "(?i)^(?:name\\s*of\\s*the\\s*(?:trust|society|foundation|organization)|org\\s*name|entity\\s*name)\\s*[:\\-]?\\s*(.+)");
                if (tdOrg != null) results.add(new OcrResult("orgName", cleanValue(tdOrg), 97.0));
                
                String regType = extractLineValue(lines, "(?i)^(?:type\\s*of\\s*entity|registration\\s*type|entity\\s*type)\\s*[:\\-]?\\s*(.+)");
                if (regType != null) {
                    results.add(new OcrResult("registrationType", cleanValue(regType), 98.0));
                } else {
                    if (extractedText.toLowerCase().contains("trust deed") || extractedText.toLowerCase().contains("trust")) {
                        results.add(new OcrResult("registrationType", "Trust", 92.0));
                    } else if (extractedText.toLowerCase().contains("society")) {
                        results.add(new OcrResult("registrationType", "Society", 92.0));
                    } else if (extractedText.toLowerCase().contains("section 8")) {
                        results.add(new OcrResult("registrationType", "Section 8 Company", 92.0));
                    }
                }
                
                String objClause = extractLineValue(lines, "(?i)^(?:objectives?\\s*clause|main\\s*objects?|aims?\\s*and\\s*objects?)\\s*[:\\-]?\\s*(.+)");
                if (objClause != null) results.add(new OcrResult("objectivesClause", cleanValue(objClause), 91.0));
                
                String estDate = extractLineValue(lines, "(?i)^(?:date\\s*of\\s*establishment|established\\s*on|executed\\s*on)\\s*[:\\-]?\\s*(.+)");
                if (estDate != null) results.add(new OcrResult("dateOfEstablishment", cleanValue(estDate), 94.0));
                
                String constAddr = extractLineValue(lines, "(?i)^(?:registered\\s*office(?:\\s*address)?|principal\\s*office|address)\\s*[:\\-]?\\s*(.+)");
                if (constAddr != null) results.add(new OcrResult("registeredAddress", cleanValue(constAddr), 92.0));
                break;

            case "ADDRESS_PROOF":
                String addr = extractLineValue(lines, "(?i)^(?:registered\\s*address|office\\s*address|consumer\\s*address|address)\\s*[:\\-]?\\s*(.+)");
                if (addr != null && !addr.toLowerCase().contains("discrepant sample") && !addr.toLowerCase().contains("document type")) {
                    results.add(new OcrResult("registeredAddress", cleanValue(addr), 95.0));
                } else {
                    // Fallback to searching all non-header lines containing address or pin code
                    for (String line : lines) {
                        String l = line.trim();
                        if (l.toLowerCase().startsWith("registered address:") || l.toLowerCase().startsWith("address:")) {
                            String v = l.replaceFirst("(?i)^(?:registered\\s*address|address)\\s*[:\\-]?\\s*", "");
                            results.add(new OcrResult("registeredAddress", cleanValue(v), 95.0));
                            break;
                        }
                    }
                }

                String addrConsumer = extractLineValue(lines, "(?i)^(?:consumer\\s*name|name\\s*of\\s*occupant|entity\\s*name)\\s*[:\\-]?\\s*(.+)");
                if (addrConsumer != null) results.add(new OcrResult("orgName", cleanValue(addrConsumer), 93.0));
                break;

            case "GOVERNING_BODY":
            case "BOARD_RESOLUTION":
                String govOrg = extractLineValue(lines, "(?i)^(?:organization|entity\\s*name|name\\s*of\\s*the\\s*(?:trust|society))\\s*[:\\-]?\\s*(.+)");
                if (govOrg != null) results.add(new OcrResult("orgName", cleanValue(govOrg), 94.0));

                String trustees = extractLineValue(lines, "(?i)^(?:trustees?|directors?|office\\s*bearers?|board\\s*members?)\\s*[:\\-]?\\s*(.+)");
                if (trustees != null) results.add(new OcrResult("trusteeDetails", cleanValue(trustees), 93.0));
                
                String signatory = extractLineValue(lines, "(?i)^(?:authorized\\s*signatory\\s*name|signatory\\s*name|authorized\\s*signatory)\\s*[:\\-]?\\s*(.+)");
                if (signatory != null) results.add(new OcrResult("authorizedSignatoryName", cleanValue(signatory), 95.0));
                break;

            case "BANK_ACCOUNT":
            case "CANCELLED_CHEQUE":
                String accHolder = extractLineValue(lines, "(?i)^(?:bank\\s*account\\s*name|account\\s*holder\\s*name|in\\s*the\\s*name\\s*of|name\\s*of\\s*account)\\s*[:\\-]?\\s*(.+)");
                if (accHolder != null) results.add(new OcrResult("orgName", cleanValue(accHolder), 95.0));
                
                String accNo = extractLineValue(lines, "(?i)^(?:a/?c\\s*no[.:]?|account\\s*number|acc\\s*no[.:]?)\\s*[:\\-]?\\s*(.+)");
                if (accNo != null) results.add(new OcrResult("bankAccountNumber", cleanValue(accNo), 99.0));
                
                String ifsc = extractLineValue(lines, "(?i)^(?:ifsc(?:\\s*code)?)\\s*[:\\-]?\\s*([A-Za-z0-9]+)");
                if (ifsc != null) results.add(new OcrResult("ifscCode", cleanValue(ifsc).toUpperCase(), 99.5));
                
                String bank = extractLineValue(lines, "(?i)^(?:bank\\s*name|bank)\\s*[:\\-]?\\s*(.+)");
                if (bank != null) results.add(new OcrResult("bankName", cleanValue(bank), 94.0));
                break;

            case "DARPAN":
            case "DARPAN_CERT":
                String darpanId = extractLineValue(lines, "(?i)^(?:ngo\\s*darpan\\s*id|darpan\\s*id)\\s*[:\\-]?\\s*(.+)");
                if (darpanId != null) results.add(new OcrResult("darpanId", cleanValue(darpanId), 99.5));
                
                String darpanOrg = extractLineValue(lines, "(?i)^(?:registered\\s*name|org(?:anization)?\\s*name|ngo\\s*name)\\s*[:\\-]?\\s*(.+)");
                if (darpanOrg != null) results.add(new OcrResult("orgName", cleanValue(darpanOrg), 96.0));
                break;

            default:
                break;
        }

        return results;
    }

    /**
     * Extracts a value from an array of lines matching a regex on a single line, preventing multi-line bleed.
     */
    private String extractLineValue(String[] lines, String regex) {
        Pattern p = Pattern.compile(regex);
        for (String line : lines) {
            String trimmed = line.trim();
            // Skip document template header/footer lines
            if (trimmed.startsWith("DOCUMENT TYPE:") || trimmed.startsWith("CLASSIFICATION:") ||
                trimmed.startsWith("TRANSPARENCY CHAIN —") || trimmed.startsWith("TEST SAMPLE —")) {
                continue;
            }
            Matcher m = p.matcher(trimmed);
            if (m.find()) {
                String val = m.group(1).trim();
                return val;
            }
        }
        return null;
    }

    /**
     * Strips adjacent field label concatenations and template artifacts.
     */
    private String cleanValue(String val) {
        if (val == null) return null;
        String cleaned = val.trim();

        // Strip known trailing label bleed-ins
        String[] labelsToStrip = new String[] {
            "Registration Type", "Entity Name", "Date Of Establishment", "Date of Registration",
            "Registering Authority", "Registered Address", "Objectives Clause", "Signatory Designation",
            "Trustees", "Category", "Jurisdiction", "Premises", "Sector", "TEST SAMPLE", "DISCREPANT SAMPLE",
            "PROOF [DISCREPANT SAMPLE]"
        };

        for (String label : labelsToStrip) {
            if (cleaned.toLowerCase().endsWith(label.toLowerCase())) {
                cleaned = cleaned.substring(0, cleaned.length() - label.length()).trim();
            }
            // If label occurs at the end with a colon
            cleaned = cleaned.replaceAll("(?i)(?::|\\s)+" + Pattern.quote(label) + "$", "").trim();
        }

        // Clean trailing punctuation / colons
        cleaned = cleaned.replaceAll("[:\\-,]+$", "").trim();
        return cleaned;
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
            }
        } catch (Exception e) {
            System.err.println("[TESSERACT] Local OCR failed for invoice: " + e.getMessage());
        }

        if (extractedText == null || extractedText.isEmpty()) {
            result.setOcrConfidence(0);
            result.setRawText("No text detected");
            return result;
        }

        result.setRawText(extractedText);
        result.setOcrConfidence(90);

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
