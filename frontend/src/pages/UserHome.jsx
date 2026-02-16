import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FuturisticMap from '../components/FuturisticMap';
import LocationSearchInput from '../components/LocationSearchInput';
import VehicleSelector from '../components/VehicleSelector';
import { createRide, getActiveRide, cancelRide, rateRide, createPaymentOrder, processCashPayment, getPaymentByRideId, findNearbyDrivers, getUserProfile } from '../api';
import { getRoute, getDriverToPickupRoute, getRouteWaypoints, haversineDistance } from '../utils/routeService';

// ─── RIDE FLOW STEPS ────────────────────────────────────────────
const STEPS = {
    LOCATION_INPUT: 'LOCATION_INPUT',
    ROUTE_PREVIEW: 'ROUTE_PREVIEW',
    SEARCHING_DRIVER: 'SEARCHING_DRIVER',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    RIDE_IN_PROGRESS: 'RIDE_IN_PROGRESS',
    RIDE_COMPLETE: 'RIDE_COMPLETE',
};

const UserHome = () => {
    const navigate = useNavigate();

    // Core state
    const [step, setStep] = useState(STEPS.LOCATION_INPUT);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [pickupAddress, setPickupAddress] = useState('');
    const [dropoffAddress, setDropoffAddress] = useState('');
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropoffLocation, setDropoffLocation] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('Rider');
    const [userPhone, setUserPhone] = useState('');
    const [isMapSelecting, setIsMapSelecting] = useState(false);
    const [useCurrentLocation, setUseCurrentLocation] = useState(true);

    // Vehicle & payment
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState({ id: 'cash', name: 'Cash', icon: '💵' });

    // Route data (from OSRM)
    const [routeCoordinates, setRouteCoordinates] = useState(null);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [routeDistance, setRouteDistance] = useState(0);
    const [routeDuration, setRouteDuration] = useState(0);

    // Driver tracking
    const [driverRouteCoords, setDriverRouteCoords] = useState(null);
    const [driverETA, setDriverETA] = useState(null);
    const [nearbyDrivers, setNearbyDrivers] = useState([]);

    // Rating
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');

    const activeRideRef = useRef(activeRide);
    useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);

    // ─── Get current location ───────────────────────────────────
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    setCurrentLocation(loc);
                    setPickupLocation(loc);
                    setPickupAddress('Current Location');
                },
                () => {
                    const def = { latitude: 28.6139, longitude: 77.2090 };
                    setCurrentLocation(def);
                    setPickupLocation(def);
                }
            );
        }
    }, []);

    // ─── Fetch user profile ─────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getUserProfile();
                if (res.data) {
                    setUserName(res.data.name || 'Rider');
                    setUserPhone(res.data.phone || '');
                }
            } catch (e) { /* ignore */ }
        };
        fetchProfile();
    }, []);

    // ─── Fetch nearby drivers ───────────────────────────────────
    useEffect(() => {
        if (!currentLocation) return;
        if (step !== STEPS.LOCATION_INPUT && step !== STEPS.ROUTE_PREVIEW && step !== STEPS.SEARCHING_DRIVER) return;
        const fetch = async () => {
            try {
                const res = await findNearbyDrivers(currentLocation.latitude, currentLocation.longitude);
                if (res.data?.drivers) {
                    setNearbyDrivers(res.data.drivers
                        .filter(d => d.latitude && d.longitude)
                        .map(d => ({
                            latitude: d.latitude,
                            longitude: d.longitude,
                            id: d.id,
                            vehicleType: d.vehicle_type || 'car'
                        }))
                    );
                }
            } catch (e) { /* ignore */ }
        };
        fetch();
        const interval = setInterval(fetch, 15000);
        return () => clearInterval(interval);
    }, [currentLocation, step]);

    // ─── Fetch route when both locations set ────────────────────
    useEffect(() => {
        if (!pickupLocation || !dropoffLocation) return;
        const fetchRoute = async () => {
            const route = await getRoute(pickupLocation, dropoffLocation);
            if (route) {
                setRouteCoordinates(route.coordinates);
                setRouteDistance(route.distanceKm);
                setRouteDuration(route.durationMin);
                setRouteWaypoints(getRouteWaypoints(route.coordinates, 6));
            }
        };
        fetchRoute();
    }, [pickupLocation, dropoffLocation]);

    // ─── Poll active ride ───────────────────────────────────────
    useEffect(() => {
        const fetchActive = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await getActiveRide();
                const ride = res.data;
                if (!ride) { return; }

                const prev = activeRideRef.current;
                setActiveRide(ride);

                // Determine step from ride status
                if (ride.status === 'requested') {
                    setStep(STEPS.SEARCHING_DRIVER);
                    // Restore locations if refreshing
                    if (!routeCoordinates && ride.pickup_location && ride.dropoff_location) {
                        setPickupLocation(ride.pickup_location);
                        setDropoffLocation(ride.dropoff_location);
                        setPickupAddress(ride.pickup_address);
                        setDropoffAddress(ride.dropoff_address);
                    }
                } else if (ride.status === 'accepted' || ride.status === 'driver_arrived') {
                    setStep(STEPS.DRIVER_ASSIGNED);
                    // Fetch driver→pickup route
                    if (ride.driver?.location && ride.pickup_location) {
                        const pickup = ride.pickup_location;
                        const driverLoc = ride.driver.location;
                        const dRoute = await getDriverToPickupRoute(driverLoc, pickup);
                        if (dRoute) {
                            setDriverRouteCoords(dRoute.coordinates);
                            setDriverETA(dRoute.durationMin);
                        }
                    }
                    // Set route if not already set
                    if (!routeCoordinates && ride.pickup_location && ride.dropoff_location) {
                        setPickupLocation(ride.pickup_location);
                        setDropoffLocation(ride.dropoff_location);
                        setPickupAddress(ride.pickup_address);
                        setDropoffAddress(ride.dropoff_address);
                    }
                } else if (ride.status === 'in_progress') {
                    setStep(STEPS.RIDE_IN_PROGRESS);
                    setDriverRouteCoords(null);
                    if (!routeCoordinates && ride.pickup_location && ride.dropoff_location) {
                        setPickupLocation(ride.pickup_location);
                        setDropoffLocation(ride.dropoff_location);
                    }
                } else if (ride.status === 'completed') {
                    setStep(STEPS.RIDE_COMPLETE);
                }
            } catch (e) {
                if (e.response?.status !== 401) {
                    // No active ride
                }
            }
        };

        fetchActive();
        const interval = setInterval(fetchActive, 4000);
        return () => clearInterval(interval);
    }, []);

    // ─── Handlers ───────────────────────────────────────────────
    const handlePickupSelect = (location, address) => {
        setPickupLocation(location);
        setPickupAddress(address);
        setIsMapSelecting(false);
    };

    const handleDropoffSelect = (location, address) => {
        setDropoffLocation(location);
        setDropoffAddress(address);
        // Auto-advance to route preview
        if (pickupLocation) {
            setTimeout(() => setStep(STEPS.ROUTE_PREVIEW), 300);
        }
    };

    const handleMapCenterChange = (center) => {
        if (isMapSelecting) {
            setPickupLocation(center);
            setPickupAddress(`${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`);
        }
    };

    const handleRequestRide = async () => {
        if (!pickupLocation || !dropoffLocation || !selectedVehicle) return;
        setLoading(true);
        try {
            const res = await createRide(pickupLocation, pickupAddress, dropoffLocation, dropoffAddress, selectedVehicle.id, selectedPayment.id);
            setActiveRide(res.data);
            setStep(STEPS.SEARCHING_DRIVER);
            const fare = selectedVehicle.basePrice + (selectedVehicle.pricePerKm * routeDistance);
            try { await createPaymentOrder(res.data.id, fare, selectedPayment.id); } catch (e) { /* ignore */ }
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to create ride');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async () => {
        if (!activeRide) return;
        if (!confirm('Cancel this ride?')) return;
        try {
            await cancelRide(activeRide.id);
            resetFlow();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to cancel');
        }
    };

    const submitRating = async () => {
        if (!activeRide) return;
        try {
            await rateRide(activeRide.id, rating, feedback);
            if (selectedPayment.id === 'cash') {
                try {
                    const pr = await getPaymentByRideId(activeRide.id);
                    if (pr.data?.id) await processCashPayment(pr.data.id);
                } catch (e) { /* ignore */ }
            }
            resetFlow();
        } catch (e) { /* ignore */ }
    };

    const resetFlow = () => {
        setActiveRide(null);
        setStep(STEPS.LOCATION_INPUT);
        setSelectedVehicle(null);
        setRouteCoordinates(null);
        setRouteWaypoints([]);
        setDriverRouteCoords(null);
        setDriverETA(null);
        setRating(5);
        setFeedback('');
        setDropoffAddress('');
        setDropoffLocation(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    // ─── Map config ─────────────────────────────────────────────
    const mapCenter = pickupLocation
        ? [pickupLocation.latitude, pickupLocation.longitude]
        : currentLocation
            ? [currentLocation.latitude, currentLocation.longitude]
            : [28.6139, 77.2090];

    const mapDrivers = (step === STEPS.LOCATION_INPUT || step === STEPS.ROUTE_PREVIEW || step === STEPS.SEARCHING_DRIVER) ? nearbyDrivers : [];

    const driverLoc = activeRide?.driver?.location
        ? { ...activeRide.driver.location, vehicleType: activeRide.driver.vehicle_type || 'car' }
        : null;

    // ─── Render ────────────────────────────────────────────────
    return (
        <div className="h-screen w-full bg-[#0a0a0a] relative flex flex-col overflow-hidden font-sans text-white">

            {/* ── Top Bar ─────────────────────────────────────── */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-wider">RAPID RIDE</span>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="glass rounded-full px-3 py-1.5 flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center font-bold text-black text-xs">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-300 hidden sm:block">{userName}</span>
                    </div>
                    <button onClick={handleLogout} className="glass rounded-full p-2 hover:bg-white/10 transition-colors" title="Logout">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Full-Screen Map ─────────────────────────────── */}
            <div className="absolute inset-0 z-0">
                <FuturisticMap
                    center={mapCenter}
                    userLocation={currentLocation}
                    pickupLocation={pickupLocation}
                    dropoffLocation={dropoffLocation}
                    nearbyDrivers={mapDrivers}
                    routeCoordinates={routeCoordinates}
                    driverRouteCoordinates={driverRouteCoords}
                    routeWaypoints={step === STEPS.ROUTE_PREVIEW || step === STEPS.DRIVER_ASSIGNED || step === STEPS.RIDE_IN_PROGRESS ? routeWaypoints : []}
                    driverLocation={driverLoc}
                    zoom={15}
                    onCenterChange={handleMapCenterChange}
                    isSelecting={isMapSelecting}
                    showGradientOverlay={step === STEPS.LOCATION_INPUT}
                />
            </div>

            {/* ── Map Selection Mode ──────────────────────────── */}
            {isMapSelecting && (
                <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-[1000]">
                    <button
                        onClick={() => setIsMapSelecting(false)}
                        className="bg-lime-500 text-black px-8 py-4 rounded-full font-bold shadow-2xl hover:bg-lime-400 transition-all flex items-center space-x-2 animate-fade-in-up"
                    >
                        <span>Confirm Pickup</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 1: LOCATION INPUT
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.LOCATION_INPUT && !isMapSelecting && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up" style={{ overflow: 'visible' }}>
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4 pb-56">
                        <h2 className="text-xl font-bold mb-4">Where to?</h2>

                        <div className="space-y-3 relative">
                            {/* Connection line */}
                            <div className="absolute left-[14px] top-[24px] bottom-[24px] w-[2px] bg-gradient-to-b from-green-500 to-red-500 z-0"></div>

                            {/* Pickup */}
                            <div className="relative z-10">
                                <div className="flex items-center space-x-3 mb-1.5">
                                    <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-[#0a0a0a] shrink-0"></div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pickup</span>
                                </div>
                                <div className="ml-6">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1">
                                            {useCurrentLocation ? (
                                                <button
                                                    onClick={() => { setUseCurrentLocation(false); setPickupAddress(''); }}
                                                    className="w-full flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-left hover:bg-blue-500/15 transition-all"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                                            <path strokeLinecap="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-blue-400">Current Location</span>
                                                        <p className="text-[10px] text-gray-500">Using your GPS location</p>
                                                    </div>
                                                </button>
                                            ) : (
                                                <LocationSearchInput
                                                    value={pickupAddress}
                                                    onChange={setPickupAddress}
                                                    onLocationSelect={handlePickupSelect}
                                                    placeholder="Enter pickup address"
                                                    label=""
                                                />
                                            )}
                                        </div>
                                        {/* GPS toggle button */}
                                        <button
                                            onClick={() => {
                                                setUseCurrentLocation(true);
                                                if (currentLocation) {
                                                    setPickupLocation(currentLocation);
                                                    setPickupAddress('Current Location');
                                                }
                                            }}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${useCurrentLocation
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-blue-400'
                                                }`}
                                            title="Use current location"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="3" strokeWidth="2" />
                                                <path strokeLinecap="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex space-x-3 mt-1.5">
                                        <button
                                            onClick={() => setIsMapSelecting(true)}
                                            className="text-xs text-lime-400 hover:text-lime-300 flex items-center"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                            Set on map
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Destination */}
                            <div className="relative z-20">
                                <div className="flex items-center space-x-3 mb-1.5">
                                    <div className="w-3 h-3 rounded-sm bg-red-500 ring-4 ring-[#0a0a0a] flex-shrink-0"></div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Destination</span>
                                </div>
                                <div className="ml-6">
                                    <LocationSearchInput
                                        value={dropoffAddress}
                                        onChange={setDropoffAddress}
                                        onLocationSelect={handleDropoffSelect}
                                        placeholder="Where are you going?"
                                        label=""
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 2: ROUTE PREVIEW + VEHICLE SELECTION
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.ROUTE_PREVIEW && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up max-h-[65vh] overflow-y-auto scrollbar-hide">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4">
                        {/* Route Summary */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={() => { setStep(STEPS.LOCATION_INPUT); setSelectedVehicle(null); }}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="text-center">
                                <p className="text-xs text-gray-400">Estimated Trip</p>
                                <p className="text-lg font-bold">{routeDistance.toFixed(1)} km <span className="text-gray-500 text-sm font-normal">• {routeDuration} min</span></p>
                            </div>
                            <div className="w-8"></div>
                        </div>

                        {/* Route Addresses */}
                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                            <div className="flex items-start space-x-3 mb-3">
                                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pickup</p>
                                    <p className="text-sm text-white truncate">{pickupAddress}</p>
                                </div>
                            </div>
                            <div className="ml-1 pl-0 border-l-2 border-dashed border-gray-700 h-3 ml-[4px]"></div>
                            <div className="flex items-start space-x-3 mt-1">
                                <div className="w-2.5 h-2.5 mt-1.5 rounded-sm bg-red-500 flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Destination</p>
                                    <p className="text-sm text-white truncate">{dropoffAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Vehicles */}
                        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Choose your ride</h3>
                        <VehicleSelector
                            onSelect={setSelectedVehicle}
                            selectedVehicle={selectedVehicle}
                            distance={routeDistance}
                        />

                        {/* Book Button */}
                        {selectedVehicle && (
                            <div className="mt-5 animate-fade-in-up">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Total Fare</p>
                                        <p className="text-3xl font-bold">₹{Math.round(selectedVehicle.basePrice + (selectedVehicle.pricePerKm * routeDistance))}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lime-400 text-sm font-bold">{selectedVehicle.name}</p>
                                        <p className="text-xs text-gray-500">{selectedPayment.icon} {selectedPayment.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRequestRide}
                                    disabled={loading}
                                    className="w-full bg-lime-500 text-black font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] shadow-lg shadow-lime-500/20 text-lg disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center space-x-2">
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>Booking...</span>
                                        </span>
                                    ) : 'Book Ride'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 3: SEARCHING FOR DRIVER
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.SEARCHING_DRIVER && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-6 text-center">
                        {/* Searching animation */}
                        <div className="relative w-24 h-24 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-full border-4 border-lime-500/30 animate-ping"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-lime-500/20 animate-ping animation-delay-200"></div>
                            <div className="absolute inset-4 rounded-full border-4 border-lime-500/10 animate-ping animation-delay-400"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-lime-500/30">
                                    <svg className="w-7 h-7 text-black animate-spin" style={{ animationDuration: '3s' }} fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2a10 10 0 019.95 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-1">Looking for your ride</h3>
                        <p className="text-gray-400 text-sm mb-2">
                            Connecting you with nearby drivers
                        </p>
                        <div className="searching-dots my-3">
                            <span></span><span></span><span></span>
                        </div>

                        {/* Route info */}
                        <div className="bg-white/5 rounded-2xl p-4 mt-4 text-left">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Route</span>
                                <span className="font-bold">{routeDistance.toFixed(1)} km • {routeDuration} min</span>
                            </div>
                        </div>

                        <button onClick={handleCancelRide}
                            className="w-full mt-5 py-3.5 rounded-2xl border border-red-500/25 text-red-400 font-medium text-sm hover:bg-red-500/10 transition-all active:scale-[0.98]">
                            Cancel Request
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 4: DRIVER ASSIGNED — OTP + TRACKING
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.DRIVER_ASSIGNED && activeRide && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up max-h-[75vh] overflow-y-auto scrollbar-hide">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-3">

                        {/* ── Status Badge ── */}
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center bg-blue-500/15 text-blue-400 px-5 py-2 rounded-full text-sm font-bold mb-1 backdrop-blur-sm border border-blue-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
                                {activeRide.status === 'driver_arrived' ? '🎉 Driver Arrived!' : '🚗 Driver on the way'}
                            </div>
                            {driverETA && activeRide.status !== 'driver_arrived' && (
                                <p className="text-gray-400 text-sm mt-1">Arriving in <span className="text-white font-bold">~{driverETA} min</span></p>
                            )}
                        </div>

                        {/* ── OTP Section ── */}
                        {activeRide.otp && (
                            <div className="relative overflow-hidden rounded-2xl p-5 mb-4 animate-scale-in border border-lime-500/25"
                                style={{ background: 'linear-gradient(135deg, rgba(132,204,22,0.12) 0%, rgba(16,185,129,0.12) 50%, rgba(6,182,212,0.08) 100%)' }}>
                                {/* Subtle glow */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-lime-400/15 rounded-full blur-2xl"></div>
                                <div className="relative text-center">
                                    <div className="flex items-center justify-center space-x-1.5 mb-3">
                                        <svg className="w-4 h-4 text-lime-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" /></svg>
                                        <span className="text-xs font-bold text-lime-400 uppercase tracking-widest">Ride OTP</span>
                                    </div>
                                    <div className="flex justify-center space-x-3 mb-3">
                                        {activeRide.otp.split('').map((digit, i) => (
                                            <div key={i}
                                                className="w-14 h-16 rounded-xl bg-black/40 backdrop-blur-sm border border-lime-500/30 flex items-center justify-center text-3xl font-black text-white shadow-lg animate-scale-in"
                                                style={{ animationDelay: `${i * 0.1}s`, textShadow: '0 0 20px rgba(132,204,22,0.5)' }}>
                                                {digit}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400">Share this OTP with your driver to start the ride</p>
                                    {userPhone && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            📱 OTP sent to {userPhone.replace(/(\d{2})\d+(\d{2})/, '$1*****$2')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Driver Info Card ── */}
                        {activeRide.driver && (
                            <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/10 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {/* Avatar with gradient ring */}
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[2px]">
                                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-xl font-bold text-white">
                                                    {activeRide.driver.name?.charAt(0) || 'D'}
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-500 border-2 border-[#0a0a0a] flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-base">{activeRide.driver.name}</p>
                                            <div className="flex items-center space-x-2 mt-0.5">
                                                <span className="text-yellow-400 text-xs">⭐</span>
                                                <span className="text-xs text-gray-300 font-medium">{activeRide.driver.rating?.toFixed(1) || '4.8'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Call button */}
                                    {activeRide.driver.phone && (
                                        <a href={`tel:${activeRide.driver.phone}`}
                                            className="w-11 h-11 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center hover:bg-green-500/25 transition-all active:scale-95">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </a>
                                    )}
                                </div>

                                {/* Vehicle Details Strip */}
                                <div className="mt-3 flex items-center bg-white/[0.04] rounded-xl p-3 border border-white/5">
                                    <span className="text-2xl mr-3">
                                        {activeRide.driver.vehicle_type === 'bike' ? '🏍️' :
                                            activeRide.driver.vehicle_type === 'auto' ? '🛺' :
                                                activeRide.driver.vehicle_type === 'suv' ? '🚙' : '🚗'}
                                    </span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white capitalize">{activeRide.driver.vehicle_type || 'Sedan'}</p>
                                        <p className="text-xs text-gray-400 font-mono tracking-wider mt-0.5">{activeRide.driver.vehicle_number || 'XX-00-XX-0000'}</p>
                                    </div>
                                    {driverETA && activeRide.status !== 'driver_arrived' && (
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-blue-400">{driverETA}'</p>
                                            <p className="text-[10px] text-gray-500 uppercase">ETA</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Fare + Route Info ── */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {activeRide.fare && (
                                <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Fare</p>
                                    <p className="text-2xl font-black text-white">₹{activeRide.fare.toFixed(0)}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{activeRide.payment_method || 'cash'}</p>
                                </div>
                            )}
                            <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/5 text-center">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Distance</p>
                                <p className="text-2xl font-black text-white">{routeDistance?.toFixed(1) || '—'}<span className="text-sm font-normal text-gray-400 ml-1">km</span></p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{routeDuration || '—'} min</p>
                            </div>
                        </div>

                        {/* ── Cancel Button ── */}
                        <button onClick={handleCancelRide}
                            className="w-full py-3.5 rounded-2xl border border-red-500/25 text-red-400 font-medium text-sm hover:bg-red-500/10 transition-all active:scale-[0.98]">
                            Cancel Ride
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 5: RIDE IN PROGRESS
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.RIDE_IN_PROGRESS && activeRide && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="font-bold text-green-400">Ride in Progress</span>
                            </div>
                            <span className="text-sm text-gray-400">{routeDistance.toFixed(1)} km</span>
                        </div>

                        {/* Route Info */}
                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                            <div className="flex items-start space-x-3 mb-2">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">From</p>
                                    <p className="text-sm truncate">{activeRide.pickup_address || pickupAddress}</p>
                                </div>
                            </div>
                            <div className="ml-[3px] border-l-2 border-dashed border-gray-700 h-2"></div>
                            <div className="flex items-start space-x-3 mt-1">
                                <div className="w-2 h-2 mt-1.5 rounded-sm bg-red-500 flex-shrink-0"></div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">To</p>
                                    <p className="text-sm truncate">{activeRide.dropoff_address || dropoffAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* Driver info mini */}
                        {activeRide.driver && (
                            <div className="flex items-center space-x-3 bg-white/5 rounded-2xl p-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                                    {activeRide.driver.name?.charAt(0) || 'D'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{activeRide.driver.name}</p>
                                    <p className="text-xs text-gray-400">{activeRide.driver.vehicle_number}</p>
                                </div>
                                {activeRide.fare && (
                                    <span className="font-bold text-lg">₹{activeRide.fare.toFixed(0)}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                STEP 6: RIDE COMPLETE — RATING
            ═══════════════════════════════════════════════════ */}
            {step === STEPS.RIDE_COMPLETE && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 shadow-2xl animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center text-3xl shadow-lg shadow-lime-500/30">
                                🎉
                            </div>
                            <h3 className="text-2xl font-bold">Ride Complete!</h3>
                            <p className="text-gray-400 text-sm mt-1">How was your trip?</p>
                        </div>

                        {/* Stars */}
                        <div className="flex justify-center gap-3 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`text-4xl transition-all hover:scale-125 ${star <= rating ? 'grayscale-0 scale-110' : 'grayscale brightness-50 scale-100'}`}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full bg-white/5 border border-gray-700 rounded-2xl p-4 text-white placeholder-gray-500 mb-5 focus:border-lime-500 outline-none resize-none"
                            placeholder="How was your ride?"
                            rows={3}
                        />

                        <button
                            onClick={submitRating}
                            className="w-full bg-lime-500 text-black font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] text-lg"
                        >
                            Submit Rating
                        </button>
                        <button onClick={resetFlow} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-300 transition-colors">
                            Skip
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserHome;
