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
            {label && (
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg className="h-6 w-6 text-lime-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full pl-14 pr-14 py-4 bg-white/10 backdrop-blur-md border-2 border-lime-500/50 text-white placeholder-gray-300 rounded-2xl focus:ring-4 focus:ring-lime-500/30 focus:border-lime-400 transition-all shadow-xl hover:border-lime-400/70 hover:bg-white/15 font-medium text-base"
                    placeholder={placeholder}
                />

                <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-lime-400 hover:text-lime-300 disabled:opacity-50 transition-colors z-10 hover:scale-110"
                    title="Use current location"
                >
                    {loading ? (
                        <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-3 bg-gray-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-lime-500/30 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-lime-500 scrollbar-track-gray-800">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.place_id || index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-5 py-4 hover:bg-lime-500/20 transition-all border-b border-gray-700/50 last:border-b-0 focus:outline-none focus:bg-lime-500/30 group"
                        >
                            <div className="flex items-start">
                                <svg className="h-5 w-5 text-lime-400 mr-3 mt-0.5 flex-shrink-0 group-hover:text-lime-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate group-hover:text-lime-300">
                                        {suggestion.display_name.split(',')[0]}
                                    </p>
                                    <p className="text-xs text-gray-300 truncate mt-0.5 group-hover:text-gray-200">
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
                <div className="absolute z-50 w-full mt-3 bg-gray-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-lime-500/30 px-5 py-4">
                    <div className="flex items-center text-lime-400">
                        <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium">Searching locations...</span>
                    </div>
                </div>
            )}

            {/* No results */}
            {showSuggestions && !loading && query.length >= 3 && suggestions.length === 0 && (
                <div className="absolute z-50 w-full mt-3 bg-gray-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-lime-500/30 px-5 py-4">
                    <p className="text-sm text-gray-200 font-medium">📍 No locations found. Try a different search.</p>
                </div>
            )}
        </div>
    );
};

export default LocationSearchInput;
