import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FuturisticMap from '../components/FuturisticMap'

const Home = () => {
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState(null);
    const [nearbyDrivers, setNearbyDrivers] = useState([]);

    useEffect(() => {
        // Get user location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });

                    // Simulate nearby drivers based on user location
                    const steps = [
                        { lat_offset: 0.002, lng_offset: 0.003 },
                        { lat_offset: -0.002, lng_offset: 0.004 },
                        { lat_offset: 0.001, lng_offset: -0.003 },
                    ];
                    setNearbyDrivers(steps.map(s => ({
                        latitude: latitude + s.lat_offset,
                        longitude: longitude + s.lng_offset
                    })));
                },
                () => {
                    // Default location (Delhi) if permission denied
                    setUserLocation({ latitude: 28.6139, longitude: 77.2090 });
                }
            );
        }
    }, []);

    return (
        <div className='h-screen w-full bg-black relative overflow-hidden flex flex-col'>
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <FuturisticMap
                    center={userLocation ? [userLocation.latitude, userLocation.longitude] : [28.6139, 77.2090]}
                    userLocation={userLocation}
                    nearbyDrivers={nearbyDrivers}
                    zoom={15}
                />
            </div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10"></div>

            {/* Header Content */}
            <div className="relative z-20 px-6 pt-6 flex justify-between items-center">
                <div className='flex items-center space-x-2'>
                    <div className='w-10 h-10 bg-gradient-to-br from-lime-400 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20'>
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-xl tracking-wider">RAPID RIDE</span>
                </div>
                <Link to="/user/login" className="px-5 py-2 glass rounded-full text-white text-sm font-medium hover:bg-white/10 transition-all border border-white/10">
                    Sign In
                </Link>
            </div>

            {/* Bottom Panel */}
            <div className="relative z-20 mt-auto px-6 pb-10 w-full max-w-md mx-auto sm:max-w-xl lg:max-w-4xl">
                <div className="mb-6 space-y-2 text-center lg:text-left">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                        Your ride is <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500">
                            just a tap away.
                        </span>
                    </h1>
                    <p className="text-gray-400">Fast, secure, and futuristic travel.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <button
                        onClick={() => navigate('/user/login')}
                        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-500 p-4 transition-all hover:scale-[1.02] shadow-xl shadow-lime-500/20">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-xs font-bold text-black opacity-60 uppercase tracking-widest">Get Started</p>
                                <p className="text-lg font-bold text-black">Find a Ride</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                        </div>
                    </button>


                    <button
                        onClick={() => navigate('/driver/signup')}
                        className="group relative w-full overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-4 transition-all hover:scale-[1.02] hover:border-lime-500/50">
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Partner</p>
                                <p className="text-lg font-bold text-white">Become a Driver</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            <style jsx>{`
                .glass {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                }
            `}</style>
        </div>
    )
}

export default Home