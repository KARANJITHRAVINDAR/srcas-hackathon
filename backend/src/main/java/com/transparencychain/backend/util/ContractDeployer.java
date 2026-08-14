package com.transparencychain.backend.util;

import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.StaticGasProvider;
import okhttp3.OkHttpClient;

import java.io.File;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * Standalone utility to deploy TransparencyChainAnchor smart contract to Polygon Amoy.
 */
public class ContractDeployer {

    public static void main(String[] args) {
        String rpcUrl = System.getenv("POLYGON_RPC_URL");
        if (rpcUrl == null || rpcUrl.isBlank()) {
            rpcUrl = "https://polygon-amoy.g.alchemy.com/v2/alch_xkq1H9kClPmrO7XVGVWrC";
        }

        String privKey = System.getenv("BLOCKCHAIN_PRIVATE_KEY");
        if (privKey == null || privKey.isBlank()) {
            System.err.println("FATAL: BLOCKCHAIN_PRIVATE_KEY environment variable is required.");
            System.exit(1);
        }

        long chainId = 80002L;

        System.out.println("==================================================");
        System.out.println("[DEPLOYER] Starting Polygon Amoy Contract Deployment");
        System.out.println("==================================================");

        try {
            OkHttpClient httpClient = new OkHttpClient.Builder()
                    .connectTimeout(60, TimeUnit.SECONDS)
                    .readTimeout(60, TimeUnit.SECONDS)
                    .writeTimeout(60, TimeUnit.SECONDS)
                    .build();

            Web3j web3j = Web3j.build(new HttpService(rpcUrl, httpClient, false));
            BigInteger liveChainId = web3j.ethChainId().send().getChainId();

            if (liveChainId.longValue() != chainId) {
                System.err.println("FATAL: Connected to chain ID " + liveChainId + ", expected " + chainId);
                System.exit(1);
            }

            Credentials credentials = Credentials.create(privKey);
            System.out.println("[DEPLOYER] Verified Chain ID: " + liveChainId + " (Polygon Amoy)");
            System.out.println("[DEPLOYER] Deployer Address: " + credentials.getAddress());

            // Read compiled contract bytecode
            Path binPath = Paths.get("..", "contracts", "build", "contracts_TransparencyChainAnchor_sol_TransparencyChainAnchor.bin");
            if (!Files.exists(binPath)) {
                binPath = Paths.get("contracts", "build", "contracts_TransparencyChainAnchor_sol_TransparencyChainAnchor.bin");
            }
            if (!Files.exists(binPath)) {
                binPath = Paths.get("C:/Users/Karanjith/OneDrive/coursera-test/Attachments/Desktop/srcas-working/Transparency-Chain/contracts/build/contracts_TransparencyChainAnchor_sol_TransparencyChainAnchor.bin");
            }

            String bytecode = Files.readString(binPath).trim();
            if (!bytecode.startsWith("0x") && !bytecode.startsWith("0X")) {
                bytecode = "0x" + bytecode;
            }

            System.out.println("[DEPLOYER] Bytecode length: " + bytecode.length() + " chars");

            // Fetch current gas price or use 25 Gwei, with 1,000,000 gas limit for contract deployment
            BigInteger gasPrice = BigInteger.valueOf(25_000_000_000L); // 25 Gwei
            try {
                BigInteger fetchedPrice = web3j.ethGasPrice().send().getGasPrice();
                if (fetchedPrice != null && fetchedPrice.compareTo(BigInteger.ZERO) > 0) {
                    gasPrice = fetchedPrice.multiply(BigInteger.valueOf(120)).divide(BigInteger.valueOf(100)); // +20% buffer
                }
            } catch (Exception ignored) {}

            BigInteger gasLimit = BigInteger.valueOf(1_200_000L);
            System.out.println("[DEPLOYER] Using Gas Price: " + gasPrice + " Wei (" + (gasPrice.doubleValue() / 1e9) + " Gwei), Gas Limit: " + gasLimit);

            RawTransactionManager txManager = new RawTransactionManager(web3j, credentials, chainId);
            System.out.println("[DEPLOYER] Submitting deployment transaction...");

            org.web3j.protocol.core.methods.response.EthSendTransaction sendTx = txManager.sendTransaction(
                    gasPrice,
                    gasLimit,
                    null, // contract creation
                    bytecode,
                    BigInteger.ZERO
            );

            String txHash = sendTx.getTransactionHash();
            if (txHash == null) {
                System.err.println("Transaction submission error: " + sendTx.getError().getMessage());
                System.exit(1);
            }

            System.out.println("[DEPLOYER] Transaction sent! TxHash: " + txHash);
            System.out.println("[DEPLOYER] Waiting for transaction receipt on Polygon Amoy...");

            org.web3j.tx.response.PollingTransactionReceiptProcessor receiptProcessor =
                    new org.web3j.tx.response.PollingTransactionReceiptProcessor(web3j, 2000, 40);

            TransactionReceipt receipt = receiptProcessor.waitForTransactionReceipt(txHash);

            String contractAddress = receipt.getContractAddress();
            System.out.println("==================================================");
            System.out.println("[DEPLOYER] 🎉 CONTRACT DEPLOYED SUCCESSFULLY!");
            System.out.println("[DEPLOYER] Contract Address: " + contractAddress);
            System.out.println("[DEPLOYER] Block Number:     " + receipt.getBlockNumber());
            System.out.println("[DEPLOYER] Gas Used:         " + receipt.getGasUsed());
            System.out.println("[DEPLOYER] Status:           " + receipt.getStatus());
            System.out.println("==================================================");

            // Save to deployment.json
            String deploymentJson = String.format(
                    "{\n  \"contractAddress\": \"%s\",\n  \"transactionHash\": \"%s\",\n  \"blockNumber\": %d,\n  \"chainId\": 80002,\n  \"network\": \"Polygon Amoy\",\n  \"deployer\": \"%s\"\n}",
                    contractAddress, txHash, receipt.getBlockNumber().longValue(), credentials.getAddress()
            );

            Path deployJsonPath = Paths.get("..", "contracts", "deployment.json");
            Files.writeString(deployJsonPath, deploymentJson);
            System.out.println("[DEPLOYER] Saved to contracts/deployment.json");

        } catch (Exception e) {
            System.err.println("[DEPLOYER] Deployment failed: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
