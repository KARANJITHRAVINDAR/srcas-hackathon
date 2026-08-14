package com.transparencychain.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

import okhttp3.OkHttpClient;
import java.util.concurrent.TimeUnit;

/**
 * Blockchain configuration — reads all secrets from environment variables.
 * SECURITY: The private key is NEVER logged, printed, or exposed in any response.
 */
@Configuration
public class BlockchainConfig {

    private static final Logger log = LoggerFactory.getLogger(BlockchainConfig.class);

    @Value("${blockchain.polygon.rpc-url:}")
    private String rpcUrl;

    /** Private key injected from env — NEVER logged, NEVER returned via API */
    @Value("${blockchain.polygon.private-key:}")
    private String privateKey;

    @Value("${blockchain.polygon.chain-id:80002}")
    private long chainId;

    @Value("${blockchain.polygon.wallet-address:}")
    private String walletAddress;

    @Bean
    public Web3j web3j() {
        if (rpcUrl == null || rpcUrl.isBlank()) {
            log.warn("[BLOCKCHAIN] POLYGON_RPC_URL is not configured — blockchain features will be unavailable.");
            return null;
        }
        log.info("[BLOCKCHAIN] Connecting Web3j to RPC endpoint (chain-id={})", chainId);

        // Explicit timeouts — prevents indefinite blocking on slow/flaky RPC endpoints
        OkHttpClient httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        return Web3j.build(new HttpService(rpcUrl, httpClient, false));
    }

    @Bean
    public Credentials blockchainCredentials() {
        if (privateKey == null || privateKey.isBlank()) {
            log.warn("[BLOCKCHAIN] BLOCKCHAIN_PRIVATE_KEY is not configured — transaction signing unavailable.");
            return null;
        }
        // Load credentials from private key — NEVER log the credentials object or key
        Credentials credentials = Credentials.create(privateKey);
        log.info("[BLOCKCHAIN] Credentials loaded for wallet address: {}", credentials.getAddress());
        return credentials;
    }
}
