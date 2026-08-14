package com.transparencychain.backend.service;

import com.transparencychain.backend.model.BlockchainRecord;
import com.transparencychain.backend.repository.BlockchainRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.utils.Convert;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Core blockchain service — wraps Web3j interactions with Polygon Amoy.
 *
 * SECURITY RULES (non-negotiable):
 *  1. Private key NEVER logged, printed, or returned via any method.
 *  2. Credentials object NEVER serialized or returned via API.
 *  3. Chain ID verified as 80002 before every transaction.
 *  4. No client-supplied signing — only this backend service signs.
 */
@Service
public class BlockchainService {

    private static final Logger log = LoggerFactory.getLogger(BlockchainService.class);

    /** Expected Polygon Amoy chain ID — fail loudly if mismatch */
    private static final long EXPECTED_CHAIN_ID = 80002L;

    @Value("${blockchain.polygon.wallet-address:}")
    private String walletAddress;

    @Value("${blockchain.polygon.chain-id:80002}")
    private long configuredChainId;

    @Autowired(required = false)
    private Web3j web3j;

    @Autowired(required = false)
    private Credentials credentials;

    @Autowired
    private BlockchainRecordRepository blockchainRecordRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 3: Network Status Check
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns a safe status object describing the network connection.
     * The private key is NEVER included in this or any other response.
     */
    public Map<String, Object> getNetworkStatus() {
        Map<String, Object> status = new HashMap<>();

        if (web3j == null) {
            status.put("connected", false);
            status.put("error", "Web3j not configured — check POLYGON_RPC_URL");
            return status;
        }

        try {
            // 1. Fetch chain ID from RPC
            BigInteger onChainId = web3j.ethChainId().send().getChainId();

            // 2. Validate network — fail loudly if wrong chain
            if (onChainId == null || onChainId.longValue() != EXPECTED_CHAIN_ID) {
                String msg = "WRONG NETWORK! Expected chain 80002 (Polygon Amoy) but got: " + onChainId;
                log.error("[BLOCKCHAIN] {}", msg);
                status.put("connected", false);
                status.put("error", msg);
                return status;
            }

            // 3. Latest block number
            BigInteger latestBlock = web3j.ethBlockNumber().send().getBlockNumber();

            // 4. Wallet balance (Wei → POL)
            BigInteger balanceWei = BigInteger.ZERO;
            String resolvedAddress = (credentials != null) ? credentials.getAddress() : walletAddress;
            if (resolvedAddress != null && !resolvedAddress.isBlank()) {
                try {
                    balanceWei = web3j.ethGetBalance(resolvedAddress, DefaultBlockParameterName.LATEST)
                            .send().getBalance();
                } catch (Exception e) {
                    log.warn("[BLOCKCHAIN] Could not fetch balance for wallet: {}", resolvedAddress);
                }
            }
            BigDecimal balancePol = Convert.fromWei(new BigDecimal(balanceWei), Convert.Unit.ETHER);

            // 5. Build safe status — private key NEVER included
            status.put("connected", true);
            status.put("network", "Polygon Amoy");
            status.put("chainId", onChainId.longValue());
            status.put("latestBlock", latestBlock.longValue());
            status.put("walletAddress", resolvedAddress);
            status.put("balance", String.format("%.4f POL", balancePol));

            log.info("[BLOCKCHAIN] Status OK — chainId={}, latestBlock={}, wallet={}",
                    onChainId, latestBlock, resolvedAddress);

        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Status check failed: {}", e.getMessage());
            status.put("connected", false);
            status.put("error", "RPC connection error — " + sanitizeError(e.getMessage()));
        }

        return status;
    }

