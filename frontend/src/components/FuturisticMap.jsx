import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Custom Icons ───────────────────────────────────────────────
const createPickupIcon = () => L.divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:42px;">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#22c55e"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="#22c55e"/>
        </svg>
        <div style="position:absolute;top:50%;left:50%;width:20px;height:20px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(34,197,94,0.25);animation:pulse 2s infinite;"></div>
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
});

const createDropoffIcon = () => L.divIcon({
    className: '',
    html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#ef4444"/>
        <circle cx="16" cy="16" r="7" fill="white"/>
        <path d="M12 12l8 8M20 12l-8 8" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
});

const createUserIcon = () => L.divIcon({
    className: '',
    html: `<div style="position:relative;">
        <div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.6);"></div>
        <div style="position:absolute;top:50%;left:50%;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;border:2px solid rgba(59,130,246,0.4);animation:pulse 2s infinite;"></div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// Vehicle-specific icons
const vehicleIcons = {
    bike: (color = '#10b981') => `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="16">🏍️</text>
        </svg>`,
    auto: (color = '#f59e0b') => `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="16">🛺</text>
        </svg>`,
    sedan: (color = '#3b82f6') => `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="16">🚗</text>
        </svg>`,
    suv: (color = '#8b5cf6') => `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="16">🚙</text>
        </svg>`,
    car: (color = '#3b82f6') => `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="16">🚗</text>
        </svg>`,
};

const createVehicleIcon = (type = 'car') => {
    const svgFn = vehicleIcons[type] || vehicleIcons['car'];
    return L.divIcon({
        className: '',
        html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">${svgFn()}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
};

const createWaypointIcon = () => L.divIcon({
    className: '',
    html: `<div style="width:8px;height:8px;border-radius:50%;background:#84cc16;border:2px solid white;box-shadow:0 0 6px rgba(132,204,22,0.5);"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
});

// ─── Map Controller ─────────────────────────────────────────────
const MapController = ({ onCenterChange, onMapReady, fitBounds }) => {
    const map = useMap();

    useEffect(() => {
        if (onMapReady) onMapReady(map);
    }, [map, onMapReady]);

    useEffect(() => {
        if (fitBounds && fitBounds.length >= 2) {
            try {
                const bounds = L.latLngBounds(fitBounds);
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true, duration: 0.8 });
                }
            } catch (e) { /* ignore invalid bounds */ }
        }
    }, [fitBounds, map]);

    useMapEvents({
        moveend: () => {
            if (onCenterChange) {
                const center = map.getCenter();
                onCenterChange({ latitude: center.lat, longitude: center.lng });
            }
        },
    });
    return null;
};

