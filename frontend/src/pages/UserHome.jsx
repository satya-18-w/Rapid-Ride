import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import RideCard from '../components/RideCard';
import LocationSearchInput from '../components/LocationSearchInput';
import VehicleSelector from '../components/VehicleSelector';
import PaymentSelector from '../components/PaymentSelector';
import OTPVerification from '../components/OTPVerification';
import { createRide, getActiveRide, cancelRide, rateRide } from '../api';

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

    // Calculate distance when both locations are set
    useEffect(() => {
        if (pickupLocation && dropoffLocation) {
            const dist = calculateDistance(pickupLocation, dropoffLocation);
            setDistance(dist);
        }
    }, [pickupLocation, dropoffLocation]);

    // Poll for active ride
    useEffect(() => {
        const fetchActiveRide = async () => {
            try {
                const response = await getActiveRide();
                setActiveRide(response.data);
                
                // Show OTP modal when driver accepts ride
                if (response.data && response.data.status === 'accepted' && !showOTPModal) {
                    setShowOTPModal(true);
                }
            } catch (error) {
                setActiveRide(null);
            }
        };

        fetchActiveRide();
        const interval = setInterval(fetchActiveRide, 5000);
        return () => clearInterval(interval);
    }, [showOTPModal]);

    const calculateDistance = (loc1, loc2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
        const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const handleRequestRide = async () => {
        if (!pickupLocation || !dropoffLocation || !pickupAddress || !dropoffAddress) {
            alert('Please enter both pickup and dropoff locations');
            return;
        }

        if (!selectedVehicle) {
            setShowVehicleSelection(true);
            return;
        }

        setLoading(true);
        try {
            const response = await createRide(
                pickupLocation,
                pickupAddress,
                dropoffLocation,
                dropoffAddress,
                selectedVehicle.id,
                selectedPayment.id
            );
            setActiveRide(response.data);
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

    const handleOTPVerify = (otp) => {
        // OTP verified, close modal
        setShowOTPModal(false);
        alert('Ride started! Enjoy your journey.');
    };

    const handleRateRide = (rideId) => {
        setRatingModal(rideId);
    };

    const submitRating = async () => {
        try {
            await rateRide(ratingModal, rating, feedback);
            setActiveRide(null);
            setRatingModal(null);
            setRating(5);
            setFeedback('');
            setSelectedVehicle(null);
            alert('Thank you for your feedback!');
        } catch (error) {
            console.error('Error rating ride:', error);
            alert(error.response?.data?.error || 'Failed to submit rating');
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

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lime-900/20 via-transparent to-transparent"></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(132,204,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(132,204,22,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            {/* Header */}
            <div className="relative z-10">
                <div className="bg-gradient-to-r from-gray-900/80 to-black/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            {/* User Profile */}
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center text-xl font-bold text-black shadow-lg shadow-lime-500/50">
                                    {userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Hello,</p>
                                    <h2 className="text-white font-bold text-lg">{userName}</h2>
                                </div>
                            </div>

                            {/* Logo */}
                            <div className="absolute left-1/2 transform -translate-x-1/2">
                                <div className="text-center">
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
                                        ⚡ RAPID RIDE
                                    </h1>
                                    <p className="text-xs text-gray-500">Premium Transport</p>
                                </div>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={() => navigate('/')}
                                className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-lime-500/20"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-6">
                    {/* Map Section */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-3xl blur-2xl"></div>
                        <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl">
                            <div className={`transition-all duration-500 ${activeRide ? 'h-96' : 'h-64'}`}>
                                <Map
                                    center={mapCenter}
                                    userLocation={currentLocation}
                                    pickupLocation={pickupLocation}
                                    dropoffLocation={dropoffLocation}
                                    driverLocation={activeRide?.driver?.location}
                                    showRoute={pickupLocation && dropoffLocation}
                                    vehicleType={selectedVehicle?.id || activeRide?.vehicle_type}
                                />
                            </div>
                            
                            {/* Map overlay info */}
                            {!activeRide && pickupLocation && dropoffLocation && (
                                <div className="absolute top-4 left-4 right-4">
                                    <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-lime-500/30">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Distance</span>
                                            <span className="text-lime-400 font-bold">{distance.toFixed(1)} km</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Ride Info */}
                    {activeRide && (
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
                            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50">
                                <RideCard
                                    ride={activeRide}
                                    onCancel={handleCancelRide}
                                    onRate={handleRateRide}
                                    isDriver={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Ride Booking Interface */}
                    {!activeRide && (
                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Left Column - Location & Vehicle */}
                            <div className="space-y-6">
                                {/* Location Inputs */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
                                    <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50">
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                            <span className="mr-2">📍</span>
                                            Where to go?
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-lime-500 rounded-full shadow-lg shadow-lime-500/50"></div>
                                                <LocationSearchInput
                                                    value={pickupAddress}
                                                    onChange={setPickupAddress}
                                                    onLocationSelect={handlePickupSelect}
                                                    placeholder="Pickup location..."
                                                    className="pl-10"
                                                />
                                            </div>

                                            {/* Connection line */}
                                            <div className="flex justify-start pl-6">
                                                <div className="w-0.5 h-8 bg-gradient-to-b from-lime-500 to-purple-500"></div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50"></div>
                                                <LocationSearchInput
                                                    value={dropoffAddress}
                                                    onChange={setDropoffAddress}
                                                    onLocationSelect={handleDropoffSelect}
                                                    placeholder="Dropoff location..."
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        {/* Quick location buttons */}
                                        <div className="mt-4 flex gap-2 flex-wrap">
                                            <button className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full text-xs text-gray-400 hover:text-white transition-all">
                                                🏠 Home
                                            </button>
                                            <button className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full text-xs text-gray-400 hover:text-white transition-all">
                                                💼 Office
                                            </button>
                                            <button className="px-3 py-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-full text-xs text-gray-400 hover:text-white transition-all">
                                                📍 Current
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Selection */}
                                {pickupLocation && dropoffLocation && (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>
                                        <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50">
                                            <VehicleSelector
                                                onSelect={setSelectedVehicle}
                                                selectedVehicle={selectedVehicle}
                                                distance={distance}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column - Payment & Action */}
                            <div className="space-y-6">
                                {/* Payment Selection */}
                                {selectedVehicle && (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
                                        <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50">
                                            <PaymentSelector
                                                onSelect={setSelectedPayment}
                                                selectedPayment={selectedPayment}
                                                amount={selectedVehicle ? selectedVehicle.basePrice + (selectedVehicle.pricePerKm * distance) : 0}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Trip Summary & Book Button */}
                                {selectedVehicle && (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-3xl blur-2xl animate-pulse"></div>
                                        <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-3xl p-6 border-2 border-lime-500/50 shadow-2xl">
                                            <h3 className="text-xl font-bold text-white mb-4">Trip Summary</h3>
                                            
                                            <div className="space-y-3 mb-6">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Vehicle</span>
                                                    <span className="text-white font-semibold">{selectedVehicle.icon} {selectedVehicle.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Distance</span>
                                                    <span className="text-white font-semibold">{distance.toFixed(1)} km</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">Payment</span>
                                                    <span className="text-white font-semibold">{selectedPayment.icon} {selectedPayment.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400">ETA</span>
                                                    <span className="text-white font-semibold">{selectedVehicle.eta}</span>
                                                </div>
                                                <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-2"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white font-bold text-lg">Total Fare</span>
                                                    <span className="text-lime-400 font-bold text-2xl">
                                                        ₹{(selectedVehicle.basePrice + (selectedVehicle.pricePerKm * distance)).toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleRequestRide}
                                                disabled={loading}
                                                className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-700 text-black font-bold py-4 rounded-2xl transition-all transform hover:scale-105 disabled:scale-100 shadow-2xl hover:shadow-lime-500/50 disabled:shadow-none relative overflow-hidden group"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                <span className="relative flex items-center justify-center">
                                                    {loading ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Finding drivers...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-2xl mr-2">🚀</span>
                                                            Book {selectedVehicle.name}
                                                        </>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button className="bg-gray-900/80 backdrop-blur-xl hover:bg-gray-800/80 border border-gray-800/50 rounded-2xl p-4 transition-all transform hover:scale-105 group">
                                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                                        <p className="text-sm font-semibold text-white">History</p>
                                        <p className="text-xs text-gray-500">View past rides</p>
                                    </button>
                                    <button className="bg-gray-900/80 backdrop-blur-xl hover:bg-gray-800/80 border border-gray-800/50 rounded-2xl p-4 transition-all transform hover:scale-105 group">
                                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💳</div>
                                        <p className="text-sm font-semibold text-white">Wallet</p>
                                        <p className="text-xs text-gray-500">₹0.00</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Rides Section */}
                    {!activeRide && (
                        <div className="relative mt-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-900/20 rounded-3xl blur-xl"></div>
                            <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">Recent Rides</h3>
                                    <button className="text-lime-400 text-sm font-semibold hover:text-lime-300 transition-colors">
                                        See all →
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {/* Placeholder for recent rides */}
                                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center text-xl">
                                                    🏠
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">Home</p>
                                                    <p className="text-gray-500 text-xs">Dec 15 • 6.4 km</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">₹128</p>
                                                <button className="text-lime-400 text-xs hover:text-lime-300">Book again</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center text-xl">
                                                    💼
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-sm">Office</p>
                                                    <p className="text-gray-500 text-xs">Dec 14 • 8.2 km</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">₹156</p>
                                                <button className="text-lime-400 text-xs hover:text-lime-300">Book again</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* OTP Modal */}
            {showOTPModal && activeRide && (
                <OTPVerification
                    onVerify={handleOTPVerify}
                    onCancel={() => setShowOTPModal(false)}
                    rideOTP={activeRide.otp || '1234'}
                    isDriver={false}
                />
            )}

            {/* Rating Modal */}
            {ratingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-0 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-3xl blur-xl opacity-30"></div>
                        <div className="relative bg-gray-900 rounded-3xl p-6 border border-gray-800">
                            <button
                                onClick={() => {
                                    setRatingModal(null);
                                    setRating(5);
                                    setFeedback('');
                                }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-lime-500 to-emerald-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-lime-500/50">
                                    ⭐
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Rate Your Ride</h3>
                                <p className="text-gray-400">How was your experience?</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex gap-2 justify-center mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="text-4xl transition-all hover:scale-110 transform"
                                        >
                                            {star <= rating ? '⭐' : '☆'}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                                    rows="3"
                                    placeholder="Tell us about your experience..."
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setRatingModal(null);
                                        setRating(5);
                                        setFeedback('');
                                    }}
                                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitRating}
                                    className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-black py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-lime-500/50"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserHome;
