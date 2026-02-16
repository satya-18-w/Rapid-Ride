import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FuturisticMap from '../components/FuturisticMap';
import OTPVerification from '../components/OTPVerification';
import { getDriverProfile, updateDriverProfile, createDriverProfile, getNearbyRides, acceptRide, startRide, completeRide, setDriverAvailability, getActiveRide, getPaymentByRideId, processCashPayment } from '../api';
import { useWebSocket } from '../context/WebSocketContext';
import { getRoute, getRouteWaypoints } from '../utils/routeService';

// ─── DRIVER STATES ──────────────────────────────────────────────
const DRIVER_STEPS = {
    IDLE: 'IDLE',               // Waiting for rides
    RIDE_OFFERED: 'RIDE_OFFERED', // Sees nearby ride requests
    EN_ROUTE_PICKUP: 'EN_ROUTE_PICKUP', // Going to pickup
    AT_PICKUP: 'AT_PICKUP',     // Arrived, need OTP
    RIDE_ACTIVE: 'RIDE_ACTIVE', // Ride in progress
    PAYMENT_COLLECTION: 'PAYMENT_COLLECTION', // Collecting payment
};

const DriverDashboard = () => {
    const navigate = useNavigate();
    const { sendMessage, isConnected, subscribe } = useWebSocket();

    // State
    const [driverStep, setDriverStep] = useState(DRIVER_STEPS.IDLE);
    const [profile, setProfile] = useState(null);
    const [rides, setRides] = useState([]);
    const [currentRide, setCurrentRide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [isAvailable, setIsAvailable] = useState(true);
    const [showProfile, setShowProfile] = useState(false);
    const [showOTPInput, setShowOTPInput] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Route data
    const [routeCoords, setRouteCoords] = useState(null);
    const [approachRouteCoords, setApproachRouteCoords] = useState(null);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [routeDistance, setRouteDistance] = useState(0);
    const [routeDuration, setRouteDuration] = useState(0);

    // Profile form
    const [profileForm, setProfileForm] = useState({
        vehicle_type: 'sedan', vehicle_number: '', name: '', phone: ''
    });

    const locationWatchId = useRef(null);

    // ─── Init ───────────────────────────────────────────────────
    useEffect(() => {
        fetchProfile();
        startLocationTracking();
        return () => stopLocationTracking();
    }, [isConnected]);

    // ─── WebSocket: listen for new ride requests ────────────────
    useEffect(() => {
        const unsub = subscribe('new_ride_request', (rideData) => {
            if (driverStep !== DRIVER_STEPS.IDLE) return;
            setRides(prev => {
                // Deduplicate — avoid adding the same ride twice
                if (prev.some(r => r.id === rideData.id)) return prev;
                return [...prev, rideData];
            });
        });
        return unsub;
    }, [subscribe, driverStep]);

    useEffect(() => {
        if (driverStep === DRIVER_STEPS.IDLE && location) {
            fetchNearbyRides();
            const iv = setInterval(fetchNearbyRides, 8000);
            return () => clearInterval(iv);
        }
    }, [driverStep, location]);

    // Poll active ride
    useEffect(() => {
        const poll = async () => {
            try {
                const res = await getActiveRide();
                const ride = res.data;
                if (ride) {
                    setCurrentRide(ride);
                    if (ride.status === 'accepted') {
                        if (driverStep !== DRIVER_STEPS.EN_ROUTE_PICKUP) {
                            setDriverStep(DRIVER_STEPS.EN_ROUTE_PICKUP);
                            fetchRouteToPickup(ride);
                        }
                    } else if (ride.status === 'driver_arrived') {
                        setDriverStep(DRIVER_STEPS.AT_PICKUP);
                    } else if (ride.status === 'in_progress') {
                        if (driverStep !== DRIVER_STEPS.RIDE_ACTIVE) {
                            setDriverStep(DRIVER_STEPS.RIDE_ACTIVE);
                            fetchRouteToDestination(ride);
                        }
                    }
                }
            } catch (e) { /* no active ride */ }
        };
        poll();
        const iv = setInterval(poll, 5000);
        return () => clearInterval(iv);
    }, []);

    // ─── Location Tracking ──────────────────────────────────────
    const startLocationTracking = () => {
        if (navigator.geolocation) {
            locationWatchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    setLocation(loc);
                    if (isAvailable) {
                        sendMessage('driver_location_update', { location: loc });
                    }
                },
                (err) => console.error('Location error:', err),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
            );
        }
    };

    const stopLocationTracking = () => {
        if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
        }
    };

    // ─── API Calls ──────────────────────────────────────────────
    const fetchProfile = async () => {
        try {
            const res = await getDriverProfile();
            setProfile(res.data);
            setProfileForm({
                vehicle_type: res.data.vehicle_type || 'sedan',
                vehicle_number: res.data.vehicle_number || '',
                capacity: res.data.capacity || 4,
            });
        } catch (err) {
            if (err.response?.status === 404) {
                setShowProfile(true); // Need to create profile
            }
        }
    };

    const fetchNearbyRides = async () => {
        if (!location) return;
        try {
            const res = await getNearbyRides(location.latitude, location.longitude, 10);
            setRides(res.data || []);
        } catch (e) { /* ignore */ }
    };

    const fetchRouteToPickup = async (ride) => {
        if (!location || !ride.pickup_location) return;
        const route = await getRoute(location, ride.pickup_location);
        if (route) {
            setApproachRouteCoords(route.coordinates);
            setRouteCoords(null); // clear destination route during approach
            setRouteWaypoints([]);
            setRouteDistance(route.distanceKm);
            setRouteDuration(route.durationMin);
        }
    };

    const fetchRouteToDestination = async (ride) => {
        if (!ride.pickup_location || !ride.dropoff_location) return;
        const route = await getRoute(ride.pickup_location, ride.dropoff_location);
        if (route) {
            setRouteCoords(route.coordinates);
            setRouteWaypoints(getRouteWaypoints(route.coordinates, 6));
            setRouteDistance(route.distanceKm);
            setRouteDuration(route.durationMin);
        }
    };

    const handleAcceptRide = async (rideId) => {
        try {
            setLoading(true);
            const res = await acceptRide(rideId);
            setCurrentRide(res.data);
            setDriverStep(DRIVER_STEPS.EN_ROUTE_PICKUP);
            fetchRouteToPickup(res.data);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to accept ride');
        } finally {
            setLoading(false);
        }
    };

    const handleArrivedAtPickup = () => {
        setDriverStep(DRIVER_STEPS.AT_PICKUP);
        setShowOTPInput(true);
    };

    const handleVerifyOTP = async (otp) => {
        if (!currentRide) return;
        try {
            const res = await startRide(currentRide.id, otp);
            setCurrentRide(res.data);
            setDriverStep(DRIVER_STEPS.RIDE_ACTIVE);
            setShowOTPInput(false);
            setApproachRouteCoords(null); // clear approach route
            fetchRouteToDestination(res.data);
        } catch (e) {
            alert(e.response?.data?.error || 'Invalid OTP');
        }
    };

    const handleCompleteRide = async () => {
        if (!currentRide) return;
        // Show payment collection modal instead of completing immediately
        setDriverStep(DRIVER_STEPS.PAYMENT_COLLECTION);
    };

    const handleConfirmPayment = async () => {
        if (!currentRide) return;
        setPaymentProcessing(true);
        try {
            // Complete the ride first
            await completeRide(currentRide.id);

            // Process payment based on method
            if (selectedPaymentMethod === 'cash') {
                try {
                    const pr = await getPaymentByRideId(currentRide.id);
                    if (pr.data?.id) await processCashPayment(pr.data.id);
                } catch (e) { /* payment may not exist yet */ }
            }

            setCurrentRide(null);
            setDriverStep(DRIVER_STEPS.IDLE);
            setRouteCoords(null);
            setApproachRouteCoords(null);
            setRouteWaypoints([]);
            setSelectedPaymentMethod('cash');
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to complete ride');
            setDriverStep(DRIVER_STEPS.RIDE_ACTIVE); // Go back to active ride
        } finally {
            setPaymentProcessing(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!profile) {
                await createDriverProfile(profileForm);
            } else {
                await updateDriverProfile(profileForm);
            }
            await fetchProfile();
            setShowProfile(false);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const toggleAvailability = async () => {
        try {
            const newState = !isAvailable;
            await setDriverAvailability(newState);
            setIsAvailable(newState);
        } catch (e) { /* ignore */ }
    };

    // ─── Map config ─────────────────────────────────────────────
    const mapCenter = location
        ? [location.latitude, location.longitude]
        : [28.6139, 77.2090];

    const pickupLoc = currentRide?.pickup_location || null;
    const dropoffLoc = currentRide?.dropoff_location || null;

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="h-screen w-full bg-[#0a0a0a] relative flex flex-col overflow-hidden font-sans text-white">

            {/* ── Top Bar ─────────────────────────────────────── */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-linear-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
                        <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-wider">DRIVER MODE</span>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Availability Toggle */}
                    <button
                        onClick={toggleAvailability}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isAvailable
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                            <span>{isAvailable ? 'Online' : 'Offline'}</span>
                        </div>
                    </button>
                    {/* Profile */}
                    <button onClick={() => setShowProfile(true)} className="glass rounded-full p-2 hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </button>
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="glass rounded-full p-2 hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            {/* ── Full-Screen Map ─────────────────────────────── */}
            <div className="absolute inset-0 z-0">
                <FuturisticMap
                    center={mapCenter}
                    userLocation={location}
                    pickupLocation={pickupLoc}
                    dropoffLocation={dropoffLoc}
                    routeCoordinates={routeCoords}
                    driverRouteCoordinates={approachRouteCoords}
                    routeWaypoints={routeWaypoints}
                    nearbyDrivers={[]}
                    zoom={15}
                    showGradientOverlay={false}
                />
            </div>

            {/* ═══════════════════════════════════════════════════
                IDLE — Nearby Ride Requests
            ═══════════════════════════════════════════════════ */}
            {driverStep === DRIVER_STEPS.IDLE && rides.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up max-h-[50vh] overflow-y-auto scrollbar-hide">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Ride Requests</h3>
                            <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full">{rides.length} nearby</span>
                        </div>
                        <div className="space-y-3">
                            {rides.map(ride => (
                                <div key={ride.id} className="bg-white/5 rounded-2xl p-4 border border-gray-800 hover:border-lime-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-xs text-gray-400">{ride.distance_km?.toFixed(1)} km away</p>
                                            <p className="font-bold text-lime-400 text-lg">₹{ride.fare}</p>
                                        </div>
                                        <span className="text-xs bg-lime-500/15 text-lime-400 px-3 py-1 rounded-full font-medium">
                                            {ride.vehicle_type || 'sedan'}
                                        </span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        <div className="flex items-start space-x-2">
                                            <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0"></div>
                                            <p className="text-sm text-gray-300 truncate">{ride.pickup_address}</p>
                                        </div>
                                        <div className="flex items-start space-x-2">
                                            <div className="w-2 h-2 mt-1.5 rounded-sm bg-red-500 shrink-0"></div>
                                            <p className="text-sm text-gray-300 truncate">{ride.dropoff_address}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAcceptRide(ride.id)}
                                        disabled={loading}
                                        className="w-full bg-lime-500 text-black font-bold py-3 rounded-xl hover:bg-lime-400 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        Accept Ride
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* If IDLE with no rides */}
            {driverStep === DRIVER_STEPS.IDLE && rides.length === 0 && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-3xl">
                            🚗
                        </div>
                        <h3 className="font-bold text-lg mb-1">{isAvailable ? 'Waiting for rides...' : "You're offline"}</h3>
                        <p className="text-gray-400 text-sm">{isAvailable ? 'Ride requests will appear here' : 'Go online to receive ride requests'}</p>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                EN_ROUTE_PICKUP — Heading to pickup
            ═══════════════════════════════════════════════════ */}
            {driverStep === DRIVER_STEPS.EN_ROUTE_PICKUP && currentRide && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="font-bold text-blue-400">Heading to Pickup</span>
                            <span className="text-sm text-gray-400 ml-auto">{routeDistance.toFixed(1)} km • {routeDuration} min</span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-green-500 shrink-0"></div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Pickup Location</p>
                                    <p className="text-sm">{currentRide.pickup_address}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleArrivedAtPickup}
                            className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl hover:bg-blue-400 transition-all active:scale-[0.98] text-lg"
                        >
                            I've Arrived at Pickup
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                AT_PICKUP — Enter OTP
            ═══════════════════════════════════════════════════ */}
            {(driverStep === DRIVER_STEPS.AT_PICKUP || showOTPInput) && currentRide && (
                <OTPVerification
                    isDriver={true}
                    rideOTP={currentRide.otp}
                    onVerify={handleVerifyOTP}
                    onCancel={() => setShowOTPInput(false)}
                />
            )}

            {/* ═══════════════════════════════════════════════════
                RIDE_ACTIVE — In progress
            ═══════════════════════════════════════════════════ */}
            {driverStep === DRIVER_STEPS.RIDE_ACTIVE && currentRide && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet animate-slide-up">
                    <div className="bottom-sheet-handle"></div>
                    <div className="p-5 pt-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-bold text-green-400">Ride in Progress</span>
                            <span className="text-sm text-gray-400 ml-auto">{routeDistance.toFixed(1)} km</span>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 mb-4">
                            <div className="flex items-start space-x-3 mb-2">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0"></div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">From</p>
                                    <p className="text-sm truncate">{currentRide.pickup_address}</p>
                                </div>
                            </div>
                            <div className="ml-[3px] border-l-2 border-dashed border-gray-700 h-2"></div>
                            <div className="flex items-start space-x-3 mt-1">
                                <div className="w-2 h-2 mt-1.5 rounded-sm bg-red-500 shrink-0"></div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">To</p>
                                    <p className="text-sm truncate">{currentRide.dropoff_address}</p>
                                </div>
                            </div>
                        </div>

                        {currentRide.fare && (
                            <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 mb-4">
                                <span className="text-gray-400">Fare</span>
                                <span className="text-xl font-bold text-lime-400">₹{currentRide.fare.toFixed(0)}</span>
                            </div>
                        )}

                        <button
                            onClick={handleCompleteRide}
                            className="w-full bg-linear-to-r from-lime-500 to-emerald-500 text-black font-bold py-4 rounded-2xl hover:from-lime-400 hover:to-emerald-400 transition-all active:scale-[0.98] text-lg"
                        >
                            Complete Ride
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                PAYMENT COLLECTION MODAL
            ═══════════════════════════════════════════════════ */}
            {driverStep === DRIVER_STEPS.PAYMENT_COLLECTION && currentRide && (
                <div className="fixed inset-0 z-200 flex items-end justify-center bg-black/85 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-gray-800 rounded-t-3xl p-6 shadow-2xl animate-slide-up">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-lime-500/20 flex items-center justify-center">
                                <span className="text-2xl">💰</span>
                            </div>
                            <h3 className="text-xl font-bold text-white">Collect Payment</h3>
                            <p className="text-gray-400 text-sm mt-1">Select how you received the payment</p>
                        </div>

                        {/* Fare Display */}
                        <div className="bg-white/5 rounded-2xl p-5 mb-6 text-center">
                            <p className="text-gray-400 text-sm">Total Fare</p>
                            <p className="text-4xl font-bold text-lime-400 mt-1">₹{currentRide.fare?.toFixed(0) || '0'}</p>
                            <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-gray-500">
                                {currentRide.distance_km && <span>{currentRide.distance_km.toFixed(1)} km</span>}
                                {currentRide.duration_minutes && <span>• {currentRide.duration_minutes} min</span>}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="space-y-3 mb-6">
                            {[
                                { id: 'cash', icon: '💵', name: 'Cash', desc: 'Rider pays in cash' },
                                { id: 'upi', icon: '📱', name: 'UPI', desc: 'Digital payment via UPI' },
                                { id: 'card', icon: '💳', name: 'Card', desc: 'Credit/Debit card' },
                            ].map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedPaymentMethod(method.id)}
                                    className={`w-full flex items-center p-4 rounded-2xl border transition-all ${selectedPaymentMethod === method.id
                                        ? 'border-lime-500/60 bg-lime-500/10'
                                        : 'border-gray-800 bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-2xl mr-4">{method.icon}</span>
                                    <div className="text-left flex-1">
                                        <p className="font-semibold text-white">{method.name}</p>
                                        <p className="text-xs text-gray-400">{method.desc}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === method.id
                                        ? 'border-lime-500 bg-lime-500'
                                        : 'border-gray-600'
                                        }`}>
                                        {selectedPaymentMethod === method.id && (
                                            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setDriverStep(DRIVER_STEPS.RIDE_ACTIVE)}
                                className="flex-1 py-4 rounded-2xl border border-gray-700 text-gray-300 font-semibold hover:bg-white/5 transition-all"
                                disabled={paymentProcessing}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={paymentProcessing}
                                className="flex-2 bg-linear-to-r from-lime-500 to-emerald-500 text-black font-bold py-4 rounded-2xl hover:from-lime-400 hover:to-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {paymentProcessing ? (
                                    <span className="flex items-center justify-center space-x-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        <span>Processing...</span>
                                    </span>
                                ) : (
                                    `Confirm ₹${currentRide.fare?.toFixed(0) || '0'} ${selectedPaymentMethod === 'cash' ? 'Cash' : selectedPaymentMethod.toUpperCase()}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                PROFILE MODAL
            ═══════════════════════════════════════════════════ */}
            {showProfile && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto scrollbar-hide">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Driver Profile</h3>
                            <button onClick={() => { if (profile) setShowProfile(false); }}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Profile Picture placeholder */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-linear-to-br from-lime-500 to-emerald-500 flex items-center justify-center text-4xl font-bold text-black">
                                    {profileForm.vehicle_type === 'bike' ? '🏍️' :
                                        profileForm.vehicle_type === 'auto' ? '🛺' :
                                            profileForm.vehicle_type === 'suv' ? '🚙' : '🚗'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#0a0a0a]">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Vehicle Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'bike', icon: '🏍️', label: 'Bike' },
                                        { id: 'auto', icon: '🛺', label: 'Auto' },
                                        { id: 'sedan', icon: '🚗', label: 'Sedan' },
                                        { id: 'suv', icon: '🚙', label: 'SUV' },
                                    ].map(v => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setProfileForm({ ...profileForm, vehicle_type: v.id })}
                                            className={`p-3 rounded-xl text-center transition-all ${profileForm.vehicle_type === v.id
                                                ? 'bg-lime-500/20 border-2 border-lime-500 text-lime-400'
                                                : 'bg-white/5 border-2 border-transparent text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{v.icon}</div>
                                            <div className="text-[10px] font-bold uppercase">{v.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Vehicle Number</label>
                                <input
                                    type="text"
                                    value={profileForm.vehicle_number}
                                    onChange={(e) => setProfileForm({ ...profileForm, vehicle_number: e.target.value })}
                                    className="w-full bg-white/5 border-2 border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 transition-colors placeholder-gray-500 uppercase font-mono"
                                    placeholder="MH 02 AB 1234"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5 font-medium">Passenger Capacity</label>
                                <input
                                    type="number"
                                    value={profileForm.capacity}
                                    onChange={(e) => setProfileForm({ ...profileForm, capacity: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-white/5 border-2 border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 transition-colors"
                                    min="1"
                                    max="8"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-lime-500 text-black font-bold py-4 rounded-2xl hover:bg-lime-400 transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
