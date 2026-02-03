import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const sendOTP = async (email, role) => {
    return await api.post('/auth/otp/send', { email, role });
};

export const verifyOTP = async (email, otp, role) => {
    return await api.post('/auth/otp/verify', { email, otp, role });
};

export const signup = async (data) => {
    return await api.post('/auth/signup', data);
};

export const login = async (data) => {
    return await api.post('/auth/login', data);
};

// Location APIs
export const updateLocation = async (latitude, longitude, heading = 0, speed = 0) => {
    return await api.post('/location/update', {
        location: { latitude, longitude },
        heading,
        speed
    });
};

export const findNearbyDrivers = async (latitude, longitude, radiusKm = 5) => {
    return await api.post('/location/nearby-drivers', {
        location: { latitude, longitude },
        radius_km: radiusKm
    });
};

export const setDriverAvailability = async (available) => {
    return await api.post('/location/availability', { available });
};

// Ride APIs
export const createRide = async (pickupLocation, pickupAddress, dropoffLocation, dropoffAddress) => {
    return await api.post('/rides', {
        pickup_location: pickupLocation,
        pickup_address: pickupAddress,
        dropoff_location: dropoffLocation,
        dropoff_address: dropoffAddress
    });
};

export const getActiveRide = async () => {
    return await api.get('/rides/active');
};

export const acceptRide = async (rideId) => {
    return await api.post(`/rides/${rideId}/accept`);
};

export const startRide = async (rideId) => {
    return await api.post(`/rides/${rideId}/start`);
};

export const completeRide = async (rideId) => {
    return await api.post(`/rides/${rideId}/complete`);
};

export const cancelRide = async (rideId) => {
    return await api.post(`/rides/${rideId}/cancel`);
};

export const rateRide = async (rideId, rating, feedback = '') => {
    return await api.post(`/rides/${rideId}/rate`, { rating, feedback });
};

export default api;
