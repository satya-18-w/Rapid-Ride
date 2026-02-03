import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserProfile } from '../api';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const userData = await getUserProfile();
                    setUser(userData);
                }
            } catch (error) {
                console.error('Failed to load user:', error);
                localStorage.removeItem('token');
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };

    return (
        <UserContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export default UserContext;