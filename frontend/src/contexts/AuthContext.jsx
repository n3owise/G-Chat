import { createContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sync auth state on mount and on changes
    useEffect(() => {
        // 1. Initial check
        checkUser();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await syncUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            await syncUserProfile(authUser);
        } else {
            setLoading(false);
        }
    };

    const syncUserProfile = async (authUser) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (data) {
                // Combine auth user and profile data
                setUser({ ...authUser, ...data });
            } else if (error) {
                console.error('Error fetching profile:', error.message);
            }
        } catch (err) {
            console.error('Profile sync error:', err);
        } finally {
            setLoading(false);
        }
    };

    const login = async (uid, password) => {
        try {
            // 1. Resolve UID to Email from profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('uid', uid.trim())
                .single();

            if (profileError || !profile?.email) {
                return { success: false, message: 'User ID not found' };
            }

            // 2. Perform Supabase Login with resolved email
            const { data, error } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password,
            });

            if (error) return { success: false, message: error.message };
            return { success: true };
        } catch (err) {
            return { success: false, message: 'An unexpected error occurred' };
        }
    };

    const signup = async (uid, password, name) => {
        try {
            // 1. Check if a profile already exists for this UID (case-insensitive)
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('email, id')
                .ilike('uid', uid.trim())
                .single();

            // If profile exists, use its email. Otherwise use a generated one.
            const email = existingProfile?.email || `${uid.trim()}@gchat.com`;

            // 2. Auth Sign Up
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: name || uid, uid }
                }
            });

            if (error) return { success: false, message: error.message };

            // 3. Link Profile (if it didn't exist)
            if (!existingProfile) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{ id: data.user.id, uid, name, email }]);

                if (profileError) throw profileError;
            } else if (!existingProfile.id) {
                // If profile existed but wasn't linked to a UUID yet
                await supabase
                    .from('profiles')
                    .update({ id: data.user.id })
                    .eq('email', email);
            }

            return { success: true };
        } catch (err) {
            console.error('Signup error:', err);
            return { success: false, message: err.message || 'Signup failed' };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
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
