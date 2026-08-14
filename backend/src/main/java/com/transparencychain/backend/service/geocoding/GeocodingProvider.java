package com.transparencychain.backend.service.geocoding;

import com.transparencychain.backend.dto.location.LocationReverseGeocodeDto;
import com.transparencychain.backend.dto.location.LocationSearchResultDto;

import java.util.List;

/**
 * Provider-agnostic interface for location search, autocomplete, and reverse geocoding.
 */
public interface GeocodingProvider {

    String getProviderName();

    List<LocationSearchResultDto> search(String query);

    LocationReverseGeocodeDto reverseGeocode(Double latitude, Double longitude);
}
