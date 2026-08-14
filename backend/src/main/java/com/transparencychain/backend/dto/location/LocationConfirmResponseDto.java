package com.transparencychain.backend.dto.location;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationConfirmResponseDto {
    private boolean confirmed;
    private String locationStatus;
    private String canonicalHash;
    private String transactionHash;
    private Double latitude;
    private Double longitude;
    private String displayAddress;
    private String message;
}
