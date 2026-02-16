
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDriverProfile } from '../api';

const CaptainDetails = () => {
    const [formData, setFormData] = useState({
        vehicle_type: '',
        vehicle_number: '',
        capacity: 1
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Convert capacity to integer
        const payload = {
            ...formData,
            capacity: parseInt(formData.capacity, 10)
        };

        try {
            await createDriverProfile(payload);
            navigate('/driver/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden'>
            {/* Animated background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black"></div>

            <div className='w-full max-w-md relative z-10'>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
                <div className='relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50'>

                    <div className='text-center mb-8'>
                        <div className='inline-block p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20'>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                        </div>
                        <h1 className='text-3xl font-bold text-white mb-2'>Vehicle Details</h1>
                        <p className='text-gray-400 text-sm'>Enter your vehicle information to start driving</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 text-sm font-medium backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-5">
                        <div className="glass-input-group">
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Vehicle Type</label>
                            <div className="relative">
                                <select
                                    name="vehicle_type"
                                    value={formData.vehicle_type}
                                    onChange={handleChange}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none cursor-pointer'
                                    required
                                >
                                    <option value="" disabled className="text-gray-500">Select Vehicle Type</option>
                                    <option value="car" className="bg-gray-900">Car</option>
                                    <option value="bike" className="bg-gray-900">Bike</option>
                                    <option value="auto" className="bg-gray-900">Auto</option>
                                    <option value="suv" className="bg-gray-900">SUV</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Vehicle Number</label>
                            <input
                                name="vehicle_number"
                                value={formData.vehicle_number}
                                onChange={handleChange}
                                className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all'
                                type="text"
                                placeholder='KA 01 AB 1234'
                                required
                                minLength={4}
                            />
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Vehicle Capacity</label>
                            <input
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleChange}
                                className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all'
                                type="number"
                                placeholder='Number of passengers'
                                required
                                min="1"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className='w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6'
                        >
                            {loading ? 'Submitting...' : 'Complete Registration'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CaptainDetails;
