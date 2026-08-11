package com.transparencychain.backend.service;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
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
        try {
            BufferedImage image = null;
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            
            if (originalFilename.endsWith(".pdf")) {
                try (InputStream is = file.getInputStream(); PDDocument document = PDDocument.load(is)) {
                    PDFRenderer pdfRenderer = new PDFRenderer(document);
                    if (document.getNumberOfPages() > 0) {
                        image = pdfRenderer.renderImageWithDPI(0, 300); // Render first page at 300 DPI
                    }
                }
            } else {
                image = ImageIO.read(file.getInputStream());
            }

            if (image != null) {
                ITesseract tesseract = new Tesseract();
                // WARNING: Make sure Tesseract is installed at this exact path
                tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
                tesseract.setLanguage("eng");
                
                extractedText = tesseract.doOCR(image);
                System.out.println("Tesseract Extracted Text: \n" + extractedText);
            }
        } catch (Exception e) {
            System.err.println("Error during OCR extraction: " + e.getMessage());
            e.printStackTrace();
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

    private String extractRegex(String text, String regex) {
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(matcher.groupCount() > 0 ? 1 : 0).trim();
        }
        return null;
    }
}
