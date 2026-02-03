import React from 'react';

const RideCard = ({ ride, onCancel, onRate, onAccept, onStart, onComplete, isDriver = false }) => {
    const getStatusColor = (status) => {
        const colors = {
            requested: 'bg-yellow-500',
            accepted: 'bg-blue-500',
            driver_arrived: 'bg-purple-500',
            in_progress: 'bg-green-500',
            completed: 'bg-gray-500',
            cancelled: 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusText = (status) => {
        return status.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const canCancel = ['requested', 'accepted'].includes(ride.status);
    const canRate = ride.status === 'completed' && !ride.rating;

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4 border border-gray-100">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className={`${getStatusColor(ride.status)} text-white px-4 py-2 rounded-full text-sm font-semibold`}>
                    {getStatusText(ride.status)}
                </span>
                {ride.fare && (
                    <span className="text-2xl font-bold text-purple-600">
                        ₹{ride.fare.toFixed(2)}
                    </span>
                )}
            </div>

            {/* Addresses */}
            <div className="space-y-3 mb-4">
                <div className="flex items-start">
                    <span className="text-2xl mr-3">📍</span>
                    <div>
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="text-sm font-medium text-gray-800">{ride.pickup_address}</p>
                    </div>
                </div>
                <div className="flex items-start">
                    <span className="text-2xl mr-3">🎯</span>
                    <div>
                        <p className="text-xs text-gray-500">Dropoff</p>
                        <p className="text-sm font-medium text-gray-800">{ride.dropoff_address}</p>
                    </div>
                </div>
            </div>

            {/* Ride Details */}
            {(ride.distance_km || ride.duration_minutes) && (
                <div className="flex gap-4 mb-4 text-sm text-gray-600">
                    {ride.distance_km && (
                        <div className="flex items-center">
                            <span className="mr-1">🚗</span>
                            <span>{ride.distance_km.toFixed(1)} km</span>
                        </div>
                    )}
                    {ride.duration_minutes && (
                        <div className="flex items-center">
                            <span className="mr-1">⏱️</span>
                            <span>{ride.duration_minutes} min</span>
                        </div>
                    )}
                </div>
            )}

            {/* Driver Info */}
            {ride.driver && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-2">Driver</p>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-800">{ride.driver.name}</p>
                            <p className="text-sm text-gray-600">{ride.driver.vehicle_type} • {ride.driver.vehicle_number}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center">
                                <span className="text-yellow-500 mr-1">⭐</span>
                                <span className="font-semibold">{ride.driver.rating.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-gray-500">{ride.driver.phone}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
                {isDriver ? (
                    <>
                        {ride.status === 'requested' && onAccept && (
                            <button
                                onClick={() => onAccept(ride.id)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Accept Ride
                            </button>
                        )}
                        {ride.status === 'accepted' && onStart && (
                            <button
                                onClick={() => onStart(ride.id)}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Start Ride
                            </button>
                        )}
                        {ride.status === 'in_progress' && onComplete && (
                            <button
                                onClick={() => onComplete(ride.id)}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Complete Ride
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        {canCancel && onCancel && (
                            <button
                                onClick={() => onCancel(ride.id)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Cancel Ride
                            </button>
                        )}
                        {canRate && onRate && (
                            <button
                                onClick={() => onRate(ride.id)}
                                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Rate Ride
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Rating Display */}
            {ride.rating && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Your Rating</p>
                    <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < ride.rating ? 'text-yellow-500' : 'text-gray-300'}>
                                ⭐
                            </span>
                        ))}
                        {ride.feedback && (
                            <p className="ml-3 text-sm text-gray-600 italic">"{ride.feedback}"</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RideCard;
