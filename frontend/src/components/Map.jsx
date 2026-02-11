import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Vehicle-specific icons
const createVehicleIcon = (vehicleType) => {
    const colors = {
        bike: 'orange',
        auto: 'yellow',
        sedan: 'green',
        suv: 'violet'
    };

    const color = colors[vehicleType] || 'green';

    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

// Component to recenter map
function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

const Map = ({
    center = [28.6139, 77.2090], // Default to Delhi
    zoom = 13,
    userLocation = null,
    driverLocation = null,
    pickupLocation = null,
    dropoffLocation = null,
    showRoute = false,
    height = '100%',
    vehicleType = 'sedan' // New prop for vehicle type
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

    // Create vehicle-specific icon
    const driverIcon = useMemo(() => createVehicleIcon(vehicleType), [vehicleType]);

    // Create pickup icon (lime green)
    const pickupIcon = useMemo(() => new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }), []);

    // Create dropoff icon (red)
    const dropoffIcon = useMemo(() => new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }), []);

    return (
        <div style={{ height, width: '100%' }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap center={center} />

                {/* User location marker */}
                {userLocation && (
                    <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={userIcon}
                    >
                        <Popup>Your Location</Popup>
                    </Marker>
                )}

                {/* Driver location marker with vehicle type */}
                {driverLocation && (
                    <Marker
                        position={[driverLocation.latitude, driverLocation.longitude]}
                        icon={driverIcon}
                    >
                        <Popup>
                            Driver Location
                            <br />
                            Vehicle: {vehicleType.toUpperCase()}
                        </Popup>
                    </Marker>
                )}

                {/* Pickup location marker */}
                {pickupLocation && (
                    <Marker
                        position={[pickupLocation.latitude, pickupLocation.longitude]}
                        icon={pickupIcon}
                    >
                        <Popup>Pickup Location</Popup>
                    </Marker>
                )}

                {/* Dropoff location marker */}
                {dropoffLocation && (
                    <Marker
                        position={[dropoffLocation.latitude, dropoffLocation.longitude]}
                        icon={dropoffIcon}
                    >
                        <Popup>Dropoff Location</Popup>
                    </Marker>
                )}

                {/* Route polyline with gradient effect */}
                {showRoute && routePositions.length > 0 && (
                    <Polyline
                        positions={routePositions}
                        color="#84cc16"
                        weight={4}
                        opacity={0.8}
                        dashArray="10, 10"
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default Map;
