import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import RideCard from '../components/RideCard';
import LocationSearchInput from '../components/LocationSearchInput';
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
    const [mapExpanded, setMapExpanded] = useState(false);
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

    // Poll for active ride
    useEffect(() => {
        const fetchActiveRide = async () => {
            try {
                const response = await getActiveRide();
                setActiveRide(response.data);
            } catch (error) {
                setActiveRide(null);
            }
        };

        fetchActiveRide();
        const interval = setInterval(fetchActiveRide, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestRide = async () => {
        if (!pickupLocation || !dropoffLocation || !pickupAddress || !dropoffAddress) {
            alert('Please enter both pickup and dropoff locations');
            return;
        }

        setLoading(true);
        try {
            const response = await createRide(
                pickupLocation,
                pickupAddress,
                dropoffLocation,
                dropoffAddress
            );
            setActiveRide(response.data);
            alert('Ride requested successfully! Looking for nearby drivers...');
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
            alert('Ride cancelled successfully');
        } catch (error) {
            console.error('Error cancelling ride:', error);
            alert(error.response?.data?.error || 'Failed to cancel ride');
        }
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold">🚗 Rapid Ride</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Compact Map Preview - Expandable */}
                {!activeRide && (
                    <div
                        onClick={() => setMapExpanded(!mapExpanded)}
                        className={`bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${mapExpanded ? 'h-96' : 'h-48'
                            }`}
                    >
                        <div className="relative h-full">
                            <Map
                                center={mapCenter}
                                userLocation={currentLocation}
                                pickupLocation={pickupLocation}
                                dropoffLocation={dropoffLocation}
                                showRoute={pickupLocation && dropoffLocation}
                            />
                            {!mapExpanded && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-4">
                                    <div className="text-white text-center">
                                        <p className="text-sm font-medium">Tap to expand map</p>
                                        <svg className="w-6 h-6 mx-auto mt-1 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Active Ride with Full Map */}
                {activeRide && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="h-64">
                            <Map
                                center={mapCenter}
                                userLocation={currentLocation}
                                pickupLocation={pickupLocation}
                                dropoffLocation={dropoffLocation}
                                driverLocation={activeRide?.driver?.location}
                                showRoute={true}
                            />
                        </div>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Ride</h2>
                            <RideCard
                                ride={activeRide}
                                onCancel={handleCancelRide}
                                onRate={handleRateRide}
                                isDriver={false}
                            />
                        </div>
                    </div>
                )}

                {/* Ride Request Card */}
                {!activeRide && (
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Where to?</h2>

                        <div className="space-y-4">
                            <LocationSearchInput
                                value={pickupAddress}
                                onChange={setPickupAddress}
                                onLocationSelect={handlePickupSelect}
                                placeholder="Search pickup location..."
                                label="📍 Pickup Location"
                            />

                            <LocationSearchInput
                                value={dropoffAddress}
                                onChange={setDropoffAddress}
                                onLocationSelect={handleDropoffSelect}
                                placeholder="Search dropoff location..."
                                label="🎯 Dropoff Location"
                            />

                            <button
                                onClick={handleRequestRide}
                                disabled={loading || !pickupAddress || !dropoffAddress}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Requesting...
                                    </span>
                                ) : '🚕 Request Ride'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {!activeRide && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                            <div className="text-3xl mb-2">⏱️</div>
                            <p className="text-sm font-semibold text-gray-800">Ride History</p>
                            <p className="text-xs text-gray-500">View past rides</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                            <div className="text-3xl mb-2">💳</div>
                            <p className="text-sm font-semibold text-gray-800">Payment</p>
                            <p className="text-xs text-gray-500">Manage payments</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Rating Modal */}
            {ratingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Rate Your Ride</h3>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">How was your experience?</p>
                            <div className="flex gap-2 justify-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="text-4xl transition-all hover:scale-110"
                                    >
                                        {star <= rating ? '⭐' : '☆'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Feedback (Optional)
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                rows="3"
                                placeholder="Tell us about your experience..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setRatingModal(null);
                                    setRating(5);
                                    setFeedback('');
                                }}
                                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRating}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserHome;
