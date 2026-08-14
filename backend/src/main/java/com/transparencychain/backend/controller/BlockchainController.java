package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.TransactionResultDto;
import com.transparencychain.backend.model.BlockchainRecord;
import com.transparencychain.backend.repository.BlockchainRecordRepository;
import com.transparencychain.backend.service.BlockchainService;
import com.transparencychain.backend.service.MerkleBlockchainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * REST API for Blockchain & Merkle Root anchoring and cryptographic verification.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/blockchain")
public class BlockchainController {

    private static final Logger log = LoggerFactory.getLogger(BlockchainController.class);

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private MerkleBlockchainService merkleBlockchainService;

    @Autowired
    private BlockchainRecordRepository blockchainRecordRepository;

    /**
     * Phase 3 / Health API: Returns network health and live status.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getBlockchainStatus() {
        try {
            Map<String, Object> status = blockchainService.getNetworkStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Status endpoint error: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("connected", false);
            error.put("error", "Blockchain status check failed — " + sanitize(e.getMessage()));
            return ResponseEntity.status(503).body(error);
        }
    }

    /**
     * Preview Merkle Tree computation for a milestone's verified evidence before committing.
     */
    @GetMapping("/projects/{projectId}/milestones/{milestoneId}/preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> previewMilestoneMerkleTree(
            @PathVariable UUID projectId,
            @PathVariable UUID milestoneId
    ) {
        try {
            Map<String, Object> preview = merkleBlockchainService.previewMilestoneMerkleTree(projectId, milestoneId);
            return ResponseEntity.ok(preview);
        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Error generating preview: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", sanitize(e.getMessage())));
        }
    }

    /**
     * Get persisted blockchain record for a milestone.
     */
    @GetMapping("/projects/{projectId}/milestones/{milestoneId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMilestoneBlockchainRecord(
            @PathVariable UUID projectId,
            @PathVariable UUID milestoneId
    ) {
        Optional<BlockchainRecord> record = blockchainRecordRepository
                .findTopByProjectIdAndMilestoneIdOrderByTimestampDesc(projectId.toString(), milestoneId.toString());

        if (record.isPresent()) {
            return ResponseEntity.ok(record.get());
        } else {
            return ResponseEntity.ok(Map.of("status", "NOT_COMMITTED", "message", "No blockchain record for this milestone."));
        }
    }

    /**
     * Commits the Merkle Root of verified milestone evidence to Polygon Amoy.
     * Restricted to FUNDER or ADMIN roles.
     */
    @PostMapping("/projects/{projectId}/milestones/{milestoneId}/commit")
    @PreAuthorize("hasRole('FUNDER') or hasRole('ADMIN')")
    public ResponseEntity<?> commitMilestoneMerkleRoot(
            @PathVariable UUID projectId,
            @PathVariable UUID milestoneId
    ) {
        try {
            TransactionResultDto result = merkleBlockchainService.commitMilestoneMerkleRoot(projectId, milestoneId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Commit error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", sanitize(e.getMessage())));
        }
    }

    /**
     * Cryptographically verifies a single evidence file's inclusion in the milestone Merkle Root.
     */
    @GetMapping("/milestones/{milestoneId}/proofs/{proofId}/verify")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> verifyEvidenceProof(
            @PathVariable UUID milestoneId,
            @PathVariable UUID proofId
    ) {
        try {
            Map<String, Object> proofResult = merkleBlockchainService.verifyEvidenceProof(milestoneId, proofId);
            return ResponseEntity.ok(proofResult);
        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Proof verification error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", sanitize(e.getMessage())));
        }
    }

    /**
     * Lookup transaction record by transaction hash.
     */
    @GetMapping("/transactions/{txHash}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getTransactionByHash(@PathVariable String txHash) {
        Optional<BlockchainRecord> record = blockchainRecordRepository.findByTransactionHash(txHash);
        if (record.isPresent()) {
            return ResponseEntity.ok(record.get());
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Get all on-chain disbursement anchor records for a project.
     */
    @GetMapping("/projects/{projectId}/disbursements")
    public ResponseEntity<?> getProjectDisbursementRecords(@PathVariable UUID projectId) {
        return ResponseEntity.ok(blockchainRecordRepository.findByProjectIdAndRecordType(
                projectId.toString(), BlockchainRecord.RecordType.DISBURSEMENT_ANCHOR));
    }

    /**
     * Asynchronously retry a pending or failed blockchain anchor.
     */
    @PostMapping("/records/{recordId}/retry")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> retryAnchorRecord(@PathVariable UUID recordId) {
        boolean queued = blockchainService.retryAnchor(recordId);
        if (queued) {
            return ResponseEntity.ok(Map.of("status", "RETRY_QUEUED", "message", "Anchor retry queued asynchronously."));
        }
        return ResponseEntity.notFound().build();
    }

    private String sanitize(String msg) {
        if (msg == null) return "Unknown error";
        return msg.replaceAll("https?://[^\\s]+", "[RPC_URL_REDACTED]")
                  .replaceAll("0x[0-9a-fA-F]{40,}", "[ADDRESS_REDACTED]");
    }
}