// ─── Main Map Component ─────────────────────────────────────────
const FuturisticMap = ({
    center = [28.6139, 77.2090],
    zoom = 15,
    userLocation = null,
    nearbyDrivers = [],
    pickupLocation = null,
    dropoffLocation = null,
    routeCoordinates = null,       // [lat, lng][] from OSRM for pickup→destination
    driverRouteCoordinates = null,  // [lat, lng][] from OSRM for driver→pickup
    routeWaypoints = [],            // intermediate waypoint markers
    onCenterChange = null,
    isSelecting = false,
    height = '100%',
    showGradientOverlay = true,
    driverLocation = null,         // single driver location for tracking
}) => {
    const [mapInstance, setMapInstance] = useState(null);
    const hasInitialFly = React.useRef(false);

    // Auto-fly to center once (when GPS resolves)
    useEffect(() => {
        if (mapInstance && !hasInitialFly.current && center && center[0] !== 28.6139) {
            hasInitialFly.current = true;
            mapInstance.flyTo(center, zoom, { animate: true, duration: 0.8 });
        }
    }, [center, mapInstance, zoom]);

    // Auto-center on pickup
    useEffect(() => {
        if (mapInstance && pickupLocation && !isSelecting && !routeCoordinates) {
            mapInstance.flyTo([pickupLocation.latitude, pickupLocation.longitude], mapInstance.getZoom(), { animate: true, duration: 0.5 });
        }
    }, [pickupLocation, mapInstance, isSelecting, routeCoordinates]);

    // Calculate bounds for auto-fit
    const fitBounds = useMemo(() => {
        const points = [];
        if (routeCoordinates && routeCoordinates.length > 0) {
            points.push(routeCoordinates[0], routeCoordinates[routeCoordinates.length - 1]);
        }
        if (driverRouteCoordinates && driverRouteCoordinates.length > 0) {
            points.push(driverRouteCoordinates[0], driverRouteCoordinates[driverRouteCoordinates.length - 1]);
        }
        if (driverLocation) {
            points.push([driverLocation.latitude, driverLocation.longitude]);
        }
        if (pickupLocation) {
            points.push([pickupLocation.latitude, pickupLocation.longitude]);
        }
        if (dropoffLocation && routeCoordinates) {
            points.push([dropoffLocation.latitude, dropoffLocation.longitude]);
        }
        return points.length >= 2 ? points : null;
    }, [routeCoordinates, driverRouteCoordinates, pickupLocation, dropoffLocation, driverLocation]);

    // Fallback route (straight line) if no OSRM route
    const fallbackRoute = useMemo(() => {
        if (!routeCoordinates && pickupLocation && dropoffLocation) {
            return [
                [pickupLocation.latitude, pickupLocation.longitude],
                [dropoffLocation.latitude, dropoffLocation.longitude]
            ];
        }
        return null;
    }, [routeCoordinates, pickupLocation, dropoffLocation]);

    return (
        <div style={{ height, width: '100%', position: 'relative', overflow: 'hidden' }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
                zoomControl={false}
                attributionControl={false}
            >
                <MapController
                    onCenterChange={onCenterChange}
                    onMapReady={setMapInstance}
                    fitBounds={fitBounds}
                />

                {/* Dark tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                />

                {/* User location pulse */}
                {userLocation && (
                    <>
                        <Marker position={[userLocation.latitude, userLocation.longitude]} icon={createUserIcon()} />
                        <Circle
                            center={[userLocation.latitude, userLocation.longitude]}
                            radius={300}
                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.04, weight: 1, dashArray: '5,10' }}
                        />
                    </>
                )}

                {/* Nearby Drivers with vehicle-type icons */}
                {nearbyDrivers.map((driver, index) => (
                    <Marker
                        key={driver.id || index}
                        position={[driver.latitude, driver.longitude]}
                        icon={createVehicleIcon(driver.vehicleType || 'car')}
                    >
                        <Popup>{driver.vehicleType || 'Driver'} • {driver.id ? `#${driver.id.slice(0, 6)}` : 'Nearby'}</Popup>
                    </Marker>
                ))}

                {/* Pickup Marker */}
                {!isSelecting && pickupLocation && (
                    <Marker position={[pickupLocation.latitude, pickupLocation.longitude]} icon={createPickupIcon()}>
                        <Popup><b>📍 Pickup</b></Popup>
                    </Marker>
                )}

                {/* Dropoff Marker */}
                {dropoffLocation && (
                    <Marker position={[dropoffLocation.latitude, dropoffLocation.longitude]} icon={createDropoffIcon()}>
                        <Popup><b>🎯 Destination</b></Popup>
                    </Marker>
                )}

                {/* Driver Location (tracking) */}
                {driverLocation && (
                    <Marker
                        position={[driverLocation.latitude, driverLocation.longitude]}
                        icon={createVehicleIcon(driverLocation.vehicleType || 'car')}
                    >
                        <Popup><b>Your Driver</b></Popup>
                    </Marker>
                )}

                {/* Main Route (pickup → destination) */}
                {routeCoordinates && routeCoordinates.length > 0 && (
                    <Polyline
                        positions={routeCoordinates}
                        pathOptions={{
                            color: '#84cc16',
                            weight: 5,
                            opacity: 0.9,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                )}

                {/* Fallback straight line if no OSRM route */}
                {fallbackRoute && !routeCoordinates && (
                    <Polyline
                        positions={fallbackRoute}
                        pathOptions={{ color: '#84cc16', weight: 4, opacity: 0.6, dashArray: '10,10' }}
                    />
                )}

                {/* Driver → Pickup Route (dashed) */}
                {driverRouteCoordinates && driverRouteCoordinates.length > 0 && (
                    <Polyline
                        positions={driverRouteCoordinates}
                        pathOptions={{
                            color: '#3b82f6',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '12,8',
                            lineCap: 'round',
                        }}
                    />
                )}

                {/* Route Waypoints (small dots along path) */}
                {routeWaypoints.map((wp, i) => (
                    <Marker key={`wp-${i}`} position={wp} icon={createWaypointIcon()} />
                ))}
            </MapContainer>

            {/* Selection mode pin */}
            {isSelecting && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                    <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg mb-1 whitespace-nowrap border border-gray-700 font-medium">
                        Set Pickup Here
                    </div>
                    <div className="w-0.5 h-8 bg-gradient-to-t from-lime-500 to-transparent"></div>
                    <div className="w-4 h-4 rounded-full bg-lime-500 border-2 border-white shadow-[0_0_15px_rgba(132,204,22,0.8)] -mt-1"></div>
                    <div className="absolute bottom-0 w-12 h-12 bg-lime-500/20 rounded-full blur-xl transform translate-y-1/2"></div>
                </div>
            )}

            {/* Bottom gradient overlay */}
            {showGradientOverlay && (
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent pointer-events-none z-[400]"></div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
                    50% { opacity: 0.4; }
                    100% { transform: translate(-50%,-50%) scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default FuturisticMap;
