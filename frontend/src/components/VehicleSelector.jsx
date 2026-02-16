import React from 'react';

const vehicleTypes = [
    {
        id: 'bike',
        name: 'Bike',
        icon: '🏍️',
        capacity: 1,
        basePrice: 25,
        pricePerKm: 7,
        eta: '3-5',
        desc: 'Quick & affordable',
        color: 'emerald',
        recommended: false,
    },
    {
        id: 'auto',
        name: 'Auto',
        icon: '🛺',
        capacity: 3,
        basePrice: 30,
        pricePerKm: 10,
        eta: '4-6',
        desc: 'Convenient for short trips',
        color: 'amber',
        recommended: false,
    },
    {
        id: 'sedan',
        name: 'Sedan',
        icon: '🚗',
        capacity: 4,
        basePrice: 50,
        pricePerKm: 14,
        eta: '5-8',
        desc: 'Comfortable & spacious',
        color: 'blue',
        recommended: true,
    },
    {
        id: 'suv',
        name: 'SUV',
        icon: '🚙',
        capacity: 6,
        basePrice: 80,
        pricePerKm: 18,
        eta: '6-10',
        desc: 'Premium ride for groups',
        color: 'purple',
        recommended: false,
    },
];

const colorClasses = {
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500',
        text: 'text-emerald-400',
        shadow: 'shadow-emerald-500/20',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500',
        text: 'text-amber-400',
        shadow: 'shadow-amber-500/20',
    },
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500',
        text: 'text-blue-400',
        shadow: 'shadow-blue-500/20',
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500',
        text: 'text-purple-400',
        shadow: 'shadow-purple-500/20',
    },
};

const VehicleSelector = ({ onSelect, selectedVehicle, distance = 0 }) => {
    return (
        <div className="space-y-2">
            {vehicleTypes.map((vehicle, index) => {
                const total = Math.round(vehicle.basePrice + vehicle.pricePerKm * distance);
                const isSelected = selectedVehicle?.id === vehicle.id;
                const colors = colorClasses[vehicle.color];

                return (
                    <button
                        key={vehicle.id}
                        onClick={() => onSelect(vehicle)}
                        className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-200 animate-fade-in-up relative
                            ${isSelected
                                ? `${colors.bg} border-2 ${colors.border} shadow-lg ${colors.shadow}`
                                : 'bg-white/5 border-2 border-transparent hover:bg-white/8 hover:border-gray-700'
                            }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        {/* Recommended badge */}
                        {vehicle.recommended && (
                            <div className="absolute -top-2 right-3 bg-lime-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Popular
                            </div>
                        )}

                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl ${isSelected ? colors.bg : 'bg-white/5'} flex items-center justify-center text-2xl mr-3 flex-shrink-0`}>
                            {vehicle.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between">
                                <p className={`font-bold ${isSelected ? colors.text : 'text-white'}`}>{vehicle.name}</p>
                                <p className={`font-bold text-lg ${isSelected ? colors.text : 'text-white'}`}>₹{total}</p>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                                <p className="text-xs text-gray-500">{vehicle.desc}</p>
                                <p className="text-xs text-gray-500">{vehicle.eta} min</p>
                            </div>
                            <div className="flex items-center mt-1 text-[10px] text-gray-500 space-x-3">
                                <span>👤 {vehicle.capacity}</span>
                            </div>
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                            <div className={`ml-2 w-6 h-6 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center flex-shrink-0`}>
                                <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                </svg>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default VehicleSelector;
