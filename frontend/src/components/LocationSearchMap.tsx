import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, CheckCircle2, Loader2, X, Navigation, AlertCircle, Compass } from 'lucide-react';

// Fix Leaflet default icon paths
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export interface LocationData {
    latitude: number;
    longitude: number;
    displayAddress: string;
    locationName?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    locality?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countryCode?: string;
    locationStatus: 'UNVERIFIED' | 'USER_CONFIRMED' | 'VERIFIED';
}

interface SearchSuggestion {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postcode?: string;
    source?: string;
}

interface LocationSearchMapProps {
    initialLatitude?: number;
    initialLongitude?: number;
    initialAddress?: string;
    onLocationChange?: (location: LocationData) => void;
    readOnly?: boolean;
    className?: string;
}

// Controller component to smoothly pan and zoom Leaflet map
function MapFlyController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] && center[1]) {
            map.flyTo(center, zoom, {
                animate: true,
                duration: 1.2
            });
        }
    }, [center, zoom, map]);
    return null;
}

// Click-to-place-marker handler
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e: any) {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationSearchMap({
    initialLatitude,
    initialLongitude,
    initialAddress,
    onLocationChange,
    readOnly = false,
    className = ''
}: LocationSearchMapProps) {
    const defaultCenter: [number, number] = [
        initialLatitude || 20.5937,
        initialLongitude || 78.9629
    ];

    const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
    const [mapZoom, setMapZoom] = useState<number>(initialLatitude ? 15 : 5);
    const [position, setPosition] = useState<[number, number] | null>(
        initialLatitude && initialLongitude ? [initialLatitude, initialLongitude] : null
    );

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [locationDetails, setLocationDetails] = useState<LocationData>({
        latitude: initialLatitude || 0,
        longitude: initialLongitude || 0,
        displayAddress: initialAddress || '',
        locationStatus: initialLatitude ? 'USER_CONFIRMED' : 'UNVERIFIED'
    });

    const [isConfirmed, setIsConfirmed] = useState<boolean>(Boolean(initialLatitude && initialLongitude));
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const debounceTimerRef = useRef<any>(null);

    // Close suggestions dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform reverse geocode
    const performReverseGeocode = useCallback(async (lat: number, lng: number, manualConfirm = false) => {
        setIsReverseGeocoding(true);
        setErrorMsg(null);
        try {
            // First attempt: Backend Geocoding Service
            let responseData: any = null;
            try {
                const res = await axios.get(`http://localhost:8081/api/v1/location/reverse?latitude=${lat}&longitude=${lng}`);
                responseData = res.data;
            } catch {
                // Fallback direct to OpenStreetMap Nominatim
                const fallbackRes = await axios.get(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`,
                    { headers: { 'User-Agent': 'TransparencyChain-Client/1.0' } }
                );
                const raw = fallbackRes.data;
                const addr = raw.address || {};
                responseData = {
                    latitude: lat,
                    longitude: lng,
                    displayAddress: raw.display_name,
                    locationName: raw.name || raw.display_name?.split(',')[0],
                    road: addr.road || addr.pedestrian,
                    neighbourhood: addr.neighbourhood || addr.suburb,
                    suburb: addr.suburb,
                    locality: addr.city || addr.town || addr.village || addr.locality,
                    city: addr.city || addr.town || addr.village,
                    district: addr.state_district || addr.county,
                    state: addr.state,
                    postcode: addr.postcode,
                    country: addr.country,
                    countryCode: addr.country_code?.toUpperCase(),
                };
            }

            const updated: LocationData = {
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
                displayAddress: responseData.displayAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                locationName: responseData.locationName,
                road: responseData.road,
                neighbourhood: responseData.neighbourhood,
                suburb: responseData.suburb,
                locality: responseData.locality,
                city: responseData.city,
                district: responseData.district,
                state: responseData.state,
                postcode: responseData.postcode,
                country: responseData.country,
                countryCode: responseData.countryCode,
                locationStatus: manualConfirm ? 'USER_CONFIRMED' : 'UNVERIFIED'
            };

            setLocationDetails(updated);
            if (manualConfirm) {
                setIsConfirmed(true);
            }
            onLocationChange?.(updated);
        } catch (err) {
            console.warn('Reverse geocoding warning:', err);
            const fallback: LocationData = {
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
                displayAddress: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                locationStatus: manualConfirm ? 'USER_CONFIRMED' : 'UNVERIFIED'
            };
            setLocationDetails(fallback);
            onLocationChange?.(fallback);
        } finally {
            setIsReverseGeocoding(false);
        }
    }, [onLocationChange]);

    // Debounced search query handler
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        setIsSearching(true);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                // Try backend search first
                let results: SearchSuggestion[] = [];
                try {
                    const res = await axios.get(`http://localhost:8081/api/v1/location/search?query=${encodeURIComponent(query.trim())}`);
                    results = res.data || [];
                } catch {
                    // Fallback to OSM Nominatim
                    const fallbackRes = await axios.get(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=jsonv2&addressdetails=1&limit=8`,
                        { headers: { 'User-Agent': 'TransparencyChain-Client/1.0' } }
                    );
                    results = (fallbackRes.data || []).map((item: any) => ({
                        id: String(item.place_id),
                        name: item.name || item.display_name.split(',')[0],
                        address: item.display_name,
                        latitude: parseFloat(item.lat),
                        longitude: parseFloat(item.lon),
                        city: item.address?.city || item.address?.town || item.address?.village,
                        district: item.address?.state_district || item.address?.county,
                        state: item.address?.state,
                        country: item.address?.country,
                        postcode: item.address?.postcode
                    }));
                }

                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch (err) {
                console.error('Location search error:', err);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query]);

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
        const lat = suggestion.latitude;
        const lng = suggestion.longitude;

        setPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setMapZoom(16);
        setQuery(suggestion.address || suggestion.name);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setIsConfirmed(false);

        performReverseGeocode(lat, lng, false);
    };

    // Handle map click
    const handleMapClick = (lat: number, lng: number) => {
        if (readOnly) return;
        setPosition([lat, lng]);
        setIsConfirmed(false);
        performReverseGeocode(lat, lng, false);
    };

    // Handle marker dragend
    const handleMarkerDragEnd = () => {
        const marker = markerRef.current;
        if (marker != null) {
            const latLng = marker.getLatLng();
            setPosition([latLng.lat, latLng.lng]);
            setIsConfirmed(false);
            performReverseGeocode(latLng.lat, latLng.lng, false);
        }
    };

    // Handle keyboard navigation in suggestions dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                handleSelectSuggestion(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    // Confirm button click
    const handleConfirmLocation = async () => {
        if (!position) {
            setErrorMsg('Please select a location on the map first.');
            return;
        }

        try {
            const res = await axios.post('http://localhost:8081/api/v1/location/confirm', {
                latitude: locationDetails.latitude,
                longitude: locationDetails.longitude,
                displayAddress: locationDetails.displayAddress,
                locationName: locationDetails.locationName,
                road: locationDetails.road,
                neighbourhood: locationDetails.neighbourhood,
                suburb: locationDetails.suburb,
                locality: locationDetails.locality,
                city: locationDetails.city,
                district: locationDetails.district,
                state: locationDetails.state,
                postcode: locationDetails.postcode,
                country: locationDetails.country,
                countryCode: locationDetails.countryCode,
                geocodingProvider: 'OpenStreetMap'
            });

            if (res.data) {
                setIsConfirmed(true);
                const updated: LocationData = {
                    ...locationDetails,
                    locationStatus: 'USER_CONFIRMED'
                };
                setLocationDetails(updated);
                onLocationChange?.(updated);
            }
        } catch (err) {
            // Local fallback confirmation
            setIsConfirmed(true);
            const updated: LocationData = {
                ...locationDetails,
                locationStatus: 'USER_CONFIRMED'
            };
            setLocationDetails(updated);
            onLocationChange?.(updated);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Search and Autocomplete Input */}
            {!readOnly && (
                <div ref={searchWrapperRef} className="relative z-30">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search location, street, landmark, or city (OpenStreetMap)..."
                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-xl pl-10 pr-10 py-3 text-sm text-[#10172A] placeholder-[#94A3B8] outline-none focus:border-[#00A875] focus:ring-2 focus:ring-[#00A875]/20 transition shadow-sm"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00A875] animate-spin" />
                        )}
                        {!isSearching && query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#10172A] rounded-full hover:bg-[#E2E8F0] transition"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#DDE3EA] rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-[#F1F5F9] animate-in fade-in slide-in-from-top-1 duration-150">
                            {suggestions.map((item, idx) => (
                                <button
                                    key={item.id || idx}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(item)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition ${
                                        selectedIndex === idx ? 'bg-[#F0FDF4] text-[#00A875]' : 'hover:bg-[#F8FAFC] text-[#10172A]'
                                    }`}
                                >
                                    <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${selectedIndex === idx ? 'text-[#00A875]' : 'text-[#64748B]'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">
                                            {item.name || item.address.split(',')[0]}
                                        </div>
                                        <div className="text-xs text-[#64748B] truncate mt-0.5">
                                            {item.address}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Interactive Leaflet Map */}
            <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-[#DDE3EA] shadow-inner bg-[#F1F5F9] z-10">
                <MapContainer
                    center={defaultCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapFlyController center={mapCenter} zoom={mapZoom} />

                    {!readOnly && <MapClickHandler onClick={handleMapClick} />}

                    {position && (
                        <Marker
                            position={position}
                            draggable={!readOnly}
                            ref={markerRef}
                            eventHandlers={{
                                dragend: handleMarkerDragEnd,
                            }}
                        />
                    )}
                </MapContainer>

                {/* Floating Map Controls & Indicators */}
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
                    <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-[#DDE3EA] text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[#00A875]" />
                        <span>OpenStreetMap</span>
                    </div>
                </div>

                {isReverseGeocoding && (
                    <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-[#DDE3EA] text-xs font-medium text-[#1E293B] flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-[#00A875] animate-spin" />
                        <span>Resolving address...</span>
                    </div>
                )}
            </div>

            {/* Location Confirmation & Metadata Panel */}
            {position && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-4.5 space-y-3 transition">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-[#00A875] shrink-0 mt-0.5 shadow-sm">
                                <Navigation className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Selected Location</span>
                                    {isConfirmed ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                                            <AlertCircle className="w-3 h-3" /> Unconfirmed
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-[#0F172A] leading-snug break-words">
                                    {locationDetails.displayAddress || `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`}
                                </p>
                            </div>
                        </div>

                        {!readOnly && (
                            <button
                                type="button"
                                onClick={handleConfirmLocation}
                                disabled={isConfirmed || isReverseGeocoding}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition shadow-sm w-full sm:w-auto min-h-[40px] ${
                                    isConfirmed
                                        ? 'bg-[#E2E8F0] text-[#64748B] cursor-default'
                                        : 'bg-[#00A875] text-white hover:bg-[#009265] active:scale-95 shadow-[#00A875]/20'
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isConfirmed ? 'Location Locked' : 'Confirm Location'}
                            </button>
                        )}
                    </div>

                    {/* Coordinates & Region Tags */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0]/70 text-xs">
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Latitude</span>
                            <span className="font-mono font-semibold text-[#1E293B]">{position[0].toFixed(6)}</span>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E2E8F0]">
                            <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Longitude</span>
                            <span className="font-mono font-semibold text-[#1E293B]">{position[1].toFixed(6)}</span>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] truncate">
                            <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">District / City</span>
                            <span className="font-semibold text-[#1E293B] truncate block">
                                {locationDetails.district || locationDetails.city || '—'}
                            </span>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] truncate">
                            <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">State / Country</span>
                            <span className="font-semibold text-[#1E293B] truncate block">
                                {locationDetails.state ? `${locationDetails.state}, ${locationDetails.countryCode || ''}` : locationDetails.country || '—'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {errorMsg && (
                <div className="text-xs text-[#DC2626] font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errorMsg}</span>
                </div>
            )}
        </div>
    );
}
