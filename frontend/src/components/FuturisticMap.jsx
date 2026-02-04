import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Futuristic Icons
const createPulseIcon = (color) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px ${color}, 0 0 20px ${color}; position: relative;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; border: 2px solid ${color}; border-radius: 50%; opacity: 0.5; animation: pulse 2s infinite;"></div>
              </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

const FuturisticMap = ({
    center = [28.6139, 77.2090],
    zoom = 13,
    userLocation = null,
    nearbyDrivers = [],
    pickupLocation = null,
    dropoffLocation = null,
    showRoute = false,
    height = '100%',
}) => {
    const routePositions = useMemo(() => {
        if (showRoute && pickupLocation && dropoffLocation) {
            return [
                [pickupLocation.latitude, pickupLocation.longitude],
                [dropoffLocation.latitude, dropoffLocation.longitude]
            ];
        }
        return [];
    }, [showRoute, pickupLocation, dropoffLocation]);

    return (
        <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '1.5rem' }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', background: '#000' }}
                zoomControl={false}
                attributionControl={false}
            >
                {/* Dark Matter Tiles for Futuristic Look */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {/* User Location */}
                {userLocation && (
                    <>
                         <Marker position={[userLocation.latitude, userLocation.longitude]} icon={createPulseIcon('#84cc16')}>
                            <Popup className="glass-popup">You are here</Popup>
                        </Marker>
                        <Circle 
                            center={[userLocation.latitude, userLocation.longitude]}
                            radius={500}
                            pathOptions={{ color: '#84cc16', fillColor: '#84cc16', fillOpacity: 0.1, weight: 1 }}
                        />
                    </>
                   
                )}

                {/* Nearby Drivers - Simulated */}
                {nearbyDrivers.map((driver, index) => (
                    <Marker
                        key={index}
                        position={[driver.latitude, driver.longitude]}
                        icon={createPulseIcon('#10b981')} // Emerald for drivers
                    >
                         <Popup className="glass-popup">Typically arrives in 2 mins</Popup>
                    </Marker>
                ))}

                {/* Pickup & Dropoff */}
                {pickupLocation && (
                    <Marker position={[pickupLocation.latitude, pickupLocation.longitude]} icon={createPulseIcon('#eab308')}>
                        <Popup>Pickup</Popup>
                    </Marker>
                )}

                {/* Route Line */}
                {showRoute && routePositions.length > 0 && (
                    <Polyline
                        positions={routePositions}
                        pathOptions={{ color: '#84cc16', weight: 4, opacity: 0.8, dashArray: '1, 10' }} // Dashed neon line
                    />
                )}
            </MapContainer>
            
            {/* Overlay Gradient at bottom for seamless blending */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-[1000]"></div>
             <style jsx>{`
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                }
                .leaflet-popup-content-wrapper {
                    background: rgba(17, 24, 39, 0.8);
                    backdrop-filter: blur(10px);
                    color: white;
                    border: 1px solid rgba(132, 204, 22, 0.3);
                }
                .leaflet-popup-tip {
                    background: rgba(17, 24, 39, 0.8);
                }
            `}</style>
        </div>
    );
};

export default FuturisticMap;
