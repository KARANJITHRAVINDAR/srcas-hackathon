package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.MerkleProofStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * Merkle Tree cryptographic service.
 *
 * SPECIFICATION & DETERMINISM RULES:
 * 1. Odd-leaf rule: When the number of nodes at any level of the Merkle tree is odd,
 *    the final node hash is DUPLICATED to form an even pair. This ensures consistency
 *    at every level up to the root.
 * 2. Hash function: Standard SHA-256 over concatenated binary byte arrays of the pair.
 * 3. Format: All hashes returned are "0x"-prefixed 66-character lowercase hex strings (32 bytes).
 * 4. Input ordering: Inputs are preserved or deterministically ordered so independent verifiers
 *    can reconstruct the exact root and verification paths.
 */
@Service
public class MerkleTreeService {

    private static final Logger log = LoggerFactory.getLogger(MerkleTreeService.class);

    /**
     * Builds the Merkle Root from a list of leaf hashes.
     * If the list is empty, returns 32 bytes of zeros (0x0000...0000).
     */
    public String buildMerkleRoot(List<String> leafHashes) {
        if (leafHashes == null || leafHashes.isEmpty()) {
            return "0x" + "0".repeat(64);
        }

        List<String> currentLevel = new ArrayList<>(leafHashes.stream().map(this::normalizeHash).toList());

        while (currentLevel.size() > 1) {
            // Apply odd-leaf rule: duplicate last element if odd length
            if (currentLevel.size() % 2 != 0) {
                currentLevel.add(currentLevel.get(currentLevel.size() - 1));
            }

            List<String> nextLevel = new ArrayList<>();
            for (int i = 0; i < currentLevel.size(); i += 2) {
                String left = currentLevel.get(i);
                String right = currentLevel.get(i + 1);
                String combinedHash = hashPair(left, right);
                nextLevel.add(combinedHash);
            }
            currentLevel = nextLevel;
        }

        return currentLevel.get(0);
    }

    /**
     * Generates a Merkle Proof (audit path) for a leaf at a specific index.
     */
    public List<MerkleProofStep> generateProof(List<String> leafHashes, int targetIndex) {
        if (leafHashes == null || targetIndex < 0 || targetIndex >= leafHashes.size()) {
            throw new IllegalArgumentException("Invalid leaf hashes list or target index.");
        }

        List<MerkleProofStep> proof = new ArrayList<>();
        List<String> currentLevel = new ArrayList<>(leafHashes.stream().map(this::normalizeHash).toList());
        int currentIndex = targetIndex;

        while (currentLevel.size() > 1) {
            if (currentLevel.size() % 2 != 0) {
                currentLevel.add(currentLevel.get(currentLevel.size() - 1));
            }

            int siblingIndex;
            MerkleProofStep.Position siblingPosition;

            if (currentIndex % 2 == 0) {
                // Current is left child, sibling is right
                siblingIndex = currentIndex + 1;
                siblingPosition = MerkleProofStep.Position.RIGHT;
            } else {
                // Current is right child, sibling is left
                siblingIndex = currentIndex - 1;
                siblingPosition = MerkleProofStep.Position.LEFT;
            }

            proof.add(new MerkleProofStep(currentLevel.get(siblingIndex), siblingPosition));

            // Build next level
            List<String> nextLevel = new ArrayList<>();
            for (int i = 0; i < currentLevel.size(); i += 2) {
                nextLevel.add(hashPair(currentLevel.get(i), currentLevel.get(i + 1)));
            }

            currentLevel = nextLevel;
            currentIndex = currentIndex / 2;
        }

        return proof;
    }

    /**
     * Verifies whether a given leaf hash and audit path match the expected Merkle Root.
     */
    public boolean verifyProof(String leafHash, List<MerkleProofStep> proof, String expectedRoot) {
        if (leafHash == null || expectedRoot == null) return false;
        if (proof == null || proof.isEmpty()) {
            return normalizeHash(leafHash).equalsIgnoreCase(normalizeHash(expectedRoot));
        }

        String current = normalizeHash(leafHash);
        for (MerkleProofStep step : proof) {
            String sibling = normalizeHash(step.getHash());
            if (step.getPosition() == MerkleProofStep.Position.LEFT) {
                current = hashPair(sibling, current);
            } else {
                current = hashPair(current, sibling);
            }
        }

        return current.equalsIgnoreCase(normalizeHash(expectedRoot));
    }

    /**
     * Computes SHA-256(leftBytes + rightBytes)
     */
    public String hashPair(String leftHex, String rightHex) {
        try {
            byte[] leftBytes = hexToBytes(leftHex);
            byte[] rightBytes = hexToBytes(rightHex);

            byte[] combined = new byte[leftBytes.length + rightBytes.length];
            System.arraycopy(leftBytes, 0, combined, 0, leftBytes.length);
            System.arraycopy(rightBytes, 0, combined, leftBytes.length, rightBytes.length);

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(combined);
            return "0x" + HexFormat.of().formatHex(hash).toLowerCase();
        } catch (Exception e) {
            log.error("[MERKLE_TREE] Failed to hash pair: {}", e.getMessage());
            throw new RuntimeException("Error hashing pair in Merkle tree", e);
        }
    }

    private String normalizeHash(String hash) {
        if (hash == null) return "0x" + "0".repeat(64);
        String clean = hash.trim().toLowerCase();
        return clean.startsWith("0x") ? clean : "0x" + clean;
    }

    private byte[] hexToBytes(String hex) {
        String clean = hex.startsWith("0x") ? hex.substring(2) : hex;
        // Pad if necessary to 64 chars (32 bytes)
        if (clean.length() < 64) {
            clean = "0".repeat(64 - clean.length()) + clean;
        }
        return HexFormat.of().parseHex(clean);
    }
}
