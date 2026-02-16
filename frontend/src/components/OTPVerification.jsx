import React, { useState, useRef, useEffect } from 'react';

/**
 * OTPVerification component.
 * - isDriver=true: Shows OTP input for driver to enter the rider's OTP
 * - isDriver=false or undefined: Shows the ride OTP for the rider to share with the driver
 */
const OTPVerification = ({
    isDriver = false,
    rideOTP = '',
    onVerify = () => { },
    onCancel = () => { },
}) => {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (isDriver && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [isDriver]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setError('');

        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
        if (paste.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < paste.length; i++) {
                newOtp[i] = paste[i];
            }
            setOtp(newOtp);
            if (paste.length === 4) {
                inputRefs.current[3]?.focus();
            } else {
                inputRefs.current[paste.length]?.focus();
            }
        }
    };
    

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 4) {
            setError('Please enter the complete OTP');
            return;
        }
        setSubmitting(true);
        try {
            await onVerify(otpString);
        } catch (e) {
            setError(e?.response?.data?.error || 'Invalid OTP, try again');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Driver: OTP Input ──────────────────────────────────────
    if (isDriver) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                <div className="w-full max-w-sm bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 shadow-2xl animate-scale-in">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Enter Ride OTP</h3>
                        <p className="text-gray-400 text-sm">Ask the rider for their 4-digit OTP code</p>
                    </div>

                    {/* OTP Input */}
                    <div className="flex justify-center space-x-3 mb-6" onPaste={handlePaste}>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputRefs.current[i] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                className="otp-digit-input"
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center mb-4 animate-fade-in">{error}</p>
                    )}

                    <button
                        onClick={handleVerify}
                        disabled={submitting || otp.join('').length < 4}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-2xl hover:from-blue-400 hover:to-purple-500 transition-all active:scale-[0.98] disabled:opacity-50 text-lg"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center space-x-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Verifying...</span>
                            </span>
                        ) : 'Start Ride'}
                    </button>

                    <button onClick={onCancel} className="w-full mt-3 text-gray-500 text-sm hover:text-gray-300 transition-colors py-2">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // ─── Rider: OTP Display ─────────────────────────────────────
    return (
        <div className="bg-gradient-to-br from-lime-500/10 to-emerald-500/10 border border-lime-500/20 rounded-2xl p-5 animate-scale-in">
            <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-2">
                    <svg className="w-4 h-4 text-lime-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <span className="text-xs font-bold text-lime-400 uppercase tracking-wider">Your Ride OTP</span>
                </div>
                <div className="flex justify-center space-x-2 mb-3">
                    {rideOTP.split('').map((digit, i) => (
                        <div key={i} className="otp-digit animate-scale-in" style={{ animationDelay: `${i * 0.1}s` }}>
                            {digit}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400">Share this OTP with your driver to start the ride</p>
            </div>
        </div>
    );
};

export default OTPVerification;