    /**
     * Validates that the live chain ID matches 80002.
     * Must be called before every transaction — not just at startup.
     *
     * @throws IllegalStateException if on wrong network
     */
    public void assertCorrectNetwork() {
        if (web3j == null) {
            throw new IllegalStateException("Web3j not configured — cannot validate network.");
        }
        try {
            BigInteger onChainId = web3j.ethChainId().send().getChainId();
            if (onChainId == null || onChainId.longValue() != EXPECTED_CHAIN_ID) {
                throw new IllegalStateException(
                        "WRONG NETWORK! Expected Polygon Amoy (80002) but connected to chain " + onChainId +
                        ". Transaction aborted.");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Network validation failed: " + sanitizeError(e.getMessage()));
        }
    }

    /** Returns true if Web3j bean is available and private key loaded */
    public boolean isConfigured() {
        return web3j != null && credentials != null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy anchor methods (kept for backward compatibility with existing calls)
    // ─────────────────────────────────────────────────────────────────────────

    public String deployEscrow(UUID projectId, BigDecimal amount, String ngoAddress) {
        log.info("[BLOCKCHAIN] deployEscrow — projectId={}", projectId);
        return anchorRecordOnChain(
                projectId != null ? projectId.toString() : "",
                "", "",
                "ESCROW_DEPLOYED",
                ngoAddress,
                System.currentTimeMillis() / 1000,
                amount != null ? amount.toString() : "0"
        );
    }

    public String releaseFunds(UUID projectId, UUID milestoneId, BigDecimal amount) {
        log.info("[BLOCKCHAIN] releaseFunds — projectId={}, milestoneId={}", projectId, milestoneId);
        return anchorRecordOnChain(
                projectId != null ? projectId.toString() : "",
                milestoneId != null ? milestoneId.toString() : "",
                "",
                "FUNDS_RELEASED",
                "BACKEND_AUTHORITY",
                System.currentTimeMillis() / 1000,
                amount != null ? amount.toString() : "0"
        );
    }

    public String anchorEvidence(UUID milestoneId, String fileName, byte[] fileBytes) {
        String fileHash = computeSha256Hex(fileBytes);
        log.info("[BLOCKCHAIN] anchorEvidence — milestoneId={}, hash={}", milestoneId, fileHash);
        return anchorRecordOnChain(
                "",
                milestoneId != null ? milestoneId.toString() : "",
                fileHash,
                "EVIDENCE_ANCHORED",
                "",
                System.currentTimeMillis() / 1000,
                fileName
        );
    }

    public String anchorRecordOnChain(
            String projectId, String milestoneId, String evidenceHash,
            String verificationResult, String verifierId,
            long timestamp, String disbursementRef
    ) {
        // If contract not yet deployed, simulate and persist locally
        String simulatedHash = "0x" + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        log.info("[BLOCKCHAIN] Simulated anchor (contract not yet deployed) — hash={}", simulatedHash);
        saveRecordToDb(projectId, milestoneId, evidenceHash, verificationResult,
                verifierId, timestamp, disbursementRef, simulatedHash);
        return simulatedHash;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void saveRecordToDb(
            String projectId, String milestoneId, String evidenceHash,
            String verificationResult, String verifierId,
            long timestamp, String disbursementRef, String txHash
    ) {
        try {
            BlockchainRecord record = new BlockchainRecord();
            record.setProjectId(projectId);
            record.setMilestoneId(milestoneId);
            record.setEvidenceHash(evidenceHash);
            record.setVerificationResult(verificationResult);
            record.setVerifierId(verifierId);
            record.setDisbursementReference(disbursementRef);
            record.setTransactionHash(txHash);
            record.setNetwork("Polygon Amoy");
            record.setChainId(EXPECTED_CHAIN_ID);
            record.setStatus(BlockchainRecord.BlockchainStatus.PENDING);
            blockchainRecordRepository.save(record);
        } catch (Exception ex) {
            log.error("[BLOCKCHAIN] Error saving blockchain record: {}", ex.getMessage());
        }
    }

    /** SHA-256 hash of raw bytes — returns lowercase hex without 0x prefix */
    public String computeSha256Hex(byte[] bytes) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) sb.append('0');
                sb.append(hex);
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException("SHA-256 computation failed", ex);
        }
    }

    /** Strip sensitive information from error messages before returning to caller */
    private String sanitizeError(String message) {
        if (message == null) return "Unknown error";
        // Remove any URL fragments that might contain embedded API keys
        return message.replaceAll("https?://[^\\s]+", "[RPC_URL_REDACTED]")
                      .replaceAll("0x[0-9a-fA-F]{40,}", "[ADDRESS_REDACTED]");
    }

    public Web3j getWeb3j() { return web3j; }
    public Credentials getCredentials() { return credentials; }
}
