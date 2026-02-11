import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';

const CaptainLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login({ email, password, role: 'driver' });
            if (response.data?.token) {
                localStorage.setItem('token', response.data.token);
            }
            navigate('/driver/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden'>
            {/* Animated background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black"></div>

            {/* Ambient lighting */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-40 -right-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className='w-full max-w-md relative z-10'>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
                <div className='relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50'>
                    {/* Back Button */}
                    <Link to="/" className='inline-flex items-center text-gray-500 hover:text-emerald-400 mb-6 transition-colors text-sm font-medium'>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Home
                    </Link>

                    {/* Logo */}
                    <div className='mb-8 text-center'>
                        <div className='inline-block p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20'>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className='text-3xl font-bold text-white mb-2'>Captain Login</h1>
                        <p className='text-gray-400 text-sm'>Enter your credentials to continue</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 flex items-center backdrop-blur-sm">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="glass-input-group">
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Email</label>
                            <div className="relative">
                                <input
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='w-full pl-4 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all'
                                    type="email"
                                    placeholder='Enter your email'
                                />
                            </div>
                        </div>

                        <div>
                            <label className='block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1'>Password</label>
                            <div className="relative">
                                <input
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='w-full pl-4 pr-12 py-3 bg-black/50 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all'
                                    type={showPassword ? "text" : "password"}
                                    placeholder='Enter your password'
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className='w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4'
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className='mt-8 text-center space-y-4'>
                        <p className='text-sm text-gray-400'>
                            Don't have an account?{' '}
                            <Link to="/driver/signup" className='text-emerald-400 font-semibold hover:text-emerald-300 transition-colors'>
                                Sign up to drive
                            </Link>
                        </p>

                        <div className="pt-4 border-t border-gray-800">
                            <Link
                                to="/user/login"
                                className='inline-flex items-center text-sm text-gray-500 hover:text-white transition-colors'
                            >
                                <span className="mr-2">Are you a rider?</span>
                                <span className="text-lime-400 font-semibold hover:text-lime-300">Login as Rider →</span>
                            </Link>
                        </div>
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

export default CaptainLogin;