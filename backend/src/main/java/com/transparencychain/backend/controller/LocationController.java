package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.location.LocationConfirmRequestDto;
import com.transparencychain.backend.dto.location.LocationConfirmResponseDto;
import com.transparencychain.backend.dto.location.LocationReverseGeocodeDto;
import com.transparencychain.backend.dto.location.LocationSearchResultDto;
import com.transparencychain.backend.service.geocoding.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
public class LocationController {

    @Autowired
    private LocationService locationService;

    @GetMapping({"/api/v1/location/search", "/api/location/search"})
    public ResponseEntity<List<LocationSearchResultDto>> searchLocations(@RequestParam(value = "query", required = false) String query,
                                                                         @RequestParam(value = "q", required = false) String q) {
        String searchTerm = query != null ? query : q;
        List<LocationSearchResultDto> results = locationService.searchLocations(searchTerm);
        return ResponseEntity.ok(results);
    }

    @GetMapping({"/api/v1/location/reverse", "/api/location/reverse"})
    public ResponseEntity<LocationReverseGeocodeDto> reverseGeocode(@RequestParam("latitude") Double latitude,
                                                                    @RequestParam("longitude") Double longitude) {
        LocationReverseGeocodeDto result = locationService.reverseGeocode(latitude, longitude);
        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping({"/api/v1/location/confirm", "/api/location/confirm"})
    public ResponseEntity<LocationConfirmResponseDto> confirmLocation(@RequestBody LocationConfirmRequestDto request) {
        LocationConfirmResponseDto response = locationService.confirmLocation(request);
        return ResponseEntity.ok(response);
    }
}
