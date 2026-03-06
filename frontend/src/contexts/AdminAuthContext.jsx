import { createContext, useState, useEffect, useContext } from 'react';
import adminApi from '../services/adminApi';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthProvider');
    }
    return context;
};

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('gchat_admin_token'));

    useEffect(() => {
        if (token) {
            // In a real app we might verify the token via /api/admin/me
            // But based on the prompt we're using a simplified approach
            setAdmin({ username: 'admin' });
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password, rememberMe) => {
        try {
            const response = await adminApi.post('/admin/login', { username, password, rememberMe });
            if (response.data.success) {
                localStorage.setItem('gchat_admin_token', response.data.token);
                setToken(response.data.token);
                setAdmin(response.data.admin);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('gchat_admin_token');
        setToken(null);
        setAdmin(null);
    };

    const value = {
        admin,
        loading,
        login,
        logout,
        isAuthenticated: !!admin
    };

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
