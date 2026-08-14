package com.transparencychain.backend.service;

import com.transparencychain.backend.dto.MerkleProofStep;
import com.transparencychain.backend.dto.TransactionResultDto;
import com.transparencychain.backend.model.BlockchainRecord;
import com.transparencychain.backend.model.EvidenceAnalysis;
import com.transparencychain.backend.model.Milestone;
import com.transparencychain.backend.model.ProofSubmission;
import com.transparencychain.backend.repository.BlockchainRecordRepository;
import com.transparencychain.backend.repository.MilestoneRepository;
import com.transparencychain.backend.repository.ProofSubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Service orchestrating Merkle tree creation, on-chain commitment to TransparencyChainAnchor contract,
 * and background block confirmation tracking.
 */
@Service
public class MerkleBlockchainService {

    private static final Logger log = LoggerFactory.getLogger(MerkleBlockchainService.class);
    private static final long EXPECTED_CHAIN_ID = 80002L;

    @Value("${blockchain.polygon.contract-address:0xb0f1b1e8805f7a90da89a4476c741b95de201d4e}")
    private String contractAddress;

    @Value("${blockchain.polygon.confirmations-required:3}")
    private int confirmationsRequired;

    @Autowired
    private BlockchainService blockchainService;

    @Autowired
    private EvidenceHashService evidenceHashService;

    @Autowired
    private MerkleTreeService merkleTreeService;

    @Autowired
    private BlockchainRecordRepository blockchainRecordRepository;

    @Autowired
    private MilestoneRepository milestoneRepository;

    @Autowired
    private ProofSubmissionRepository proofSubmissionRepository;

    /**
     * Previews and computes the Merkle Root for all verified evidence of a milestone
     * without broadcasting any transaction to the blockchain.
     */
    public Map<String, Object> previewMilestoneMerkleTree(UUID projectId, UUID milestoneId) {
        List<ProofSubmission> verifiedProofs = getVerifiedProofsForMilestone(milestoneId);
        List<Map<String, Object>> evidenceItems = new ArrayList<>();
        List<String> leafHashes = new ArrayList<>();

        for (int i = 0; i < verifiedProofs.size(); i++) {
            ProofSubmission proof = verifiedProofs.get(i);
            String hash = evidenceHashService.computeHashFromPath(proof.getFileUrl());
            leafHashes.add(hash);

            Map<String, Object> item = new HashMap<>();
            item.put("proofId", proof.getId());
            item.put("fileUrl", proof.getFileUrl());
            item.put("fileType", proof.getFileType());
            item.put("status", proof.getStatus());
            item.put("sha256Hash", hash);
            item.put("index", i);
            evidenceItems.add(item);
        }

        String merkleRoot = merkleTreeService.buildMerkleRoot(leafHashes);

        Map<String, Object> result = new HashMap<>();
        result.put("projectId", projectId);
        result.put("milestoneId", milestoneId);
        result.put("evidenceCount", verifiedProofs.size());
        result.put("merkleRoot", merkleRoot);
        result.put("evidenceItems", evidenceItems);

        // Check if already committed
        Optional<BlockchainRecord> existing = blockchainRecordRepository
                .findTopByProjectIdAndMilestoneIdOrderByTimestampDesc(projectId.toString(), milestoneId.toString());
        result.put("alreadyCommitted", existing.isPresent() && existing.get().getStatus() == BlockchainRecord.BlockchainStatus.CONFIRMED);
        existing.ifPresent(record -> result.put("existingRecord", record));

        return result;
    }

