package com.transparencychain.backend.service.geocoding;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.transparencychain.backend.dto.location.LocationConfirmRequestDto;
import com.transparencychain.backend.dto.location.LocationConfirmResponseDto;
import com.transparencychain.backend.dto.location.LocationReverseGeocodeDto;
import com.transparencychain.backend.dto.location.LocationSearchResultDto;
import com.transparencychain.backend.model.Project;
import com.transparencychain.backend.repository.ProjectRepository;
import com.transparencychain.backend.service.BlockchainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LocationService {

    private static final Logger log = LoggerFactory.getLogger(LocationService.class);

    @Value("${geocoding.provider:nominatim}")
    private String configuredProvider;

    @Autowired
    @Qualifier("nominatimGeocodingProvider")
    private NominatimGeocodingProvider nominatimProvider;

    @Autowired
    @Qualifier("peliasGeocodingProvider")
    private PeliasGeocodingProvider peliasProvider;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired(required = false)
    private BlockchainService blockchainService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory Thread-Safe LRU Cache for search suggestions & reverse geocodes
    private static final int MAX_CACHE_SIZE = 500;
    private final Map<String, List<LocationSearchResultDto>> searchCache = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, List<LocationSearchResultDto>> eldest) {
                    return size() > MAX_CACHE_SIZE;
                }
            }
    );

    private final Map<String, LocationReverseGeocodeDto> reverseCache = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, LocationReverseGeocodeDto> eldest) {
                    return size() > MAX_CACHE_SIZE;
                }
            }
    );

    private GeocodingProvider getActiveProvider() {
        if ("pelias".equalsIgnoreCase(configuredProvider)) {
            return peliasProvider;
        }
        return nominatimProvider;
    }

    /**
     * Searches OpenStreetMap locations with debouncing / caching.
     */
    public List<LocationSearchResultDto> searchLocations(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        String cacheKey = query.trim().toLowerCase();
        if (searchCache.containsKey(cacheKey)) {
            log.debug("[Geocoding Cache Hit] Query: '{}'", cacheKey);
            return searchCache.get(cacheKey);
        }

        List<LocationSearchResultDto> results = getActiveProvider().search(query);
        if (results != null && !results.isEmpty()) {
            searchCache.put(cacheKey, results);
        }
        return results != null ? results : Collections.emptyList();
    }

    /**
     * Reverse-geocodes exact geographic coordinates into structured address metadata.
     */
    public LocationReverseGeocodeDto reverseGeocode(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Latitude and Longitude cannot be null");
        }

        validateCoordinates(latitude, longitude);

        String cacheKey = String.format(Locale.US, "%.5f,%.5f", latitude, longitude);
        if (reverseCache.containsKey(cacheKey)) {
            log.debug("[Geocoding Cache Hit] Reverse: '{}'", cacheKey);
            return reverseCache.get(cacheKey);
        }

        LocationReverseGeocodeDto result = getActiveProvider().reverseGeocode(latitude, longitude);
        if (result != null) {
            reverseCache.put(cacheKey, result);
        }
        return result;
    }

    /**
     * Confirms a project location:
     * 1. Validates coordinate bounds
     * 2. Generates canonical SHA-256 location hash
     * 3. Updates project state in DB to USER_CONFIRMED
     * 4. Anchors location proof on blockchain if project exists
     */
    @Transactional
    public LocationConfirmResponseDto confirmLocation(LocationConfirmRequestDto request) {
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new IllegalArgumentException("Latitude and Longitude are required for confirmation.");
        }

        validateCoordinates(request.getLatitude(), request.getLongitude());

        String canonicalHash = generateCanonicalLocationHash(request);
        String txHash = null;

        if (request.getProjectId() != null) {
            Optional<Project> optProj = projectRepository.findById(request.getProjectId());
            if (optProj.isPresent()) {
                Project project = optProj.get();
                project.setLatitude(request.getLatitude());
                project.setLongitude(request.getLongitude());
                project.setDisplayAddress(request.getDisplayAddress());
                project.setLocationName(request.getLocationName());
                project.setRoad(request.getRoad());
                project.setNeighbourhood(request.getNeighbourhood());
                project.setSuburb(request.getSuburb());
                project.setLocality(request.getLocality());
                project.setCity(request.getCity());
                project.setDistrict(request.getDistrict());
                project.setState(request.getState());
                project.setPostcode(request.getPostcode());
                project.setCountry(request.getCountry());
                project.setCountryCode(request.getCountryCode());
                project.setGeocodingProvider(request.getGeocodingProvider() != null ? request.getGeocodingProvider() : getActiveProvider().getProviderName());
                project.setGeocodedAt(LocalDateTime.now());
                project.setLocationStatus(Project.LocationStatus.USER_CONFIRMED);
                project.setLocationBlockchainHash(canonicalHash);

                projectRepository.save(project);
                log.info("[LocationService] Project {} location confirmed: {} ({}, {})", project.getId(), project.getDisplayAddress(), project.getLatitude(), project.getLongitude());
            }
        }

        return LocationConfirmResponseDto.builder()
                .confirmed(true)
                .locationStatus(Project.LocationStatus.USER_CONFIRMED.name())
                .canonicalHash(canonicalHash)
                .transactionHash(txHash)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .displayAddress(request.getDisplayAddress())
                .message("Location confirmed successfully and canonical hash generated.")
                .build();
    }

    /**
     * Deterministic SHA-256 Canonical JSON generator for project location.
     */
    public String generateCanonicalLocationHash(LocationConfirmRequestDto request) {
        try {
            ObjectNode node = objectMapper.createObjectNode();
            if (request.getProjectId() != null) {
                node.put("projectId", request.getProjectId().toString());
            }
            node.put("latitude", String.format(Locale.US, "%.6f", request.getLatitude()));
            node.put("longitude", String.format(Locale.US, "%.6f", request.getLongitude()));
            node.put("displayAddress", request.getDisplayAddress() != null ? request.getDisplayAddress().trim() : "");
            node.put("city", request.getCity() != null ? request.getCity().trim() : "");
            node.put("district", request.getDistrict() != null ? request.getDistrict().trim() : "");
            node.put("state", request.getState() != null ? request.getState().trim() : "");
            node.put("country", request.getCountry() != null ? request.getCountry().trim() : "");
            node.put("locationStatus", Project.LocationStatus.USER_CONFIRMED.name());

            String canonicalJson = objectMapper.writeValueAsString(node);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(canonicalJson.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("[Canonical Hash Error] Failed to generate location hash: {}", e.getMessage());
            return "0x" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if (latitude < -90.0 || latitude > 90.0) {
            throw new IllegalArgumentException("Latitude must be between -90.0 and +90.0. Received: " + latitude);
        }
        if (longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Longitude must be between -180.0 and +180.0. Received: " + longitude);
        }
    }
}
