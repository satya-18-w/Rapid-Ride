import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';
import FuturisticMap from '../components/FuturisticMap';
import RideCard from '../components/RideCard';
import LocationSearchInput from '../components/LocationSearchInput';
import VehicleSelector from '../components/VehicleSelector';
import PaymentSelector from '../components/PaymentSelector.jsx';
import OTPVerification from '../components/OTPVerification';
import { createRide, getActiveRide, cancelRide, rateRide, createPaymentOrder, processCashPayment, getPaymentByRideId, findNearbyDrivers } from '../api';

const UserHome = () => {
    const navigate = useNavigate();
    const [currentLocation, setCurrentLocation] = useState(null);
    const [pickupAddress, setPickupAddress] = useState('');
    const [dropoffAddress, setDropoffAddress] = useState('');
    const [pickupLocation, setPickupLocation] = useState(null);
    const [dropoffLocation, setDropoffLocation] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState('Rider');

    // New state for vehicle and payment selection
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState({ id: 'cash', name: 'Cash', icon: '💵' });
    const [showVehicleSelection, setShowVehicleSelection] = useState(false);
    const [showPaymentSelection, setShowPaymentSelection] = useState(false);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [distance, setDistance] = useState(5);

    // Rating modal
    const [ratingModal, setRatingModal] = useState(null);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');

    // Nearby drivers (simulation)
    const [nearbyDrivers, setNearbyDrivers] = useState([]);

    // Get current location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setCurrentLocation(location);
                    setPickupLocation(location);
                    setPickupAddress(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    const defaultLocation = { latitude: 28.6139, longitude: 77.2090 };
                    setCurrentLocation(defaultLocation);
                    setPickupLocation(defaultLocation);
                    setPickupAddress('New Delhi, India');
                }
            );
        }
    }, []);

    // Fetch nearby drivers when location is set
    useEffect(() => {
        if (currentLocation) {
            const fetchDrivers = async () => {
                try {
                    const response = await findNearbyDrivers(currentLocation.latitude, currentLocation.longitude);
                    if (response.data && response.data.drivers) {
                        // Map API response to expected format (flatten location)
                        setNearbyDrivers(response.data.drivers.map(d => ({
                            latitude: d.location.latitude,
                            longitude: d.location.longitude,
                            id: d.driver_id,
                            vehicleType: d.vehicle_type
                        })));
                    }
                } catch (error) {
                    console.error('Error fetching nearby drivers:', error);
                }
            };

            fetchDrivers();
            // Poll for nearby drivers every 10 seconds
            const interval = setInterval(fetchDrivers, 10000);
            return () => clearInterval(interval);
        }
    }, [currentLocation]);

    // Calculate distance when both locations are set
    useEffect(() => {
        if (pickupLocation && dropoffLocation) {
            const dist = calculateDistance(pickupLocation, dropoffLocation);
            setDistance(dist);
        }
    }, [pickupLocation, dropoffLocation]);

    const activeRideRef = React.useRef(activeRide);

    useEffect(() => {
        activeRideRef.current = activeRide;
    }, [activeRide]);

    // Poll for active ride
    useEffect(() => {
        const fetchActiveRide = async () => {
            // Check if token exists before making API call
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }

            try {
                const response = await getActiveRide();
                const currentRide = activeRideRef.current; // Use ref to get latest state

                // Check if status changed to accepted to show OTP
                if (response.data && response.data.status === 'accepted' && (!currentRide || currentRide.status !== 'accepted')) {
                    setShowOTPModal(true);
                }
                setActiveRide(response.data);
            } catch (error) {
                if (error.response?.status !== 401) {
                    setActiveRide(null);
                }
            }
        };

        fetchActiveRide();
        const interval = setInterval(fetchActiveRide, 5000);
        return () => clearInterval(interval);
    }, []); // Empty dependency array prevents re-running effect on state change

    const calculateDistance = (loc1, loc2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
        const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleRequestRide = async () => {
        if (!pickupLocation || !dropoffLocation) {
            alert('Please select pickup and dropoff locations');
            return;
        }

        if (!selectedVehicle) {
            setShowVehicleSelection(true);
            return;
        }

        setLoading(true);
        try {
            // Create ride first
            const rideResponse = await createRide(
                pickupLocation,
                pickupAddress,
                dropoffLocation,
                dropoffAddress,
                selectedVehicle.id,
                selectedPayment.id
            );

            const rideData = rideResponse.data;
            setActiveRide(rideData);

            // Calculate fare amount
            const fareAmount = selectedVehicle.basePrice + (selectedVehicle.pricePerKm * distance);

            // Create payment order
            try {
                await createPaymentOrder(
                    rideData.id,
                    fareAmount,
                    selectedPayment.id
                );
            } catch (paymentError) {
                console.error('Error creating payment order:', paymentError);
            }

            setShowVehicleSelection(false);
            setShowPaymentSelection(false);
        } catch (error) {
            console.error('Error creating ride:', error);
            alert(error.response?.data?.error || 'Failed to create ride');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async (rideId) => {
        if (!confirm('Are you sure you want to cancel this ride?')) return;

        try {
            await cancelRide(rideId);
            setActiveRide(null);
            setSelectedVehicle(null);
            setShowOTPModal(false);
        } catch (error) {
            console.error('Error cancelling ride:', error);
            alert(error.response?.data?.error || 'Failed to cancel ride');
        }
    };

    // Rider doesn't verify OTP, they PROVIDE it. But usually the app shows it. 
    // The previous logic had OTPVerification component for Rider too?
    // Let's assume Rider sees the OTP and Driver enters it.
    // We will show a nice modal with the OTP.

    const handleRateRide = (rideId) => {
        setRatingModal(rideId);
    };

    const submitRating = async () => {
        try {
            await rateRide(ratingModal, rating, feedback);

            // Process cash payment if payment method was cash
            if (activeRide) { // process payment regardless of method for now as simulation
                try {
                    const paymentResponse = await getPaymentByRideId(activeRide.id);
                    if (paymentResponse.data && paymentResponse.data.id && selectedPayment.id === 'cash') {
                        await processCashPayment(paymentResponse.data.id);
                    }
                } catch (paymentError) {
                    // ignore
                }
            }

            setActiveRide(null);
            setRatingModal(null);
            setRating(5);
            setFeedback('');
            setSelectedVehicle(null);
            alert('Thank you for your feedback!');
        } catch (error) {
            console.error('Error rating ride:', error);
        }
    };

    const handlePickupSelect = (location, address) => {
        setPickupLocation(location);
        setPickupAddress(address);
    };

    const handleDropoffSelect = (location, address) => {
        setDropoffLocation(location);
        setDropoffAddress(address);
    };

    const mapCenter = currentLocation
        ? [currentLocation.latitude, currentLocation.longitude]
        : [28.6139, 77.2090];

    // Generate drivers for map: if active ride, show only assigned driver
    const mapDrivers = activeRide?.driver?.location
        ? [{ ...activeRide.driver.location }]
        : nearbyDrivers;

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden flex flex-col">

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4">
                <div className="bg-glass rounded-2xl p-4 flex justify-between items-center shadow-lg shadow-lime-500/10">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center text-black font-bold">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-white font-bold">{userName}</h2>
                            <p className="text-gray-400 text-xs text-gradient">Premium Member</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
                <FuturisticMap
                    center={mapCenter}
                    userLocation={currentLocation}
                    pickupLocation={pickupLocation}
                    dropoffLocation={dropoffLocation}
                    nearbyDrivers={mapDrivers}
                    showRoute={!!(pickupLocation && dropoffLocation)}
                    zoom={15}
                />
            </div>

            {/* Gradient Overlay for bottom panel */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10"></div>


            {/* Interaction Layer */}
            <div className="absolute inset-x-0 bottom-0 z-40 p-4 pb-8 max-h-[80vh] overflow-y-auto scrollbar-hide">
                <div className="max-w-2xl mx-auto space-y-4">

                    {/* Active Ride Card */}
                    {activeRide && (
                        <div className="bg-glass rounded-3xl p-6 border border-lime-500/30 shadow-2xl shadow-lime-500/20">
                            <RideCard
                                ride={activeRide}
                                onCancel={handleCancelRide}
                                onRate={handleRateRide}
                                isDriver={false}
                            />

                            {/* OTP Display for Rider */}
                            {(activeRide.status === 'accepted' || activeRide.status === 'driver_arrived') && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-xl border border-lime-500/50 text-center animate-pulse">
                                    <p className="text-gray-300 text-sm mb-1 uppercase tracking-wider">Give this OTP to Driver</p>
                                    <p className="text-4xl font-mono font-bold text-white tracking-[0.5em]">{activeRide.otp || '****'}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Booking Form */}
                    {!activeRide && (
                        <div className="bg-glass rounded-3xl p-6 border border-gray-800 shadow-2xl backdrop-blur-xl">
                            {/* Locations */}
                            <div className="space-y-4">
                                <LocationSearchInput
                                    value={pickupAddress}
                                    onChange={setPickupAddress}
                                    onLocationSelect={handlePickupSelect}
                                    placeholder="Current Location"
                                    icon="📍"
                                />
                                <LocationSearchInput
                                    value={dropoffAddress}
                                    onChange={setDropoffAddress}
                                    onLocationSelect={handleDropoffSelect}
                                    placeholder="Where to?"
                                    icon="🏁"
                                />
                            </div>

                            {/* Vehicle Selection (Inline for speed) */}
                            {pickupLocation && dropoffLocation && (
                                <div className="mt-6">
                                    <VehicleSelector
                                        onSelect={setSelectedVehicle}
                                        selectedVehicle={selectedVehicle}
                                        distance={distance}
                                    />

                                    {selectedVehicle && (
                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-gray-400">Total Estimate</span>
                                                <span className="text-2xl font-bold text-lime-400">
                                                    ₹{Math.round(selectedVehicle.basePrice + (selectedVehicle.pricePerKm * distance))}
                                                </span>
                                            </div>

                                            <button
                                                onClick={handleRequestRide}
                                                disabled={loading}
                                                className="w-full bg-gradient-to-r from-lime-500 to-emerald-600 text-black font-bold py-4 rounded-xl shadow-lg shadow-lime-500/25 hover:scale-[1.02] transition-transform"
                                            >
                                                {loading ? 'Requesting...' : 'Book Ride Now'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Rating Modal */}
            {ratingModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold text-white text-center mb-6">Rate your Trip</h3>
                        <div className="flex justify-center gap-4 mb-8">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`text-4xl transition-transform hover:scale-125 ${star <= rating ? 'grayscale-0' : 'grayscale brightness-50'}`}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 mb-6 focus:border-lime-500 outline-none"
                            placeholder="How was your ride?"
                            rows={3}
                        />
                        <button
                            onClick={submitRating}
                            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Submit Feedback
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .glass-popup {
                    /* Custom popup overrides if needed */
                }
            `}</style>
        </div>
    );
};

export default UserHome;


