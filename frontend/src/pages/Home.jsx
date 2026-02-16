import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FuturisticMap from '../components/FuturisticMap';
import { findNearbyDrivers } from '../api';

const Home = () => {
    const navigate = useNavigate();
    const [nearbyDrivers, setNearbyDrivers] = useState([]);
    const [location, setLocation] = useState({ latitude: 28.6139, longitude: 77.2090 });

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => { /* use default */ }
            );
        }
    }, []);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const res = await findNearbyDrivers(location.latitude, location.longitude);
                if (res.data?.drivers) {
                    setNearbyDrivers(
                        res.data.drivers
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
        fetchDrivers();
        const iv = setInterval(fetchDrivers, 15000);
        return () => clearInterval(iv);
    }, [location]);

    return (
        <div className="h-screen w-full bg-[#0a0a0a] relative overflow-hidden">
            {/* Background Map */}
            <div className="absolute inset-0 z-0 opacity-70">
                <FuturisticMap
                    center={[location.latitude, location.longitude]}
                    nearbyDrivers={nearbyDrivers}
                    zoom={14}
                    showGradientOverlay={false}
                />
            </div>

            {/* Overlay gradient */}
            <div className="absolute inset-0 z-10 bg-linear-to-b from-black/70 via-transparent to-black/90"></div>

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-between p-6">
                {/* Header */}
                <div className="pt-8 animate-fade-in-down">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-linear-to-br from-lime-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-lime-500/30">
                            <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">RAPID RIDE</h1>
                            <p className="text-gray-400 text-sm tracking-wide">Go anywhere, anytime</p>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2">
                    <div className="flex justify-center space-x-6 animate-fade-in">
                        <div className="glass rounded-2xl px-5 py-4 text-center">
                            <p className="text-2xl font-bold text-lime-400">{nearbyDrivers.length}+</p>
                            <p className="text-xs text-gray-400 mt-1">Drivers nearby</p>
                        </div>
                        <div className="glass rounded-2xl px-5 py-4 text-center">
                            <p className="text-2xl font-bold text-blue-400">2 min</p>
                            <p className="text-xs text-gray-400 mt-1">Avg. pickup</p>
                        </div>
                        <div className="glass rounded-2xl px-5 py-4 text-center">
                            <p className="text-2xl font-bold text-purple-400">4.9⭐</p>
                            <p className="text-xs text-gray-400 mt-1">Average rating</p>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="pb-6 animate-fade-in-up">
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/user/login')}
                            className="w-full bg-lime-500 text-black font-bold py-4 rounded-2xl text-lg hover:bg-lime-400 transition-all active:scale-[0.98] shadow-lg shadow-lime-500/20"
                        >
                            Get Started
                        </button>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => navigate('/user/login')}
                                className="flex-1 glass py-3 rounded-2xl text-center font-medium text-gray-300 hover:bg-white/10 transition-all"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/driver/login')}
                                className="flex-1 glass py-3 rounded-2xl text-center font-medium text-lime-400 hover:bg-lime-500/10 transition-all"
                            >
                                Drive with us →
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-gray-600 text-xs mt-4">
                        By continuing, you agree to our Terms & Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Home;