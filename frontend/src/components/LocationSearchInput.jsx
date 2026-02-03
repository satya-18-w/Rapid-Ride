import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LocationSearchInput = ({
    value,
    onChange,
    onLocationSelect,
    placeholder = "Search location...",
    label = "Location"
}) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceTimer = useRef(null);
    const wrapperRef = useRef(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch suggestions from Nominatim (OpenStreetMap)
    const fetchSuggestions = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: searchQuery,
                    format: 'json',
                    addressdetails: 1,
                    limit: 5,
                    countrycodes: 'in' // Restrict to India, remove for worldwide
                },
                headers: {
                    'User-Agent': 'RapidRide/1.0' // Required by Nominatim
                }
            });

            setSuggestions(response.data);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    const handleInputChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        onChange(newQuery);

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Set new timer
        debounceTimer.current = setTimeout(() => {
            fetchSuggestions(newQuery);
        }, 500); // Wait 500ms after user stops typing
    };

    // Handle suggestion selection
    const handleSuggestionClick = (suggestion) => {
        const displayName = suggestion.display_name;
        const location = {
            latitude: parseFloat(suggestion.lat),
            longitude: parseFloat(suggestion.lon)
        };

        setQuery(displayName);
        onChange(displayName);
        onLocationSelect(location, displayName);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Get current location
    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };

                    // Reverse geocode to get address
                    try {
                        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                            params: {
                                lat: location.latitude,
                                lon: location.longitude,
                                format: 'json'
                            },
                            headers: {
                                'User-Agent': 'RapidRide/1.0'
                            }
                        });

                        const address = response.data.display_name;
                        setQuery(address);
                        onChange(address);
                        onLocationSelect(location, address);
                    } catch (error) {
                        console.error('Error reverse geocoding:', error);
                        const fallbackAddress = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
                        setQuery(fallbackAddress);
                        onChange(fallbackAddress);
                        onLocationSelect(location, fallbackAddress);
                    } finally {
                        setLoading(false);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLoading(false);
                    alert('Unable to get your location. Please enter manually.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder={placeholder}
                />

                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-600 hover:text-purple-700 disabled:opacity-50"
                    title="Use current location"
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.place_id || index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-purple-50"
                        >
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {suggestion.display_name.split(',')[0]}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {suggestion.display_name}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Loading indicator */}
            {loading && query.length >= 3 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center text-gray-500">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Searching...</span>
                    </div>
                </div>
            )}

            {/* No results */}
            {showSuggestions && !loading && query.length >= 3 && suggestions.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3">
                    <p className="text-sm text-gray-500">No locations found. Try a different search.</p>
                </div>
            )}
        </div>
    );
};

export default LocationSearchInput;
