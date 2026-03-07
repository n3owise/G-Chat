import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';

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
            try {
                const adminData = JSON.parse(localStorage.getItem('gchat_admin_user'));
                setAdmin(adminData || { username: 'admin' });
            } catch (e) {
                setAdmin({ username: 'admin' });
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (username, password, rememberMe) => {
        try {
            const { data, error } = await supabase
                .from('gchat_admins')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                return { success: false, message: 'Invalid credentials' };
            }

            const fakeToken = `admin_${Date.now()}`;
            localStorage.setItem('gchat_admin_token', fakeToken);
            localStorage.setItem('gchat_admin_user', JSON.stringify(data));
            setToken(fakeToken);
            setAdmin(data);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('gchat_admin_token');
        localStorage.removeItem('gchat_admin_user');
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
