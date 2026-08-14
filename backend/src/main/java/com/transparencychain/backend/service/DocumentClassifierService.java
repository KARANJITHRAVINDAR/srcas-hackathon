package com.transparencychain.backend.service;

import com.transparencychain.backend.model.NgoRegistrationDocument.DocumentType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Classifies uploaded NGO onboarding documents into the standardized 7 types.
 */
@Service
public class DocumentClassifierService {

    public DocumentType classifyDocument(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        
        // Fast heuristic classification based on filename patterns
        if (filename.contains("pan")) {
            return DocumentType.PAN;
        } else if (filename.contains("darpan") || filename.contains("niti")) {
            return DocumentType.DARPAN;
        } else if (filename.contains("trust") || filename.contains("deed") || filename.contains("moa") || filename.contains("aoa") || filename.contains("constitution")) {
            return DocumentType.CONSTITUTION;
        } else if (filename.contains("cheque") || filename.contains("check") || filename.contains("bank") || filename.contains("passbook")) {
            return DocumentType.BANK_ACCOUNT;
        } else if (filename.contains("board") || filename.contains("trustee") || filename.contains("director") || filename.contains("governing") || filename.contains("resolution")) {
            return DocumentType.GOVERNING_BODY;
        } else if (filename.contains("address") || filename.contains("utility") || filename.contains("electricity") || filename.contains("rent")) {
            return DocumentType.ADDRESS_PROOF;
        } else if (filename.contains("reg") || filename.contains("legal") || filename.contains("certificate") || filename.contains("incorp") || filename.contains("12a") || filename.contains("80g")) {
            return DocumentType.LEGAL_REGISTRATION;
        }
        
        // Fallback default
        return DocumentType.LEGAL_REGISTRATION;
    }
}
