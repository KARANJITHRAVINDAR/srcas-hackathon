package com.transparencychain.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MerkleProofStep {
    private String hash;
    private Position position; // LEFT or RIGHT relative to current node

    public enum Position {
        LEFT, RIGHT
    }
}
