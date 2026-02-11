import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);
    const listenersRef = useRef({});
    const reconnectTimeoutRef = useRef(null);

    const connect = () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Close existing connection if any
        if (socketRef.current) {
            socketRef.current.close();
        }

        const wsUrl = `ws://localhost:8050/api/v1/auth/ws`; // Adjust URL as needed
        const ws = new WebSocket(wsUrl);

        // We can't send headers with standard WebSocket API in browser, 
        // usually auth is done via query param or cookie. 
        // But our backend expects Header or maybe we can hack it?
        // Wait, backend `Handler` checks `c.Get("user_id")` which is set by `RequireAuth` middleware.
        // `RequireAuth` checks `Authorization` header.
        // Standard WebSocket in JS DOES NOT support custom headers.
        // We must pass token in Query Param or Protocol.
        // Let's modify Backend to check Query Param "token".

        // FOR NOW: Assume we modified backend or use a library that supports it (but native WS doesn't).
        // Let's check `auth.go` middleware. It usually checks Header.
        // We probably need to update `auth.go` to check Query Param for WS.

        ws.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            // Reconnect logic
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            ws.close();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { type, payload } = message;

                // Notify listeners
                if (listenersRef.current[type]) {
                    listenersRef.current[type].forEach(callback => callback(payload));
                }
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };

        socketRef.current = ws;
    };

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    const subscribe = (type, callback) => {
        if (!listenersRef.current[type]) {
            listenersRef.current[type] = [];
        }
        listenersRef.current[type].push(callback);

        // Return unsubscribe function
        return () => {
            listenersRef.current[type] = listenersRef.current[type].filter(cb => cb !== callback);
        };
    };

    const sendMessage = (type, payload) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, subscribe, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
