import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map';
import RideCard from '../components/RideCard';
import OTPVerification from '../components/OTPVerification';
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
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [stats, setStats] = useState({
        todayEarnings: 2450,
        todayRides: 8,
        totalEarnings: 45670,
        rating: 4.8,
        completedRides: 342
    });
    const [loading, setLoading] = useState(false);
    const [driverName, setDriverName] = useState('Driver');

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
                    const defaultLocation = { latitude: 28.6139, longitude: 77.2090 };
                    setCurrentLocation(defaultLocation);
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
                    0,
                    0
                );
            } catch (error) {
                console.error('Error updating location:', error);
            }
        };

        sendLocation();
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
        } catch (error) {
            console.error('Error accepting ride:', error);
            alert(error.response?.data?.error || 'Failed to accept ride');
        }
    };

    const handleStartRideClick = () => {
        setShowOTPModal(true);
    };

    const handleOTPVerify = async (otp) => {
        try {
            // In production, verify OTP with backend
            const response = await startRide(activeRide.id, otp);
            setActiveRide(response.data);
            setShowOTPModal(false);
            alert('Ride started! Navigate to dropoff location.');
        } catch (error) {
            console.error('Error starting ride:', error);
            alert(error.response?.data?.error || 'Invalid OTP or failed to start ride');
        }
    };

    const handleCompleteRide = async (rideId) => {
        if (!confirm('Mark this ride as completed?')) return;

        try {
            const response = await completeRide(rideId);
            const fare = response.data.fare || 150;
            setActiveRide(null);
            setStats(prev => ({
                ...prev,
                todayEarnings: prev.todayEarnings + fare,
                todayRides: prev.todayRides + 1,
                totalEarnings: prev.totalEarnings + fare,
                completedRides: prev.completedRides + 1
            }));
            alert(`Ride completed! You earned ₹${fare}`);
        } catch (error) {
            console.error('Error completing ride:', error);
            alert(error.response?.data?.error || 'Failed to complete ride');
        }
    };

    const mapCenter = currentLocation
        ? [currentLocation.latitude, currentLocation.longitude]
        : [28.6139, 77.2090];

    const getVehicleIcon = (vehicleType) => {
        const icons = {
            bike: '🏍️',
            auto: '🛺',
            sedan: '🚗',
            suv: '🚙'
        };
        return icons[vehicleType] || '🚗';
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"></div>

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            {/* Header */}
            <div className="relative z-10">
                <div className="bg-gradient-to-r from-gray-900/80 to-black/80 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            {/* Driver Profile */}
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center text-xl font-bold text-black shadow-lg shadow-emerald-500/50 border-2 border-emerald-400">
                                    {driverName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">{driverName}</h2>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-yellow-400 text-sm">⭐ {stats.rating}</span>
                                        <span className="text-gray-500 text-xs">•</span>
                                        <span className="text-gray-400 text-xs">{stats.completedRides} rides</span>
                                    </div>
                                </div>
                            </div>

                            {/* Logo */}
                            <div className="absolute left-1/2 transform -translate-x-1/2">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent">
                                    ⚡ DRIVER
                                </h1>
                            </div>

                            {/* Logout */}
                            <button
                                onClick={() => navigate('/')}
                                className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white px-4 py-2 rounded-xl transition-all"
                            >
                                Logout
                            </button>
                        </div>

                        {/* Online Status Toggle */}
                        <div className="relative">
                            <div className={`absolute inset-0 ${isOnline ? 'bg-emerald-500/20' : 'bg-gray-500/20'} rounded-2xl blur-xl`}></div>
                            <div className={`relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border ${isOnline ? 'border-emerald-500/50' : 'border-gray-700/50'} transition-all`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'} shadow-lg ${isOnline ? 'shadow-emerald-500/50' : ''}`}></div>
                                        <div>
                                            <p className="text-xs text-gray-400">Status</p>
                                            <p className="text-lg font-bold text-white">
                                                {isOnline ? 'Online - Ready for rides' : 'Offline'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleToggleOnline}
                                        disabled={loading}
                                        className={`px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 disabled:scale-100 shadow-lg ${isOnline
                                                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                                                : 'bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-black'
                                            } disabled:opacity-50`}
                                    >
                                        {loading ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Today's Earnings */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800/50 hover:border-emerald-500/50 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Today</span>
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">₹{stats.todayEarnings}</div>
                                <div className="text-xs text-gray-500">{stats.todayRides} rides</div>
                            </div>
                        </div>

                        {/* Total Earnings */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800/50 hover:border-blue-500/50 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Total</span>
                                    <span className="text-2xl">💎</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-400">₹{stats.totalEarnings}</div>
                                <div className="text-xs text-gray-500">All time</div>
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800/50 hover:border-yellow-500/50 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Rating</span>
                                    <span className="text-2xl">⭐</span>
                                </div>
                                <div className="text-2xl font-bold text-yellow-400">{stats.rating}</div>
                                <div className="text-xs text-gray-500">Excellent</div>
                            </div>
                        </div>

                        {/* Completed Rides */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                            <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800/50 hover:border-pink-500/50 transition-all">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-400 text-sm">Rides</span>
                                    <span className="text-2xl">🚗</span>
                                </div>
                                <div className="text-2xl font-bold text-pink-400">{stats.completedRides}</div>
                                <div className="text-xs text-gray-500">Completed</div>
                            </div>
                        </div>
                    </div>

                    {/* Map and Ride Info */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Map - Takes 2 columns */}
                        <div className="lg:col-span-2">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 rounded-3xl blur-2xl"></div>
                                <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl">
                                    <div className="h-[500px]">
                                        <Map
                                            center={mapCenter}
                                            userLocation={currentLocation}
                                            pickupLocation={activeRide?.pickup_location}
                                            dropoffLocation={activeRide?.dropoff_location}
                                            driverLocation={currentLocation}
                                            showRoute={!!activeRide}
                                            vehicleType={activeRide?.vehicle_type || 'sedan'}
                                        />
                                    </div>

                                    {/* Map Overlay - Current Location */}
                                    {currentLocation && !activeRide && (
                                        <div className="absolute top-4 left-4 right-4">
                                            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/30">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                                        <span className="text-xl">📍</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400">Your Location</p>
                                                        <p className="text-sm text-white font-semibold">
                                                            {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                                                        </p>
                                                    </div>
                                                    {isOnline && (
                                                        <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                                                            <span className="text-xs text-emerald-400 font-semibold">Active</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ride Info / Waiting State */}
                        <div className="lg:col-span-1">
                            {activeRide ? (
                                <div className="relative h-full">
                                    <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
                                    <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50 h-full">
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                            <span className="mr-2">{getVehicleIcon(activeRide.vehicle_type)}</span>
                                            Active Ride
                                        </h3>

                                        <div className="space-y-4">
                                            {/* Ride Status */}
                                            <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">Status</span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${activeRide.status === 'requested' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                            activeRide.status === 'accepted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                                activeRide.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                        }`}>
                                                        {activeRide.status === 'requested' && '🔔 New Request'}
                                                        {activeRide.status === 'accepted' && '✓ Accepted'}
                                                        {activeRide.status === 'in_progress' && '🚗 In Progress'}
                                                        {activeRide.status === 'completed' && '✓ Completed'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Pickup Location */}
                                            <div className="space-y-2">
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                                        <span className="text-emerald-400">📍</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 mb-1">Pickup</p>
                                                        <p className="text-sm text-white font-medium">{activeRide.pickup_address}</p>
                                                    </div>
                                                </div>

                                                <div className="pl-4">
                                                    <div className="w-px h-6 bg-gradient-to-b from-emerald-500 to-purple-500 ml-3"></div>
                                                </div>

                                                <div className="flex items-start space-x-3">
                                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                                        <span className="text-purple-400">🎯</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 mb-1">Dropoff</p>
                                                        <p className="text-sm text-white font-medium">{activeRide.dropoff_address}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fare */}
                                            <div className="bg-gradient-to-r from-emerald-500/10 to-lime-500/10 rounded-xl p-4 border border-emerald-500/30">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400">Estimated Fare</span>
                                                    <span className="text-2xl font-bold text-emerald-400">₹{activeRide.fare || 150}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="space-y-3">
                                                {activeRide.status === 'requested' && (
                                                    <button
                                                        onClick={() => handleAcceptRide(activeRide.id)}
                                                        className="w-full bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
                                                    >
                                                        Accept Ride
                                                    </button>
                                                )}

                                                {activeRide.status === 'accepted' && (
                                                    <button
                                                        onClick={handleStartRideClick}
                                                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                                                    >
                                                        🔐 Enter OTP to Start
                                                    </button>
                                                )}

                                                {activeRide.status === 'in_progress' && (
                                                    <button
                                                        onClick={() => handleCompleteRide(activeRide.id)}
                                                        className="w-full bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-emerald-500/50"
                                                    >
                                                        ✓ Complete Ride
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative h-full">
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-900/20 rounded-3xl blur-xl"></div>
                                    <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-800/50 h-full flex flex-col items-center justify-center text-center">
                                        {isOnline ? (
                                            <>
                                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-lime-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-emerald-500/50 animate-pulse">
                                                    🔍
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">Looking for rides...</h3>
                                                <p className="text-gray-400 mb-6">Stay nearby, we'll notify you when a ride is available</p>
                                                <div className="flex space-x-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-5xl mb-6">
                                                    🚗
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">You're Offline</h3>
                                                <p className="text-gray-400 mb-6">Go online to start receiving ride requests</p>
                                                <button
                                                    onClick={handleToggleOnline}
                                                    className="bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-black font-bold px-8 py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                                                >
                                                    Go Online
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-4">
                        <button className="bg-gray-900/80 backdrop-blur-xl hover:bg-gray-800/80 border border-gray-800/50 rounded-2xl p-4 transition-all transform hover:scale-105 group">
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                            <p className="text-sm font-semibold text-white">Analytics</p>
                            <p className="text-xs text-gray-500">View stats</p>
                        </button>
                        <button className="bg-gray-900/80 backdrop-blur-xl hover:bg-gray-800/80 border border-gray-800/50 rounded-2xl p-4 transition-all transform hover:scale-105 group">
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💳</div>
                            <p className="text-sm font-semibold text-white">Earnings</p>
                            <p className="text-xs text-gray-500">Withdraw</p>
                        </button>
                        <button className="bg-gray-900/80 backdrop-blur-xl hover:bg-gray-800/80 border border-gray-800/50 rounded-2xl p-4 transition-all transform hover:scale-105 group">
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
                            <p className="text-sm font-semibold text-white">Settings</p>
                            <p className="text-xs text-gray-500">Preferences</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* OTP Modal */}
            {showOTPModal && (
                <OTPVerification
                    onVerify={handleOTPVerify}
                    onCancel={() => setShowOTPModal(false)}
                    isDriver={true}
                />
            )}
        </div>
    );
};

export default DriverDashboard;
