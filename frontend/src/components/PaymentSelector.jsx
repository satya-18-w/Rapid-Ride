import React, { useState } from 'react';

const PaymentSelector = ({ onSelect, selectedPayment, amount }) => {
    const [showUPIOptions, setShowUPIOptions] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [upiId, setUpiId] = useState('');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvv: '',
        holder: ''
    });

    const paymentMethods = [
        {
            id: 'cash',
            name: 'Cash',
            icon: '💵',
            description: 'Pay with cash after ride',
            color: 'from-green-500 to-emerald-500'
        },
        {
            id: 'upi',
            name: 'UPI',
            icon: '📱',
            description: 'PhonePe, GPay, Paytm & more',
            color: 'from-purple-500 to-pink-500',
            hasSubOptions: true
        },
        {
            id: 'card',
            name: 'Debit/Credit Card',
            icon: '💳',
            description: 'Visa, Mastercard, Rupay',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: 'wallet',
            name: 'Wallet',
            icon: '👛',
            description: 'Paytm, PhonePe wallet',
            color: 'from-orange-500 to-red-500'
        }
    ];

    const upiApps = [
        { id: 'phonepe', name: 'PhonePe', icon: '🟣', color: 'bg-purple-600' },
        { id: 'gpay', name: 'Google Pay', icon: '🔵', color: 'bg-blue-600' },
        { id: 'paytm', name: 'Paytm', icon: '🔷', color: 'bg-cyan-600' },
        { id: 'bhim', name: 'BHIM UPI', icon: '🟢', color: 'bg-green-600' },
        { id: 'amazonpay', name: 'Amazon Pay', icon: '🟠', color: 'bg-orange-600' },
        { id: 'other', name: 'Other UPI', icon: '⚪', color: 'bg-gray-600' }
    ];

    const handlePaymentSelect = (method) => {
        if (method.id === 'upi') {
            setShowUPIOptions(true);
            setShowCardForm(false);
        } else if (method.id === 'card') {
            setShowCardForm(true);
            setShowUPIOptions(false);
        } else {
            onSelect(method);
            setShowUPIOptions(false);
            setShowCardForm(false);
        }
    };

    const handleUPISelect = (upiApp) => {
        onSelect({
            ...paymentMethods.find(m => m.id === 'upi'),
            upiApp: upiApp.id,
            upiName: upiApp.name
        });
        setShowUPIOptions(false);
    };

    const handleCardSubmit = () => {
        if (cardDetails.number && cardDetails.expiry && cardDetails.cvv && cardDetails.holder) {
            onSelect({
                ...paymentMethods.find(m => m.id === 'card'),
                cardDetails: cardDetails
            });
            setShowCardForm(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Payment Method</h3>
                {amount && (
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Amount</div>
                        <div className="text-xl font-bold text-lime-400">₹{amount}</div>
                    </div>
                )}
            </div>

            {!showUPIOptions && !showCardForm ? (
                <div className="space-y-3">
                    {paymentMethods.map((method) => {
                        const isSelected = selectedPayment?.id === method.id;

                        return (
                            <div
                                key={method.id}
                                onClick={() => handlePaymentSelect(method)}
                                className={`relative cursor-pointer transition-all duration-300 ${isSelected ? 'scale-105' : 'hover:scale-102'
                                    }`}
                            >
                                <div className={`bg-gradient-to-r ${method.color} p-[2px] rounded-xl ${isSelected ? 'shadow-2xl shadow-lime-500/50' : ''
                                    }`}>
                                    <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="text-3xl">{method.icon}</div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-bold text-white">{method.name}</h4>
                                                        {isSelected && (
                                                            <span className="text-lime-400">✓</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400">{method.description}</p>
                                                    {isSelected && selectedPayment.upiName && (
                                                        <p className="text-xs text-lime-400 mt-1">
                                                            via {selectedPayment.upiName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {method.hasSubOptions && (
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : showUPIOptions ? (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowUPIOptions(false)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        {upiApps.map((app) => (
                            <div
                                key={app.id}
                                onClick={() => handleUPISelect(app)}
                                className="cursor-pointer transform transition-all hover:scale-105"
                            >
                                <div className={`${app.color} p-[2px] rounded-xl`}>
                                    <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 text-center">
                                        <div className="text-3xl mb-2">{app.icon}</div>
                                        <div className="text-sm font-semibold text-white">{app.name}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* UPI ID Input */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Or enter UPI ID
                        </label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="yourname@upi"
                                className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                            />
                            <button
                                onClick={() => {
                                    if (upiId) {
                                        onSelect({
                                            ...paymentMethods.find(m => m.id === 'upi'),
                                            upiId
                                        });
                                        setShowUPIOptions(false);
                                    }
                                }}
                                disabled={!upiId}
                                className="bg-lime-500 hover:bg-lime-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-6 py-3 rounded-xl transition-all"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowCardForm(false)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back</span>
                    </button>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Card Number
                            </label>
                            <input
                                type="text"
                                value={cardDetails.number}
                                onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                                placeholder="1234 5678 9012 3456"
                                maxLength="16"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Expiry Date
                                </label>
                                <input
                                    type="text"
                                    value={cardDetails.expiry}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\D/g, '');
                                        if (value.length >= 2) {
                                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                        }
                                        setCardDetails({ ...cardDetails, expiry: value });
                                    }}
                                    placeholder="MM/YY"
                                    maxLength="5"
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    CVV
                                </label>
                                <input
                                    type="password"
                                    value={cardDetails.cvv}
                                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                    placeholder="123"
                                    maxLength="3"
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Card Holder Name
                            </label>
                            <input
                                type="text"
                                value={cardDetails.holder}
                                onChange={(e) => setCardDetails({ ...cardDetails, holder: e.target.value })}
                                placeholder="JOHN DOE"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 uppercase focus:outline-none focus:border-lime-500 transition-colors"
                            />
                        </div>

                        <button
                            onClick={handleCardSubmit}
                            disabled={!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.holder}
                            className="w-full bg-lime-500 hover:bg-lime-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold px-6 py-3 rounded-xl transition-all"
                        >
                            Add Card
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentSelector;