    /**
     * Commits the Merkle Root of verified milestone evidence to the Polygon Amoy smart contract.
     */
    public TransactionResultDto commitMilestoneMerkleRoot(UUID projectId, UUID milestoneId) {
        log.info("[BLOCKCHAIN] Initiating Merkle Root commit for project={}, milestone={}", projectId, milestoneId);

        // 1. Validate network
        blockchainService.assertCorrectNetwork();

        // 2. Fetch verified proofs
        List<ProofSubmission> verifiedProofs = getVerifiedProofsForMilestone(milestoneId);
        if (verifiedProofs.isEmpty()) {
            throw new IllegalStateException("Cannot commit to blockchain: No verified evidence found for milestone.");
        }

        // 3. Check idempotency guard — prevent re-committing if already CONFIRMED
        Optional<BlockchainRecord> existingRecord = blockchainRecordRepository
                .findTopByProjectIdAndMilestoneIdOrderByTimestampDesc(projectId.toString(), milestoneId.toString());
        if (existingRecord.isPresent() && existingRecord.get().getStatus() == BlockchainRecord.BlockchainStatus.CONFIRMED) {
            log.warn("[BLOCKCHAIN] Milestone already has a CONFIRMED blockchain record. Re-commit rejected.");
            BlockchainRecord rec = existingRecord.get();
            return new TransactionResultDto(
                    rec.getTransactionHash(),
                    rec.getBlockNumber(),
                    rec.getMerkleRoot(),
                    rec.getContractAddress(),
                    rec.getNetwork(),
                    rec.getChainId(),
                    rec.getStatus().name(),
                    rec.getEvidenceCount(),
                    "Milestone already anchored on-chain."
            );
        }

        // 4. Compute leaf hashes and Merkle Root
        List<String> leafHashes = new ArrayList<>();
        for (ProofSubmission proof : verifiedProofs) {
            leafHashes.add(evidenceHashService.computeHashFromPath(proof.getFileUrl()));
        }
        String merkleRootHex = merkleTreeService.buildMerkleRoot(leafHashes);

        Web3j web3j = blockchainService.getWeb3j();
        Credentials credentials = blockchainService.getCredentials();
        if (web3j == null || credentials == null) {
            throw new IllegalStateException("Blockchain credentials or Web3j bean not configured.");
        }

        try {
            // 5. Encode commitMerkleRoot(string projectId, string milestoneId, bytes32 merkleRoot)
            byte[] rootBytes32 = Numeric.hexStringToByteArray(merkleRootHex);
            if (rootBytes32.length != 32) {
                byte[] padded = new byte[32];
                System.arraycopy(rootBytes32, 0, padded, Math.max(0, 32 - rootBytes32.length), Math.min(32, rootBytes32.length));
                rootBytes32 = padded;
            }

            Function function = new Function(
                    "commitMerkleRoot",
                    Arrays.asList(
                            new Utf8String(projectId.toString()),
                            new Utf8String(milestoneId.toString()),
                            new Bytes32(rootBytes32)
                    ),
                    Collections.emptyList()
            );
            String encodedFunction = FunctionEncoder.encode(function);

            // 6. Dynamic gas estimation with safety margin
            BigInteger gasPrice = BigInteger.valueOf(30_000_000_000L); // 30 Gwei default
            try {
                BigInteger fetchedPrice = web3j.ethGasPrice().send().getGasPrice();
                if (fetchedPrice != null && fetchedPrice.compareTo(BigInteger.ZERO) > 0) {
                    gasPrice = fetchedPrice.multiply(BigInteger.valueOf(125)).divide(BigInteger.valueOf(100)); // +25% buffer
                }
            } catch (Exception ignored) {}

            BigInteger gasLimit = BigInteger.valueOf(250_000L);

            log.info("[BLOCKCHAIN] Broadcasting transaction to contract: {}", contractAddress);
            EthSendTransaction sendTx = blockchainService.sendSynchronizedTransaction(contractAddress, encodedFunction, BigInteger.ZERO, BigInteger.valueOf(250_000L));

            if (sendTx.hasError()) {
                String errorMsg = sendTx.getError().getMessage();
                log.error("[BLOCKCHAIN] Transaction send error: {}", errorMsg);
                throw new RuntimeException("Blockchain transaction failed: " + errorMsg);
            }

            String txHash = sendTx.getTransactionHash();
            log.info("[BLOCKCHAIN] Transaction broadcast successfully! TxHash: {}", txHash);

            // 7. Save initial PENDING record in MySQL
            BlockchainRecord record = new BlockchainRecord();
            record.setProjectId(projectId.toString());
            record.setMilestoneId(milestoneId.toString());
            record.setRecordType(BlockchainRecord.RecordType.EVIDENCE_MERKLE_ROOT);
            record.setMerkleRoot(merkleRootHex);
            record.setEvidenceCount(verifiedProofs.size());
            record.setTransactionHash(txHash);
            record.setContractAddress(contractAddress);
            record.setNetwork("Polygon Amoy");
            record.setChainId(EXPECTED_CHAIN_ID);
            record.setStatus(BlockchainRecord.BlockchainStatus.PENDING);
            record.setTimestamp(LocalDateTime.now());
            blockchainRecordRepository.save(record);

            // 8. Wait for initial receipt to capture block number
            PollingTransactionReceiptProcessor receiptProcessor =
                    new PollingTransactionReceiptProcessor(web3j, 1500, 30);
            TransactionReceipt receipt = receiptProcessor.waitForTransactionReceipt(txHash);

            if ("0x1".equals(receipt.getStatus()) || "1".equals(receipt.getStatus())) {
                record.setBlockNumber(receipt.getBlockNumber().longValue());
                blockchainRecordRepository.save(record);
                log.info("[BLOCKCHAIN] Transaction mined in block: {}", receipt.getBlockNumber());

                // Trigger async background task to monitor confirmation depth (3 blocks)
                monitorConfirmationsAsync(record.getId(), txHash, receipt.getBlockNumber());
            } else {
                record.setStatus(BlockchainRecord.BlockchainStatus.FAILED);
                blockchainRecordRepository.save(record);
                throw new RuntimeException("Transaction reverted on-chain (status 0x0)");
            }

            return new TransactionResultDto(
                    txHash,
                    record.getBlockNumber(),
                    merkleRootHex,
                    contractAddress,
                    "Polygon Amoy",
                    EXPECTED_CHAIN_ID,
                    record.getStatus().name(),
                    verifiedProofs.size(),
                    "Transaction successfully submitted and mined. Monitoring block confirmations."
            );

        } catch (Exception e) {
            log.error("[BLOCKCHAIN] Error committing Merkle Root: {}", e.getMessage(), e);
            throw new RuntimeException("Blockchain anchoring error: " + e.getMessage(), e);
        }
    }

