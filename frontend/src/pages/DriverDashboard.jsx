import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverProfile, updateDriverProfile, createDriverProfile, getNearbyRides, acceptRide, setDriverAvailability } from '../api';
import { useWebSocket } from '../context/WebSocketContext';

const DriverDashboard = () => {
    const [activeTab, setActiveTab] = useState('rides');
    const [profile, setProfile] = useState({
        vehicle_type: '',
        vehicle_number: '',
        capacity: 1
    });
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [isAvailable, setIsAvailable] = useState(true);
    const [isNewProfile, setIsNewProfile] = useState(false);
    const navigate = useNavigate();

    const { sendMessage, isConnected } = useWebSocket();
    const locationWatchId = useRef(null);

    // Fetch initial data
    useEffect(() => {
        fetchProfile();
        startLocationTracking();
        return () => stopLocationTracking();
    }, [isConnected]); // Restart tracking if connection changes (optional, but good ensures socket is ready)

    // Fetch rides when tab changes or location updates
    useEffect(() => {
        if (activeTab === 'rides' && location) {
            fetchNearbyRides();
        }
    }, [activeTab, location]);

    const startLocationTracking = () => {
        if (navigator.geolocation) {
            locationWatchId.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });

                    // Send update via WebSocket
                    if (isAvailable) {
                        sendMessage('driver_location_update', {
                            location: { latitude, longitude }
                        });
                    }

                    // Also update backend API occasionally if needed, but WS should suffice for real-time
                },
                (err) => console.error("Location error:", err),
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 1000
                }
            );
        }
    };

    const stopLocationTracking = () => {
        if (locationWatchId.current !== null) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
        }
    };

    // const fetchProfile = async () => {
    //     try {
    //         const res = await getDriverProfile();
    //         setProfile(res.data);
    //         setIsNewProfile(false);
    //     } catch (err) {
    //         console.error("Failed to fetch profile");
    //     }
    // };

    const fetchProfile = async () => {
        try {
            const res = await getDriverProfile();
            setProfile(res.data);
            setIsNewProfile(false);
        } catch (err) {
            console.error("Failed to fetch profile", err);
            // If 404, it means profile needs to be created
            if (err.response && err.response.status === 404) {
                setIsNewProfile(true);
                setActiveTab('profile'); // Force user to profile tab
                setError("Please complete your vehicle profile to start receiving rides.");
            }
        }
    };

    const fetchNearbyRides = async () => {
        if (!location) return;
        setLoading(true);
        try {
            const res = await getNearbyRides(location.latitude, location.longitude, 10); // 10km radius
            setRides(res.data || []);
        } catch (err) {
            setError("Failed to fetch nearby rides");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isNewProfile) {
                await createDriverProfile(profile);
                alert("Profile created successfully!");
                setIsNewProfile(false);
            } else {
                await updateDriverProfile(profile);
                alert("Profile updated successfully!");
            }
            fetchProfile(); // Refresh to ensure everything is synced
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptRide = async (rideId) => {
        try {
            await acceptRide(rideId);
            alert("Ride accepted!");
            fetchNearbyRides(); // Refresh list
            // Optionally navigate to a "Current Ride" view
        } catch (err) {
            alert(err.response?.data?.error || "Failed to accept ride");
        }
    };

    const toggleAvailability = async () => {
        try {
            const newState = !isAvailable;
            await setDriverAvailability(newState);
            setIsAvailable(newState);
        } catch (err) {
            console.error("Failed to update availability");
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-emerald-400">Driver Dashboard</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={toggleAvailability}
                        className={`px-4 py-2 rounded-lg font-semibold ${isAvailable ? 'bg-emerald-600' : 'bg-red-600'}`}
                    >
                        {isAvailable ? 'Online' : 'Offline'}
                    </button>
                    <button onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/');
                    }} className="text-gray-400 hover:text-white">Logout</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-800">
                <button
                    className={`pb-2 px-4 ${activeTab === 'rides' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('rides')}
                >
                    Available Rides
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'profile' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-gray-400'}`}
                    onClick={() => setActiveTab('profile')}
                >
                    Profile
                </button>
            </div>

            {/* Content */}
            {activeTab === 'rides' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Nearby Requests</h2>
                        <button onClick={fetchNearbyRides} className="text-emerald-400 text-sm hover:underline">Refresh</button>
                    </div>

                    {loading ? (
                        <p className="text-gray-500">Loading rides...</p>
                    ) : rides.length === 0 ? (
                        <div className="text-center py-10 bg-gray-800 rounded-xl">
                            <p className="text-gray-400">No rides found nearby.</p>
                            <p className="text-xs text-gray-500 mt-2">Try moving to a different location.</p>
                        </div>
                    ) : (
                        rides.map(ride => (
                            <div key={ride.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-emerald-500/50 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm text-gray-400">Are you close?</p>
                                        <p className="text-lg font-bold text-white">{ride.distance_km?.toFixed(1)} km away</p>
                                    </div>
                                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                                        ₹{ride.fare}
                                    </span>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-start">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 mr-3"></div>
                                        <div>
                                            <p className="text-xs text-gray-500">PICKUP</p>
                                            <p className="text-sm">{ride.pickup_address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-red-500 mr-3"></div>
                                        <div>
                                            <p className="text-xs text-gray-500">DROPOFF</p>
                                            <p className="text-sm">{ride.dropoff_address}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAcceptRide(ride.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Accept Ride
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-6">Edit Profile</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vehicle Type</label>
                            <select
                                value={profile.vehicle_type}
                                onChange={(e) => setProfile({ ...profile, vehicle_type: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                            >
                                <option value="sedan">Sedan</option>
                                <option value="suv">SUV</option>
                                <option value="auto">Auto</option>
                                <option value="bike">Bike</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vehicle Number</label>
                            <input
                                type="text"
                                value={profile.vehicle_number}
                                onChange={(e) => setProfile({ ...profile, vehicle_number: e.target.value })}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                                placeholder="e.g. MH02 AB 1234"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Capacity</label>
                            <input
                                type="number"
                                value={profile.capacity}
                                onChange={(e) => setProfile({ ...profile, capacity: parseInt(e.target.value) })}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
                                min="1"
                                max="8"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                        >
                            {loading ? "Updating..." : "Save Changes"}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
