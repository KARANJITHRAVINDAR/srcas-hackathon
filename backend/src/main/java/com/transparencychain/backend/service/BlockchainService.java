package com.transparencychain.backend.service;

import com.transparencychain.backend.model.EscrowAccount;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class BlockchainService {

    // In a real hackathon project, you would use Web3j to connect to an Infura node or Ganache.
    // We will simulate the interactions for this demo, logging what would happen on-chain.

    public String deployEscrow(UUID projectId, BigDecimal amount, String ngoAddress) {
        System.out.println("[BLOCKCHAIN] Deploying Escrow for Project ID: " + projectId);
        System.out.println("[BLOCKCHAIN] Locking " + amount + " ETH equivalent.");
        
        // Simulate a transaction hash
        return "0x" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    public String releaseFunds(UUID projectId, UUID milestoneId, BigDecimal amount) {
        System.out.println("[BLOCKCHAIN] Calling releaseMilestoneFunds() on Smart Contract...");
        System.out.println("[BLOCKCHAIN] Releasing " + amount + " for Milestone ID: " + milestoneId);
        
        // Simulate a transaction hash
        return "0x" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    public String anchorEvidence(UUID milestoneId, String videoFileName, byte[] fileBytes) {
        String fileHash = getSha256Hex(fileBytes);
        System.out.println("[BLOCKCHAIN] Anchoring video evidence for Milestone ID: " + milestoneId);
        System.out.println("[BLOCKCHAIN] File name: " + videoFileName + " Hash: " + fileHash);
        
        // Simulate a transaction hash
        return "0x" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String getSha256Hex(byte[] bytes) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            return "0xhash";
        }
    }
}