    /**
     * Verifies cryptographic Merkle Proof for a single evidence file.
     */
    public Map<String, Object> verifyEvidenceProof(UUID milestoneId, UUID proofId) {
        List<ProofSubmission> verifiedProofs = getVerifiedProofsForMilestone(milestoneId);
        List<String> leafHashes = new ArrayList<>();
        int targetIndex = -1;

        for (int i = 0; i < verifiedProofs.size(); i++) {
            ProofSubmission p = verifiedProofs.get(i);
            String hash = evidenceHashService.computeHashFromPath(p.getFileUrl());
            leafHashes.add(hash);
            if (p.getId().equals(proofId)) {
                targetIndex = i;
            }
        }

        if (targetIndex == -1) {
            throw new IllegalArgumentException("Evidence item not found or not in verified status.");
        }

        String targetHash = leafHashes.get(targetIndex);
        String calculatedRoot = merkleTreeService.buildMerkleRoot(leafHashes);
        List<MerkleProofStep> proofSteps = merkleTreeService.generateProof(leafHashes, targetIndex);
        boolean isValid = merkleTreeService.verifyProof(targetHash, proofSteps, calculatedRoot);

        Map<String, Object> response = new HashMap<>();
        response.put("proofId", proofId);
        response.put("leafHash", targetHash);
        response.put("calculatedMerkleRoot", calculatedRoot);
        response.put("proofSteps", proofSteps);
        response.put("isValid", isValid);
        response.put("verificationStatus", isValid ? "VALID" : "INVALID");
        response.put("message", isValid ? "Evidence cryptographically verified against milestone Merkle Root." : "Cryptographic proof mismatch.");

        return response;
    }

    /**
     * Background asynchronous monitor checking for confirmation depth (>= 3 blocks).
     */
    @Async
    public void monitorConfirmationsAsync(UUID recordId, String txHash, BigInteger minedBlock) {
        CompletableFuture.runAsync(() -> {
            try {
                Web3j web3j = blockchainService.getWeb3j();
                if (web3j == null) return;

                int checks = 0;
                while (checks < 40) {
                    Thread.sleep(3000);
                    BigInteger currentBlock = web3j.ethBlockNumber().send().getBlockNumber();
                    long confirmations = currentBlock.subtract(minedBlock).longValue() + 1;

                    if (confirmations >= confirmationsRequired) {
                        Optional<BlockchainRecord> recOpt = blockchainRecordRepository.findById(recordId);
                        if (recOpt.isPresent()) {
                            BlockchainRecord rec = recOpt.get();
                            rec.setStatus(BlockchainRecord.BlockchainStatus.CONFIRMED);
                            blockchainRecordRepository.save(rec);
                            log.info("[BLOCKCHAIN] ✅ Milestone anchor CONFIRMED with {} confirmations! (tx={})", confirmations, txHash);
                        }
                        break;
                    }
                    checks++;
                }
            } catch (Exception e) {
                log.warn("[BLOCKCHAIN] Confirmation monitor notice: {}", e.getMessage());
            }
        });
    }

    private List<ProofSubmission> getVerifiedProofsForMilestone(UUID milestoneId) {
        List<ProofSubmission> all = proofSubmissionRepository.findByMilestoneId(milestoneId);
        return all.stream()
                .filter(p -> p.getStatus() == ProofSubmission.ProofStatus.AI_VERIFIED ||
                             p.getStatus() == ProofSubmission.ProofStatus.MANUALLY_OVERRIDDEN)
                .sorted(Comparator.comparing(ProofSubmission::getId)) // Deterministic order
                .toList();
    }
}
