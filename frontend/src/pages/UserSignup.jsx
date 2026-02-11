import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api';
import { UserContext } from '../context/UserContext';
const UserSignup = () => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { user, setUser } = useContext(UserContext);

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
        try {
            const response = await signup({ ...formData, role: 'rider' });
            if (response.data?.token) {
                localStorage.setItem('token', response.data.token);
            }
            navigate('/user/home');
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden'>
            {/* Animated background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops)) ] from-lime-900/20 via-black to-black"></div>

            {/* Ambient lighting */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-40 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className='w-full max-w-md relative z-10'>
                <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
                <div className='relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50'>
                    {/* Logo and Header */}
                    <div className='text-center mb-8'>
                        <div className='inline-block p-3 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-2xl mb-4 shadow-lg shadow-lime-500/20 transform hover:scale-105 transition-transform'>
                            <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className='text-3xl font-bold text-white mb-2'>
                            Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500">Rapid-Ride</span>
                        </h1>
                        <p className='text-gray-400 text-sm'>Create your account to get started</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 flex items-center backdrop-blur-sm">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-5">
                        <div className="glass-input-group">
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Full Name</label>
                            <div className="relative">
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all'
                                    type="text"
                                    placeholder='John Doe'
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Email Address</label>
                            <div className="relative">
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all'
                                    type="email"
                                    placeholder='you@example.com'
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Phone Number</label>
                            <div className="relative">
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all'
                                    type="tel"
                                    placeholder='+1 234 567 8900'
                                />
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all'
                                    type="password"
                                    placeholder='••••••••'
                                    required
                                    minLength={6}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2 ml-1">Minimum 6 characters</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className='w-full bg-gradient-to-r from-lime-500 to-emerald-600 text-black font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-lime-500/25 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4'
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div className='mt-8 text-center'>
                        <p className='text-sm text-gray-400'>
                            Already have an account?{' '}
                            <Link to="/user/login" className='text-lime-400 font-semibold hover:text-lime-300 transition-colors'>
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
};

export default UserSignup;
