package com.transparencychain.backend.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

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

    public List<OcrResult> extractFields(String documentType) {
        List<OcrResult> results = new ArrayList<>();
        
        // Simulate processing delay
        try {
            Thread.sleep((long) (Math.random() * 1500 + 500));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Mock data generation for hackathon demo
        switch (documentType) {
            case "TRUST_DEED":
                results.add(new OcrResult("orgName", "Green Earth Foundation Trust", 96.5));
                results.add(new OcrResult("registrationType", "TRUST", 99.1));
                results.add(new OcrResult("registrationNumber", "TN/TR/2015/0089", 94.2));
                results.add(new OcrResult("dateOfEstablishment", "2015-08-15", 98.0));
                // INTENTIONAL: Create an address conflict with Darpan
                results.add(new OcrResult("registeredAddress", "124 Gandhi Road, Chennai, Tamil Nadu 600001", 95.0));
                break;
            case "DARPAN_CERT":
                results.add(new OcrResult("darpanId", "TN/2015/0098765", 99.5));
                results.add(new OcrResult("orgName", "Green Earth Foundation Trust", 97.0));
                // INTENTIONAL CONFLICT: Address is slightly different (e.g., misspelled or old)
                results.add(new OcrResult("registeredAddress", "124 Ghandi Rd, Chennai, TN 600001", 92.5));
                break;
            case "CSR1_ACK":
                results.add(new OcrResult("csr1RegistrationNumber", "CSR00012345", 98.8));
                results.add(new OcrResult("orgName", "Green Earth Foundation Trust", 97.5));
                results.add(new OcrResult("panNumber", "AAATG1234H", 99.0));
                break;
            case "PAN_CARD":
                results.add(new OcrResult("panNumber", "AAATG1234H", 99.8));
                results.add(new OcrResult("orgName", "Green Earth Foundation", 85.0)); // Slightly lower confidence on PAN card name
                break;
            case "CANCELLED_CHEQUE":
                results.add(new OcrResult("bankAccountName", "Green Earth Foundation Trust", 96.0));
                results.add(new OcrResult("bankAccountNumber", "100029384756", 99.2));
                // INTENTIONAL LOW CONFIDENCE: Smudged IFSC code
                results.add(new OcrResult("ifscCode", "SBIN0001234", 65.5));
                break;
            case "BOARD_RESOLUTION":
                results.add(new OcrResult("authorizedSignatoryName", "Arun Kumar", 95.0));
                results.add(new OcrResult("authorizedSignatoryDesignation", "Managing Trustee", 94.0));
                results.add(new OcrResult("authorizedSignatoryPan", "ABCDE1234F", 98.0));
                break;
            case "12A_CERT":
                results.add(new OcrResult("reg12aNumber", "12A-2016-889", 98.5));
                break;
            case "80G_CERT":
                results.add(new OcrResult("reg80gNumber", "80G-2016-442", 97.5));
                break;
            default:
                break;
        }

        return results;
    }
}
