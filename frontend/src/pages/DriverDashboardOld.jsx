import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RideCard from '../components/RideCard';
import {
    setDriverAvailability,
    updateLocation,
    getActiveRide,
    acceptRide,
    startRide,
    completeRide
} from '../api';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [stats, setStats] = useState({
        todayEarnings: 0,
        todayRides: 0,
        totalEarnings: 0,
        rating: 5.0
    });
    const [loading, setLoading] = useState(false);

    // Get current location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, []);

    // Send location updates when online
    useEffect(() => {
        if (!isOnline || !currentLocation) return;

        const sendLocation = async () => {
            try {
                await updateLocation(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    0, // heading
                    0  // speed
                );
            } catch (error) {
                console.error('Error updating location:', error);
            }
        };

        // Send immediately
        sendLocation();

        // Then every 10 seconds
        const interval = setInterval(sendLocation, 10000);
        return () => clearInterval(interval);
    }, [isOnline, currentLocation]);

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

    // Update location from browser
    useEffect(() => {
        if (!isOnline) return;

        const watchId = navigator.geolocation?.watchPosition(
            (position) => {
                setCurrentLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => console.error('Error watching location:', error),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline]);

    const handleToggleOnline = async () => {
        setLoading(true);
        try {
            const newStatus = !isOnline;
            await setDriverAvailability(newStatus);
            setIsOnline(newStatus);

            if (newStatus) {
                alert('You are now online and available for rides!');
            } else {
                alert('You are now offline');
            }
        } catch (error) {
            console.error('Error toggling availability:', error);
            alert(error.response?.data?.error || 'Failed to update availability');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRide = async (rideId) => {
        try {
            const response = await acceptRide(rideId);
            setActiveRide(response.data);
            alert('Ride accepted! Navigate to pickup location.');
        } catch (error) {
            console.error('Error accepting ride:', error);
            alert(error.response?.data?.error || 'Failed to accept ride');
        }
    };

    const handleStartRide = async (rideId) => {
        try {
            const response = await startRide(rideId);
            setActiveRide(response.data);
            alert('Ride started! Navigate to dropoff location.');
        } catch (error) {
            console.error('Error starting ride:', error);
            alert(error.response?.data?.error || 'Failed to start ride');
        }
    };

    const handleCompleteRide = async (rideId) => {
        if (!confirm('Mark this ride as completed?')) return;

        try {
            const response = await completeRide(rideId);
            setActiveRide(null);
            // Update stats (in production, fetch from API)
            setStats(prev => ({
                ...prev,
                todayEarnings: prev.todayEarnings + (response.data.fare || 0),
                todayRides: prev.todayRides + 1,
                totalEarnings: prev.totalEarnings + (response.data.fare || 0)
            }));
            alert('Ride completed! Payment pending.');
        } catch (error) {
            console.error('Error completing ride:', error);
            alert(error.response?.data?.error || 'Failed to complete ride');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold">🚕 Driver Dashboard</h1>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Online Toggle */}
                    <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div>
                            <p className="text-sm opacity-90">Status</p>
                            <p className="text-xl font-bold">{isOnline ? '🟢 Online' : '🔴 Offline'}</p>
                        </div>
                        <button
                            onClick={handleToggleOnline}
                            disabled={loading}
                            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${isOnline
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                        >
                            {loading ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Today's Earnings</p>
                        <p className="text-3xl font-bold text-green-600">₹{stats.todayEarnings.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Today's Rides</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.todayRides}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
                        <p className="text-3xl font-bold text-purple-600">₹{stats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Rating</p>
                        <p className="text-3xl font-bold text-yellow-600 flex items-center">
                            ⭐ {stats.rating.toFixed(1)}
                        </p>
                    </div>
                </div>

                {/* Active Ride Section */}
                {activeRide ? (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Ride</h2>
                        <RideCard
                            ride={activeRide}
                            onAccept={handleAcceptRide}
                            onStart={handleStartRide}
                            onComplete={handleCompleteRide}
                            isDriver={true}
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                        {isOnline ? (
                            <>
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Looking for rides...</h3>
                                <p className="text-gray-600">
                                    You're online and available. We'll notify you when a ride request comes in.
                                </p>
                                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>Location tracking active</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-4">😴</div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">You're Offline</h3>
                                <p className="text-gray-600 mb-6">
                                    Go online to start receiving ride requests
                                </p>
                                <button
                                    onClick={handleToggleOnline}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all"
                                >
                                    Go Online Now
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Location Info */}
                {currentLocation && isOnline && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                            📍 Current Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Location updates every 10 seconds
                        </p>
                    </div>
                )}

                {/* Tips Section */}
                <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">💡 Driver Tips</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Keep your location services enabled for accurate tracking</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Accept rides quickly to maximize earnings</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Maintain a high rating by providing excellent service</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Navigate safely and follow traffic rules</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
