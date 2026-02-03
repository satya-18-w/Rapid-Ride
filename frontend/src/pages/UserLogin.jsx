import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../api';

const UserLogin = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const otpInputRef = useRef(null);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendOTP(email, 'rider');
            setShowOTP(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await verifyOTP(email, otp, 'rider');
            navigate('/user/home');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData('text');
        if (data.length === 6 && /^\d+$/.test(data)) {
            setOtp(data);
        }
    };

    useEffect(() => {
        if (showOTP && otpInputRef.current) {
            otpInputRef.current.focus();
        }
    }, [showOTP]);

    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden'>
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className='w-full max-w-md relative z-10'>
                <div className='bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95'>
                    {/* Logo and Header */}
                    <div className='text-center mb-8'>
                        <div className='inline-block p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl mb-4 shadow-lg transform hover:scale-105 transition-transform'>
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className='text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2'>
                            Welcome Back
                        </h1>
                        <p className='text-gray-500 text-sm'>Sign in to continue your journey</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 animate-shake" role="alert">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    {!showOTP ? (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div className="relative">
                                <label className='block text-sm font-semibold text-gray-700 mb-2'>Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                    </div>
                                    <input
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className='w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all'
                                        type="email"
                                        placeholder='you@example.com'
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className='w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold py-3 px-4 rounded-xl hover:from-yellow-500 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </span>
                                ) : 'Continue with Email'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className='flex items-center justify-between mb-4'>
                                <div>
                                    <h3 className='text-xl font-bold text-gray-800'>Enter OTP</h3>
                                    <p className="text-gray-500 text-sm mt-1">Sent to {email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOTP(false);
                                        setOtp('');
                                        setError('');
                                    }}
                                    className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1 hover:underline"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Change
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    ref={otpInputRef}
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    onPaste={handlePaste}
                                    className='w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all'
                                    type="text"
                                    maxLength="6"
                                    pattern="\d*"
                                    autoComplete="one-time-code"
                                    placeholder='● ● ● ● ● ●'
                                />
                                <p className="text-xs text-gray-500 mt-2 text-center">Code expires in 10 minutes</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className='w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold py-3 px-4 rounded-xl hover:from-yellow-500 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </span>
                                ) : 'Verify & Continue'}
                            </button>
                        </form>
                    )}

                    <div className='mt-8 pt-6 border-t border-gray-200'>
                        <p className='text-center text-sm text-gray-600'>
                            New to Rapid-Ride?{' '}
                            <Link to="/user/signup" className='text-yellow-600 font-semibold hover:text-yellow-700 hover:underline'>
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>

                <div className='mt-6'>
                    <Link
                        to="/driver/login"
                        className='block w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-[1.02] transition-all shadow-lg text-center'
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Sign in as Captain
                        </span>
                    </Link>
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
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s;
                }
            `}</style>
        </div>
    );
};

export default UserLogin;