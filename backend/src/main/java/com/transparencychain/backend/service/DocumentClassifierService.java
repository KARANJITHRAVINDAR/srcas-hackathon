package com.transparencychain.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentClassifierService {

    public String classifyDocument(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        
        // Fast first pass heuristics for the hackathon demo
        if (filename.contains("trust") || filename.contains("deed")) {
            return "TRUST_DEED";
        } else if (filename.contains("darpan")) {
            return "DARPAN_CERT";
        } else if (filename.contains("csr1") || filename.contains("csr")) {
            return "CSR1_ACK";
        } else if (filename.contains("12a")) {
            return "12A_CERT";
        } else if (filename.contains("80g")) {
            return "80G_CERT";
        } else if (filename.contains("pan")) {
            return "PAN_CARD";
        } else if (filename.contains("cheque") || filename.contains("bank")) {
            return "CANCELLED_CHEQUE";
        } else if (filename.contains("board") || filename.contains("resolution")) {
            return "BOARD_RESOLUTION";
        }
        
        return "UNKNOWN";
    }
}
