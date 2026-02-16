import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear invalid token
            localStorage.removeItem('token');
            // Redirect to appropriate login page based on current path
            const currentPath = window.location.pathname;
            const loginPaths = ['/user/login', '/user/signup', '/driver/login', '/driver/signup', '/captain-login'];

            if (!loginPaths.includes(currentPath)) {
                // Determine if user or driver based on path
                if (currentPath.startsWith('/driver/') || currentPath.startsWith('/captain')) {
                    window.location.href = '/driver/login';
                } else {
                    window.location.href = '/user/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export const sendOTP = async (email, role) => {
    return await api.post('/auth/otp/send', { email, role });
};

export const verifyOTP = async (email, otp, role) => {
    return await api.post('/auth/otp/verify', { email, otp, role });
};

export const getUserProfile = async () => {
    return await api.get('/auth/me');
}

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


export const findNearbyDrivers = async (latitude, longitude, radiusKm = 10) => {
    return await api.post('/location/nearby-drivers', {
        location: { latitude, longitude },
        radius_km: radiusKm
    });
};

export const getDriverProfile = async () => {
    return await api.get('/drivers/profile');
};

export const createDriverProfile = async (data) => {
    return await api.post('/drivers/profile', data);
};

export const updateDriverProfile = async (data) => {
    return await api.put('/drivers/profile', data);
};

export const getNearbyRides = async (latitude, longitude, radius = 5) => {
    return await api.get('/drivers/rides/nearby', {
        params: { latitude, longitude, radius }
    });
};

export const setDriverAvailability = async (available) => {
    return await api.post('/location/availability', { available });
};

// Map APIs
export const searchLocation = async (query) => {
    return await api.get('/maps/search', {
        params: { q: query }
    });
};

export const reverseGeocode = async (latitude, longitude) => {
    return await api.get('/maps/reverse', {
        params: { lat: latitude, lon: longitude }
    });
};

// Ride APIs
export const createRide = async (pickupLocation, pickupAddress, dropoffLocation, dropoffAddress, vehicleType = 'sedan', paymentMethod = 'cash') => {
    return await api.post('/rides', {
        pickup_location: pickupLocation,
        pickup_address: pickupAddress,
        dropoff_location: dropoffLocation,
        dropoff_address: dropoffAddress,
        vehicle_type: vehicleType,
        payment_method: paymentMethod
    });
};


export const getActiveRide = async () => {
    return await api.get('/rides/active');
};

export const acceptRide = async (rideId) => {
    return await api.post(`/rides/${rideId}/accept`);
};

export const startRide = async (rideId, otp) => {
    return await api.post(`/rides/${rideId}/start`, { otp });
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

// Payment APIs
export const createPaymentOrder = async (rideId, amount, paymentMethod) => {
    return await api.post('/payments/create', {
        ride_id: rideId,
        amount: amount,
        payment_method: paymentMethod
    });
};

export const verifyPayment = async (paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    return await api.post('/payments/verify', {
        payment_id: paymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
    });
};

export const processCashPayment = async (paymentId) => {
    return await api.post('/payments/cash', {
        payment_id: paymentId
    });
};

export const processUPIPayment = async (paymentId, upiId) => {
    return await api.post('/payments/upi', {
        payment_id: paymentId,
        upi_id: upiId
    });
};

export const getPaymentByRideId = async (rideId) => {
    return await api.get(`/payments/ride/${rideId}`);
};

export default api;


