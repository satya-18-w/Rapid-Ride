import React, { useState, useRef, useEffect } from 'react';

const OTPVerification = ({ onVerify, onCancel, rideOTP, isDriver = false }) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        // Focus first input on mount
        inputRefs[0].current?.focus();
    }, []);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus();
        }

        // Auto-verify when all 4 digits are entered
        if (newOtp.every(digit => digit !== '') && index === 3) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 4);

        if (/^\d+$/.test(pastedData)) {
            const newOtp = pastedData.split('');
            setOtp([...newOtp, ...Array(4 - newOtp.length).fill('')]);

            if (newOtp.length === 4) {
                handleVerify(pastedData);
            } else {
                inputRefs[newOtp.length]?.current?.focus();
            }
        }
    };

    const handleVerify = (otpString) => {
        const enteredOTP = otpString || otp.join('');

        if (enteredOTP.length !== 4) {
            setError('Please enter complete OTP');
            return;
        }

        // For demo purposes, we'll accept any 4-digit OTP
        // In production, verify against rideOTP
        onVerify(enteredOTP);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>

                <div className="relative bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-800">
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-lime-500 to-emerald-500 rounded-full flex items-center justify-center text-4xl shadow-lg shadow-lime-500/50">
                            {isDriver ? '🚗' : '🔐'}
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                        {isDriver ? 'Start Ride' : 'Ride OTP'}
                    </h2>
                    <p className="text-center text-gray-400 mb-8">
                        {isDriver
                            ? 'Enter the 4-digit OTP from the rider'
                            : 'Share this OTP with your driver to start the ride'
                        }
                    </p>

                    {/* Display OTP for rider */}
                    {!isDriver && rideOTP && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-lime-500/20 to-emerald-500/20 rounded-2xl border border-lime-500/30">
                            <div className="text-center">
                                <div className="text-sm text-gray-400 mb-2">Your OTP</div>
                                <div className="text-4xl font-bold text-lime-400 tracking-widest font-mono">
                                    {rideOTP}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    Don't share this with anyone except your driver
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OTP Input for driver */}
                    {isDriver && (
                        <>
                            <div className="flex justify-center space-x-3 mb-6">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={inputRefs[index]}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-16 h-16 text-center text-2xl font-bold bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-lime-500 focus:outline-none transition-all transform focus:scale-110"
                                    />
                                ))}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-center text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Verify Button */}
                            <button
                                onClick={() => handleVerify()}
                                disabled={otp.some(digit => !digit)}
                                className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-black font-bold py-4 rounded-xl transition-all transform hover:scale-105 disabled:scale-100 shadow-lg disabled:shadow-none"
                            >
                                Start Ride
                            </button>
                        </>
                    )}

                    {/* Info for rider */}
                    {!isDriver && (
                        <div className="text-center text-sm text-gray-500 mt-4">
                            The driver will enter this OTP to start your ride
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OTPVerification;
