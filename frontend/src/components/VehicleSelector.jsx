import React, { useState } from 'react';

const VehicleSelector = ({ onSelect, selectedVehicle, distance = 5 }) => {
    const vehicles = [
        {
            id: 'bike',
            name: 'Bike',
            icon: '🏍️',
            description: 'Affordable rides',
            capacity: '1 person',
            basePrice: 30,
            pricePerKm: 8,
            eta: '2-3 min',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            id: 'auto',
            name: '3 Wheeler',
            icon: '🛺',
            description: 'Budget friendly',
            capacity: '3 people',
            basePrice: 50,
            pricePerKm: 12,
            eta: '3-5 min',
            color: 'from-green-500 to-emerald-500'
        },
        {
            id: 'sedan',
            name: 'Sedan',
            icon: '🚗',
            description: 'Comfortable rides',
            capacity: '4 people',
            basePrice: 80,
            pricePerKm: 15,
            eta: '4-6 min',
            color: 'from-blue-500 to-purple-500'
        },
        {
            id: 'suv',
            name: 'SUV',
            icon: '🚙',
            description: 'Premium comfort',
            capacity: '6 people',
            basePrice: 120,
            pricePerKm: 20,
            eta: '5-7 min',
            color: 'from-purple-500 to-pink-500'
        }
    ];

    const calculatePrice = (vehicle) => {
        return vehicle.basePrice + (vehicle.pricePerKm * distance);
    };

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-4">Select Vehicle Type</h3>
            {vehicles.map((vehicle) => {
                const price = calculatePrice(vehicle);
                const isSelected = selectedVehicle?.id === vehicle.id;

                return (
                    <div
                        key={vehicle.id}
                        onClick={() => onSelect(vehicle)}
                        className={`relative overflow-hidden cursor-pointer transition-all duration-300 transform ${isSelected
                                ? 'scale-105 shadow-2xl shadow-lime-500/50'
                                : 'hover:scale-102 hover:shadow-xl'
                            }`}
                    >
                        <div className={`bg-gradient-to-r ${vehicle.color} p-[2px] rounded-2xl ${isSelected ? 'animate-pulse' : ''
                            }`}>
                            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        {/* Vehicle Icon */}
                                        <div className="text-5xl transform transition-transform hover:scale-110">
                                            {vehicle.icon}
                                        </div>

                                        {/* Vehicle Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="text-xl font-bold text-white">{vehicle.name}</h4>
                                                {isSelected && (
                                                    <span className="text-lime-400 text-xl">✓</span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-sm">{vehicle.description}</p>
                                            <div className="flex items-center space-x-4 mt-2">
                                                <span className="text-gray-500 text-xs flex items-center">
                                                    <span className="mr-1">👤</span> {vehicle.capacity}
                                                </span>
                                                <span className="text-gray-500 text-xs flex items-center">
                                                    <span className="mr-1">⏱️</span> {vehicle.eta}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-lime-400">
                                            ₹{price.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {distance.toFixed(1)} km
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="mt-3 pt-3 border-t border-gray-800">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Selected</span>
                                            <span className="text-lime-400 font-semibold animate-pulse">
                                                Ready to book →
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VehicleSelector;
