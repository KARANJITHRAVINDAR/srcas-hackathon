package com.transparencychain.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResultDto {
    private String transactionHash;
    private Long blockNumber;
    private String merkleRoot;
    private String contractAddress;
    private String network;
    private Long chainId;
    private String status;
    private Integer evidenceCount;
    private String message;
}
