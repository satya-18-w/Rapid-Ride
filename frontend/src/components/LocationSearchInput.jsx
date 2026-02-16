import React, { useState, useRef, useCallback, useEffect } from 'react';
import { searchLocation } from '../api';

const LocationSearchInput = ({
    value = '',
    onChange,
    onLocationSelect,
    placeholder = 'Search for a place',
    label = '',
    showCurrentLocation = true,
    className = '',
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debounceRef = useRef(null);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const searchPlaces = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await searchLocation(query);
            const results = res.data || [];
            setSuggestions(results.slice(0, 6));
            setIsOpen(results.length > 0);
        } catch (err) {
            console.error('Search error:', err);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchPlaces(val), 500);
    };

    const handleSelect = (place) => {
        const location = {
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
        };
        const address = place.display_name;
        onChange(address);
        onLocationSelect(location, address);
        setIsOpen(false);
        setSuggestions([]);
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    onChange('Current Location');
                    onLocationSelect(loc, 'Current Location');
                    setIsOpen(false);
                },
                (err) => console.error('Geolocation error:', err)
            );
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            {label && <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">{label}</label>}

            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-lime-500/60 focus:bg-white/8 transition-all"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111] border border-gray-700 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/50 max-h-56 overflow-y-auto scrollbar-thin animate-fade-in">
                    {showCurrentLocation && (
                        <button
                            onClick={handleCurrentLocation}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-gray-800"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-blue-400 font-medium">Use Current Location</p>
                                <p className="text-[10px] text-gray-500">GPS location</p>
                            </div>
                        </button>
                    )}
                    {suggestions.map((place, i) => (
                        <button
                            key={place.place_id || i}
                            onClick={() => handleSelect(place)}
                            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-gray-800/50 last:border-b-0"
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-white truncate">{place.display_name?.split(',')[0]}</p>
                                <p className="text-[10px] text-gray-500 truncate">{place.display_name?.split(',').slice(1).join(',').trim()}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocationSearchInput;
