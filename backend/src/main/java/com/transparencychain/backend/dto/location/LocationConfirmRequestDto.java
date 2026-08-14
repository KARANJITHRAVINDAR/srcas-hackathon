package com.transparencychain.backend.dto.location;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationConfirmRequestDto {
    private UUID projectId;
    private Double latitude;
    private Double longitude;
    private String displayAddress;
    private String locationName;
    private String road;
    private String neighbourhood;
    private String suburb;
    private String locality;
    private String city;
    private String district;
    private String state;
    private String postcode;
    private String country;
    private String countryCode;
    private String geocodingProvider;
}
