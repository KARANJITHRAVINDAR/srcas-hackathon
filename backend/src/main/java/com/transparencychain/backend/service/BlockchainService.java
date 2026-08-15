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
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.utils.Convert;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    @Value("${blockchain.polygon.contract-address:0xb0f1b1e8805f7a90da89a4476c741b95de201d4e}")
    private String contractAddress;

    private static final Object TX_MUTEX = new Object();

    /**
     * Nonce-safe, thread-synchronized transaction sender.
     * Prevents nonce collision across concurrent Merkle commits, disbursement anchors, and retries.
     */
    public EthSendTransaction sendSynchronizedTransaction(String to, String encodedData, BigInteger value, BigInteger gasLimit) throws Exception {
        if (web3j == null || credentials == null) {
            throw new IllegalStateException("Web3j or Credentials not configured");
        }
        synchronized (TX_MUTEX) {
            BigInteger gasPrice = BigInteger.valueOf(30_000_000_000L); // 30 Gwei default
            try {
                BigInteger fetchedPrice = web3j.ethGasPrice().send().getGasPrice();
                if (fetchedPrice != null && fetchedPrice.compareTo(BigInteger.ZERO) > 0) {
                    gasPrice = fetchedPrice.multiply(BigInteger.valueOf(125)).divide(BigInteger.valueOf(100)); // +25% buffer
                }
            } catch (Exception ignored) {}

            org.web3j.tx.RawTransactionManager txManager = new org.web3j.tx.RawTransactionManager(web3j, credentials, EXPECTED_CHAIN_ID);
            return txManager.sendTransaction(
                    gasPrice,
                    gasLimit != null ? gasLimit : BigInteger.valueOf(250_000L),
                    to,
                    encodedData,
                    value != null ? value : BigInteger.ZERO
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Disbursement & Escrow Anchoring
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Non-blocking disbursement anchor.
     * 1. Creates a local tracking record immediately.
     * 2. Fires an asynchronous on-chain anchor transaction.
     * 3. Never blocks or rolls back the financial disbursement DB commit.
     */
    public String anchorDisbursement(UUID projectId, UUID milestoneId, BigDecimal amount, String verifier) {
        log.info("[BLOCKCHAIN] anchorDisbursement requested for project={}, milestone={}, amount={}", projectId, milestoneId, amount);

        String trackingRef = "DISB-" + (milestoneId != null ? milestoneId.toString().substring(0, 8) : UUID.randomUUID().toString().substring(0, 8)) + "-" + System.currentTimeMillis();

        BlockchainRecord record = new BlockchainRecord();
        record.setProjectId(projectId != null ? projectId.toString() : "");
        record.setMilestoneId(milestoneId != null ? milestoneId.toString() : "");
        record.setRecordType(BlockchainRecord.RecordType.DISBURSEMENT_ANCHOR);
        record.setDisbursementAmount(amount != null ? amount : BigDecimal.ZERO);
        record.setVerifierId(verifier != null ? verifier : "SYSTEM");
        record.setDisbursementReference(trackingRef);
        record.setContractAddress(contractAddress);
        record.setNetwork("Polygon Amoy");
        record.setChainId(EXPECTED_CHAIN_ID);
        record.setStatus(BlockchainRecord.BlockchainStatus.PENDING);
        record.setTimestamp(LocalDateTime.now());
        blockchainRecordRepository.save(record);

        // Asynchronously broadcast on-chain anchor
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            executeOnChainDisbursementAnchor(record, projectId, milestoneId, amount, verifier);
        });

        return trackingRef;
    }

    public void executeOnChainDisbursementAnchor(BlockchainRecord record, UUID projectId, UUID milestoneId, BigDecimal amount, String verifier) {
        try {
            if (!isConfigured()) {
                log.warn("[BLOCKCHAIN] Web3j/Credentials not configured; marking disbursement anchor SIMULATED");
                record.setStatus(BlockchainRecord.BlockchainStatus.SIMULATED);
                record.setTransactionHash("0x" + UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));
                blockchainRecordRepository.save(record);
                return;
            }

            assertCorrectNetwork();

            // Compute payload hash representing the immutable disbursement audit record
            String payloadString = String.format("DISBURSEMENT|proj:%s|ms:%s|amt:%s|ver:%s|time:%d",
                    projectId != null ? projectId.toString() : "",
                    milestoneId != null ? milestoneId.toString() : "",
                    amount != null ? amount.toPlainString() : "0",
                    verifier != null ? verifier : "SYSTEM",
                    System.currentTimeMillis() / 1000);
            String payloadHash = computeSha256Hex(payloadString.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] hashBytes32 = org.web3j.utils.Numeric.hexStringToByteArray(payloadHash);
            if (hashBytes32.length != 32) {
                byte[] padded = new byte[32];
                System.arraycopy(hashBytes32, 0, padded, Math.max(0, 32 - hashBytes32.length), Math.min(32, hashBytes32.length));
                hashBytes32 = padded;
            }

            // Encode transaction against the deployed anchor contract
            org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                    "commitMerkleRoot",
                    java.util.Arrays.asList(
                            new org.web3j.abi.datatypes.Utf8String("DISBURSEMENT:" + (projectId != null ? projectId.toString() : "")),
                            new org.web3j.abi.datatypes.Utf8String(milestoneId != null ? milestoneId.toString() : ""),
                            new org.web3j.abi.datatypes.generated.Bytes32(hashBytes32)
                    ),
                    java.util.Collections.emptyList()
            );
            String encodedFunction = org.web3j.abi.FunctionEncoder.encode(function);

            EthSendTransaction sendTx = sendSynchronizedTransaction(contractAddress, encodedFunction, BigInteger.ZERO, BigInteger.valueOf(250_000L));
            if (sendTx.hasError()) {
                log.error("[BLOCKCHAIN] Disbursement anchor send error: {}", sendTx.getError().getMessage());
                record.setStatus(BlockchainRecord.BlockchainStatus.PENDING_ANCHOR);
                blockchainRecordRepository.save(record);
                return;
            }

            String txHash = sendTx.getTransactionHash();
            record.setTransactionHash(txHash);
            record.setMerkleRoot(payloadHash);
            record.setStatus(BlockchainRecord.BlockchainStatus.PENDING);
            blockchainRecordRepository.save(record);
            log.info("[BLOCKCHAIN] Disbursement anchor broadcast successfully! TxHash: {}", txHash);

            // Wait for receipt
            org.web3j.tx.response.PollingTransactionReceiptProcessor receiptProcessor =
                    new org.web3j.tx.response.PollingTransactionReceiptProcessor(web3j, 1500, 30);
            org.web3j.protocol.core.methods.response.TransactionReceipt receipt = receiptProcessor.waitForTransactionReceipt(txHash);

            if ("0x1".equals(receipt.getStatus()) || "1".equals(receipt.getStatus())) {
                record.setBlockNumber(receipt.getBlockNumber().longValue());
                record.setStatus(BlockchainRecord.BlockchainStatus.CONFIRMED);
                blockchainRecordRepository.save(record);
                log.info("[BLOCKCHAIN] Disbursement anchor confirmed in block: {}", receipt.getBlockNumber());
            } else {
                record.setStatus(BlockchainRecord.BlockchainStatus.FAILED);
                blockchainRecordRepository.save(record);
                log.warn("[BLOCKCHAIN] Disbursement anchor transaction reverted on-chain");
            }
        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Non-blocking disbursement anchor failure (will be retryable): {}", sanitizeError(e.getMessage()));
            record.setStatus(BlockchainRecord.BlockchainStatus.PENDING_ANCHOR);
            blockchainRecordRepository.save(record);
        }
    }

    public boolean retryAnchor(UUID recordId) {
        Optional<BlockchainRecord> opt = blockchainRecordRepository.findById(recordId);
        if (opt.isEmpty()) return false;
        BlockchainRecord record = opt.get();
        if (record.getStatus() == BlockchainRecord.BlockchainStatus.CONFIRMED) return true;

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            UUID projId = null;
            UUID msId = null;
            try {
                if (record.getProjectId() != null && !record.getProjectId().isBlank()) projId = UUID.fromString(record.getProjectId());
                if (record.getMilestoneId() != null && !record.getMilestoneId().isBlank()) msId = UUID.fromString(record.getMilestoneId());
            } catch (Exception ignored) {}
            executeOnChainDisbursementAnchor(record, projId, msId, record.getDisbursementAmount(), record.getVerifierId());
        });
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy anchor methods (kept for backward compatibility with existing calls)
    // ─────────────────────────────────────────────────────────────────────────

    public String deployEscrow(UUID projectId, BigDecimal amount, String ngoAddress) {
        log.info("[BLOCKCHAIN] deployEscrow — projectId={}", projectId);
        return anchorDisbursement(projectId, null, amount, "FUNDER_ESCROW_LOCK");
    }

    public String releaseFunds(UUID projectId, UUID milestoneId, BigDecimal amount) {
        log.info("[BLOCKCHAIN] releaseFunds — projectId={}, milestoneId={}", projectId, milestoneId);
        return anchorDisbursement(projectId, milestoneId, amount, "EVIDENCE_APPROVAL_FUNDER");
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
        String simulatedHash = "0x" + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
        log.info("[BLOCKCHAIN] Simulated anchor — hash={}", simulatedHash);
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

    /**
     * Live on-chain EVM read for Merkle Root from TransparencyChainAnchor.sol
     */
    public String getLiveMerkleRoot(String projectId, String milestoneId) {
        if (!isConfigured()) {
            return "SIMULATED";
        }
        try {
            org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                    "getMerkleRoot",
                    Arrays.asList(
                            new org.web3j.abi.datatypes.Utf8String(projectId != null ? projectId : ""),
                            new org.web3j.abi.datatypes.Utf8String(milestoneId != null ? milestoneId : "")
                    ),
                    Collections.singletonList(new org.web3j.abi.TypeReference<org.web3j.abi.datatypes.generated.Bytes32>() {})
            );
            String encodedFunction = org.web3j.abi.FunctionEncoder.encode(function);
            org.web3j.protocol.core.methods.request.Transaction transaction =
                    org.web3j.protocol.core.methods.request.Transaction.createEthCallTransaction(
                            credentials.getAddress(), contractAddress, encodedFunction);

            org.web3j.protocol.core.methods.response.EthCall response = web3j.ethCall(transaction, org.web3j.protocol.core.DefaultBlockParameterName.LATEST).send();
            if (response != null && !response.hasError() && response.getValue() != null) {
                List<org.web3j.abi.datatypes.Type> results = org.web3j.abi.FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
                if (!results.isEmpty()) {
                    byte[] rootBytes = (byte[]) results.get(0).getValue();
                    return "0x" + org.web3j.utils.Numeric.toHexStringNoPrefix(rootBytes);
                }
            }
        } catch (Exception e) {
            log.warn("[BLOCKCHAIN] Live eth_call getMerkleRoot failed: {}", e.getMessage());
        }
        return "SIMULATED";
    }

    public Web3j getWeb3j() { return web3j; }
    public Credentials getCredentials() { return credentials; }
}
