package com.transparencychain.backend.service.geocoding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.transparencychain.backend.dto.location.LocationReverseGeocodeDto;
import com.transparencychain.backend.dto.location.LocationSearchResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
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
 * Pelias / Geocode.earth implementation of GeocodingProvider.
 * Falls back to Nominatim provider if Pelias endpoint is unavailable or unconfigured.
 */
@Component("peliasGeocodingProvider")
public class PeliasGeocodingProvider implements GeocodingProvider {

    private static final Logger log = LoggerFactory.getLogger(PeliasGeocodingProvider.class);

    @Value("${geocoding.pelias.base-url:https://geocode.earth/v1}")
    private String baseUrl;

    @Value("${geocoding.pelias.api-key:${PELIAS_API_KEY:}}")
    private String apiKey;

    @Autowired
    @Qualifier("nominatimGeocodingProvider")
    private NominatimGeocodingProvider nominatimFallback;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getProviderName() {
        return "OpenStreetMap/Pelias";
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
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl + "/autocomplete")
                    .queryParam("text", query.trim())
                    .queryParam("size", "8");

            if (apiKey != null && !apiKey.isBlank()) {
                builder.queryParam("api_key", apiKey.trim());
            }

            URI uri = builder.build().encode().toUri();
            HttpEntity<Void> requestEntity = new HttpEntity<>(createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, requestEntity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode features = root.path("features");
                if (features.isArray() && features.size() > 0) {
                    List<LocationSearchResultDto> results = new ArrayList<>();
                    for (JsonNode feature : features) {
                        JsonNode props = feature.path("properties");
                        JsonNode coords = feature.path("geometry").path("coordinates");

                        double lon = coords.has(0) ? coords.get(0).asDouble() : 0.0;
                        double lat = coords.has(1) ? coords.get(1).asDouble() : 0.0;

                        String name = props.path("name").asText(props.path("label").asText(""));
                        String label = props.path("label").asText("");
                        String city = props.path("locality").asText(props.path("county").asText(""));
                        String district = props.path("county").asText("");
                        String state = props.path("region").asText("");
                        String country = props.path("country").asText("");
                        String postcode = props.path("postalcode").asText("");

                        results.add(LocationSearchResultDto.builder()
                                .id(props.path("id").asText(props.path("gid").asText("")))
                                .name(name)
                                .address(label)
                                .latitude(lat)
                                .longitude(lon)
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
            log.warn("[Pelias Search] Unavailable/Error: {}. Falling back to Nominatim.", e.getMessage());
        }

        return nominatimFallback.search(query);
    }

    @Override
    public LocationReverseGeocodeDto reverseGeocode(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) return null;

        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl + "/reverse")
                    .queryParam("point.lat", latitude)
                    .queryParam("point.lon", longitude)
                    .queryParam("size", "1");

            if (apiKey != null && !apiKey.isBlank()) {
                builder.queryParam("api_key", apiKey.trim());
            }

            URI uri = builder.build().encode().toUri();
            HttpEntity<Void> requestEntity = new HttpEntity<>(createHeaders());
            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.GET, requestEntity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode features = root.path("features");
                if (features.isArray() && features.size() > 0) {
                    JsonNode props = features.get(0).path("properties");

                    String displayName = props.path("label").asText("");
                    String locationName = props.path("name").asText("");
                    String road = props.path("street").asText("");
                    String neighbourhood = props.path("neighbourhood").asText("");
                    String locality = props.path("locality").asText(props.path("county").asText(""));
                    String district = props.path("county").asText("");
                    String state = props.path("region").asText("");
                    String postcode = props.path("postalcode").asText("");
                    String country = props.path("country").asText("");
                    String countryCode = props.path("country_a").asText("").toUpperCase();

                    return LocationReverseGeocodeDto.builder()
                            .latitude(latitude)
                            .longitude(longitude)
                            .displayAddress(displayName)
                            .locationName(locationName)
                            .road(road)
                            .neighbourhood(neighbourhood)
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
            }
        } catch (Exception e) {
            log.warn("[Pelias Reverse] Unavailable/Error: {}. Falling back to Nominatim.", e.getMessage());
        }

        return nominatimFallback.reverseGeocode(latitude, longitude);
    }
}
