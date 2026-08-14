package com.transparencychain.backend.dto.location;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationReverseGeocodeDto {
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
    private String source;
}
