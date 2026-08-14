package com.transparencychain.backend.service.geocoding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.dto.location.LocationReverseGeocodeDto;
import com.transparencychain.backend.dto.location.LocationSearchResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * OpenStreetMap Nominatim implementation of GeocodingProvider.
 * Adheres to OpenStreetMap attribution and User-Agent usage policies.
 */
@Component("nominatimGeocodingProvider")
public class NominatimGeocodingProvider implements GeocodingProvider {

    private static final Logger log = LoggerFactory.getLogger(NominatimGeocodingProvider.class);

    @Value("${geocoding.nominatim.base-url:https://nominatim.openstreetmap.org}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getProviderName() {
        return "OpenStreetMap/Nominatim";
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "TransparencyChain-CSR-Verification/1.0 (contact@transparencychain.org)");
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    @Override
    public List<LocationSearchResultDto> search(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl + "/search")
                    .queryParam("q", query.trim())
                    .queryParam("format", "jsonv2")
                    .queryParam("addressdetails", "1")
                    .queryParam("limit", "8")
                    .build()
                    .encode()
                    .toUri();

            HttpEntity<Void> requestEntity = new HttpEntity<>(createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, requestEntity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if (root.isArray()) {
                    List<LocationSearchResultDto> results = new ArrayList<>();
                    for (JsonNode item : root) {
                        JsonNode address = item.path("address");
                        String name = item.path("name").asText("");
                        String displayName = item.path("display_name").asText("");
                        if (name.isBlank()) {
                            name = displayName.split(",")[0].trim();
                        }

                        String city = extractLocality(address);
                        String district = address.path("state_district").asText(address.path("county").asText(""));
                        String state = address.path("state").asText("");
                        String country = address.path("country").asText("");
                        String postcode = address.path("postcode").asText("");

                        results.add(LocationSearchResultDto.builder()
                                .id(item.path("place_id").asText(String.valueOf(item.path("osm_id").asLong())))
                                .name(name)
                                .address(displayName)
                                .latitude(item.path("lat").asDouble())
                                .longitude(item.path("lon").asDouble())
                                .city(city)
                                .district(district)
                                .state(state)
                                .country(country)
                                .postcode(postcode)
                                .source(getProviderName())
                                .build());
                    }
                    return results;
                }
            }
        } catch (Exception e) {
            log.warn("[Nominatim Search] Failed for query '{}': {}", query, e.getMessage());
        }
        return Collections.emptyList();
    }

    @Override
    public LocationReverseGeocodeDto reverseGeocode(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) return null;

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl + "/reverse")
                    .queryParam("lat", latitude)
                    .queryParam("lon", longitude)
                    .queryParam("format", "jsonv2")
                    .queryParam("addressdetails", "1")
                    .build()
                    .encode()
                    .toUri();

            HttpEntity<Void> requestEntity = new HttpEntity<>(createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, requestEntity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode address = root.path("address");

                String displayName = root.path("display_name").asText("");
                String locationName = root.path("name").asText("");
                if (locationName.isBlank() && !displayName.isBlank()) {
                    locationName = displayName.split(",")[0].trim();
                }

                String road = address.path("road").asText(address.path("pedestrian").asText(address.path("path").asText("")));
                String neighbourhood = address.path("neighbourhood").asText(address.path("suburb").asText(""));
                String suburb = address.path("suburb").asText("");
                String locality = extractLocality(address);
                String district = address.path("state_district").asText(address.path("county").asText(""));
                String state = address.path("state").asText("");
                String postcode = address.path("postcode").asText("");
                String country = address.path("country").asText("");
                String countryCode = address.path("country_code").asText("").toUpperCase();

                return LocationReverseGeocodeDto.builder()
                        .latitude(latitude)
                        .longitude(longitude)
                        .displayAddress(displayName)
                        .locationName(locationName)
                        .road(road)
                        .neighbourhood(neighbourhood)
                        .suburb(suburb)
                        .locality(locality)
                        .city(locality)
                        .district(district)
                        .state(state)
                        .postcode(postcode)
                        .country(country)
                        .countryCode(countryCode)
                        .source(getProviderName())
                        .build();
            }
        } catch (Exception e) {
            log.warn("[Nominatim Reverse] Failed for ({}, {}): {}", latitude, longitude, e.getMessage());
        }

        // Graceful fallback retaining coordinates
        return LocationReverseGeocodeDto.builder()
                .latitude(latitude)
                .longitude(longitude)
                .displayAddress(String.format("Location at %.6f, %.6f", latitude, longitude))
                .source(getProviderName())
                .build();
    }

    private String extractLocality(JsonNode address) {
        if (address == null) return "";
        if (address.hasNonNull("city")) return address.get("city").asText();
        if (address.hasNonNull("town")) return address.get("town").asText();
        if (address.hasNonNull("village")) return address.get("village").asText();
        if (address.hasNonNull("municipality")) return address.get("municipality").asText();
        if (address.hasNonNull("locality")) return address.get("locality").asText();
        if (address.hasNonNull("suburb")) return address.get("suburb").asText();
        if (address.hasNonNull("county")) return address.get("county").asText();
        return "";
    }
}
