/**
 * OSRM Route Service
 * Fetches real road-following routes from the public OSRM API (no key needed).
 */

import api from '../api';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'; // Fallback or unused now

/**
 * Decode an encoded polyline string (Google polyline algorithm) into [lat, lng] pairs.
 */
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        points.push([lat / 1e5, lng / 1e5]);
    }

    return points;
}

/**
 * Fetch a route between two points.
 * @param {{ latitude: number, longitude: number }} from
 * @param {{ latitude: number, longitude: number }} to
 * @returns {Promise<{ coordinates: [number, number][], distanceKm: number, durationMin: number } | null>}
 */
export async function getRoute(from, to) {
    try {
        // Use backend proxy
        const response = await api.get('/maps/route', {
            params: {
                start_lat: from.latitude,
                start_lon: from.longitude,
                end_lat: to.latitude,
                end_lon: to.longitude
            }
        });

        const data = response.data;

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.warn('OSRM route fetch failed:', data);
            return null;
        }

        const route = data.routes[0];
        const coordinates = decodePolyline(route.geometry);
        const distanceKm = route.distance / 1000;
        const durationMin = Math.round(route.duration / 60);

        return { coordinates, distanceKm, durationMin };
    } catch (error) {
        console.error('Error fetching route:', error);
        // Fallback: return straight line
        return {
            coordinates: [
                [from.latitude, from.longitude],
                [to.latitude, to.longitude]
            ],
            distanceKm: haversineDistance(from, to),
            durationMin: Math.round(haversineDistance(from, to) * 3) // rough estimate
        };
    }
}

/**
 * Fetch route from driver location to pickup.
 */
export async function getDriverToPickupRoute(driverLocation, pickupLocation) {
    return getRoute(driverLocation, pickupLocation);
}

/**
 * Basic haversine distance calculation (fallback).
 */
function haversineDistance(loc1, loc2) {
    const R = 6371;
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Generate waypoint markers along a route at regular intervals.
 * Returns array of [lat, lng] positions for intermediate markers.
 */
export function getRouteWaypoints(coordinates, count = 5) {
    if (!coordinates || coordinates.length < 3) return [];
    const step = Math.floor(coordinates.length / (count + 1));
    const waypoints = [];
    for (let i = 1; i <= count; i++) {
        const idx = i * step;
        if (idx < coordinates.length - 1) {
            waypoints.push(coordinates[idx]);
        }
    }
    return waypoints;
}

export { decodePolyline, haversineDistance };
