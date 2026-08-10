package com.transparencychain.backend.service;

import org.springframework.stereotype.Service;

@Service
public class AiFraudDetectionService {

    public String analyzeProof(String fileUrl, String metadata) {
        // Simulate a call to a Python AI microservice for OCR and anomaly detection
        // For hackathon purposes, we mock the result.
        
        try {
            Thread.sleep(2000); // Simulate processing time
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Mock a 10% chance of fraud detection
        boolean isFraud = Math.random() < 0.1;
        
        if (isFraud) {
            return "{\"score\": 42.5, \"fraud\": true, \"reason\": \"Mismatched geo-tags and date manipulation detected in EXIF data.\"}";
        } else {
            return "{\"score\": 98.2, \"fraud\": false, \"reason\": \"Invoice amounts match milestone allocation. Geo-tags are consistent with project location.\"}";
        }
    }
}
