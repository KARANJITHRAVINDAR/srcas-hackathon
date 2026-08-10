package com.transparencychain.backend.service;

import com.transparencychain.backend.model.AuditLog;
import com.transparencychain.backend.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    public void logAction(UUID entityId, String entityType, String payload) {
        AuditLog lastLog = auditLogRepository.findTopByOrderByTimestampDesc().orElse(null);
        String previousHash = lastLog != null ? lastLog.getCurrentHash() : "GENESIS";
        
        long timestamp = System.currentTimeMillis();
        String rawData = previousHash + payload + timestamp;
        String currentHash = generateSHA256(rawData);
        
        AuditLog newLog = new AuditLog();
        newLog.setEntityId(entityId);
        newLog.setEntityType(entityType);
        newLog.setPayload(payload);
        newLog.setPreviousHash(previousHash);
        newLog.setCurrentHash(currentHash);
        
        auditLogRepository.save(newLog);
    }
    
    public List<AuditLog> getLogsForEntity(UUID entityId) {
        return auditLogRepository.findByEntityIdOrderByTimestampAsc(entityId);
    }

    private String generateSHA256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
