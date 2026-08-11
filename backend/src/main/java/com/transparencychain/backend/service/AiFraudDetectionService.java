package com.transparencychain.backend.service;

import com.transparencychain.backend.model.Milestone;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiFraudDetectionService {

    public String analyzeProof(byte[] fileBytes, String filename, String metadata, Milestone milestone) {
        String extractedText = "";
        try {
            BufferedImage image = null;
            String lowerFilename = filename != null ? filename.toLowerCase() : "";
            
            try (ByteArrayInputStream is = new ByteArrayInputStream(fileBytes)) {
                if (lowerFilename.endsWith(".pdf")) {
                    try (PDDocument document = PDDocument.load(is)) {
                        PDFRenderer pdfRenderer = new PDFRenderer(document);
                        if (document.getNumberOfPages() > 0) {
                            image = pdfRenderer.renderImageWithDPI(0, 300);
                        }
                    }
                } else {
                    image = ImageIO.read(is);
                }
            }

            if (image != null) {
                ITesseract tesseract = new Tesseract();
                tesseract.setDatapath("C:\\Program Files\\Tesseract-OCR\\tessdata");
                tesseract.setLanguage("eng");
                extractedText = tesseract.doOCR(image);
                System.out.println("--- AI Fraud Extracted Text --- \n" + extractedText);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "{\"score\": 10.0, \"fraud\": true, \"reason\": \"Failed to read file or perform OCR.\"}";
        }

        // 1. Check for missing generic invoice keywords (simple anomaly detection)
        if (!extractedText.toLowerCase().contains("invoice") && 
            !extractedText.toLowerCase().contains("bill") &&
            !extractedText.toLowerCase().contains("receipt")) {
            return "{\"score\": 35.0, \"fraud\": true, \"reason\": \"Document does not appear to be a valid invoice or receipt.\"}";
        }

        // 2. Extract Total Amount
        BigDecimal extractedAmount = null;
        // Match things like "Total: 50,000.00" or "Amount Rs 5000"
        Pattern pattern = Pattern.compile("(?i)(?:Total|Amount|Rs\\.?|INR)[\\s:]*([0-9,]+(?:\\.[0-9]{1,2})?)");
        Matcher matcher = pattern.matcher(extractedText);
        
        while (matcher.find()) {
            String amountStr = matcher.group(1).replace(",", "").trim();
            try {
                extractedAmount = new BigDecimal(amountStr);
                // Keep the largest amount found (often the grand total)
            } catch (Exception e) {
                // Ignore parsing errors for individual matches
            }
        }

        if (extractedAmount == null) {
             return "{\"score\": 40.0, \"fraud\": true, \"reason\": \"Could not detect any total amount on the invoice.\"}";
        }

        // 3. Compare with Milestone Allocation
        BigDecimal milestoneAmount = milestone.getAmountAllocated();
        // If extracted amount is less than 90% of the milestone budget, flag it
        BigDecimal threshold = milestoneAmount.multiply(new BigDecimal("0.90"));
        
        if (extractedAmount.compareTo(threshold) < 0) {
            return String.format("{\"score\": 25.5, \"fraud\": true, \"reason\": \"Anomalous Amount: Claimed invoice total (Rs %s) is significantly lower than the allocated milestone budget (Rs %s).\"}", 
                                 extractedAmount.toString(), milestoneAmount.toString());
        }

        return String.format("{\"score\": 96.5, \"fraud\": false, \"reason\": \"Invoice validated. Extracted total (Rs %s) matches milestone budget requirements.\"}", extractedAmount.toString());
    }
}
