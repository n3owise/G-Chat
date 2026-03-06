import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('gchat_token'));

    // Check if user is logged in on mount
    useEffect(() => {
        if (token) {
            getCurrentUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const getCurrentUser = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (error) {
            console.error('Get current user error:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (uid, password) => {
        const response = await api.post('/auth/login', { uid, password });
        if (response.data.success) {
            localStorage.setItem('gchat_token', response.data.token);
            setToken(response.data.token);
            setUser(response.data.user);
            return { success: true };
        }
        return { success: false, message: response.data.message };
    };

    const signup = async (uid, password) => {
        const response = await api.post('/auth/signup', { uid, password });
        if (response.data.success) {
            localStorage.setItem('gchat_token', response.data.token);
            setToken(response.data.token);
            setUser(response.data.user);
            return { success: true };
        }
        return { success: false, message: response.data.message };
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('gchat_token');
            setToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        setUser,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
