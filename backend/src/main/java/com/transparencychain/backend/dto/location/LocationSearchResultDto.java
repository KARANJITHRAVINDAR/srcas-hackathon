package com.transparencychain.backend.dto.location;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationSearchResultDto {
    private String id;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private String city;
    private String district;
    private String state;
    private String country;
    private String postcode;
    private String source;
}
