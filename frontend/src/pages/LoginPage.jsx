import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [step, setStep] = useState(1); // 1: Enter UID, 2: Enter Password, 3: Signup
    const [uid, setUid] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userData, setUserData] = useState(null);

    const handleUIDSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Check if user exists in profiles table (case-insensitive)
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .ilike('uid', uid.trim())
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found"
                throw fetchError;
            }

            if (data) {
                // Existing user, go to password
                setUserData(data);
                setStep(2);
            } else {
                // User doesn't exist in our profiles yet
                // For G-Chat, we might want to check the external GSAA database
                // But for this standalone migration, we'll allow them to signup
                setStep(3);
            }
        } catch (err) {
            console.error('UID check error:', err);
            setError('Error checking User ID. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(uid, password);
            if (result.success) {
                navigate('/chat');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setError('Incorrect password or login error');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep(1);
        setPassword('');
        setError('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl">
                        <span className="text-4xl font-bold text-primary">G</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">G-Chat</h1>
                    <p className="text-white/80">GSAA Global Communication</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {step === 1 && (
                        <form onSubmit={handleUIDSubmit}>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 font-primary text-center">Welcome Back</h2>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-gray-700 font-medium mb-2">User ID</label>
                                <input
                                    type="text"
                                    value={uid}
                                    onChange={(e) => setUid(e.target.value)}
                                    placeholder="Enter your User ID"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !uid.trim()}
                                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                            >
                                {loading ? 'Checking...' : 'Continue'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleLogin}>
                            <button
                                type="button"
                                onClick={handleBack}
                                className="text-primary mb-4 flex items-center hover:underline text-sm font-medium"
                            >
                                &lsaquo; Back
                            </button>

                            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Enter Password</h2>
                            <p className="text-gray-600 mb-6 text-center text-sm">User ID: <span className="font-semibold">{uid}</span></p>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-gray-700 font-medium mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>

                            <button type="button" className="w-full text-center text-xs text-gray-500 mt-4 hover:text-primary transition-colors cursor-pointer">
                                Forgot password? Contact support
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <SignupForm
                            uid={uid}
                            userData={userData}
                            onBack={handleBack}
                        />
                    )}
                </div>

                {/* Support Info */}
                <div className="text-center mt-6 text-white/80 text-xs">
                    <p>Need help? Contact support</p>
                    <p className="mt-1 font-medium">support@gsaaglobal.com | +91-XXXXXXXXXX</p>
                </div>
            </div>
        </div>
    );
};

// Signup Form Component
const SignupForm = ({ uid, userData, onBack }) => {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validation, setValidation] = useState({
        minLength: false,
        hasNumber: false,
        hasSpecial: false
    });

    const validatePassword = (pass) => {
        setValidation({
            minLength: pass.length >= 8,
            hasNumber: /\d/.test(pass),
            hasSpecial: /[!@#$%^&*]/.test(pass)
        });
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        validatePassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!validation.minLength || !validation.hasNumber || !validation.hasSpecial) {
            setError('Password does not meet requirements');
            return;
        }

        setLoading(true);

        try {
            const result = await signup(uid, password);
            if (result.success) {
                navigate('/chat');
            } else {
                setError(result.message || 'Signup failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <button
                type="button"
                onClick={onBack}
                className="text-primary mb-4 flex items-center hover:underline text-sm font-medium"
            >
                &lsaquo; Back
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Great to have you!</h2>
            <p className="text-gray-600 mb-6 text-center text-sm">Set up your G-Chat password</p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-xs text-center">
                    {error}
                </div>
            )}

            {/* Auto-filled User Info */}
            <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2 font-bold">Account Profile</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                        <p className="text-[10px] text-gray-500">Name</p>
                        <p className="font-semibold text-gray-800 text-sm">{userData?.name}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500">User ID</p>
                        <p className="font-semibold text-gray-800 text-sm">{uid}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500">Gender</p>
                        <p className="font-semibold text-gray-800 text-sm">{userData?.gender || 'Not specified'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500">Place</p>
                        <p className="font-semibold text-gray-800 text-sm">{userData?.place || 'Not specified'}</p>
                    </div>
                </div>
                {userData?.email && <p className="text-xs text-gray-500">{userData.email}</p>}
                {userData?.phone && <p className="text-xs text-gray-500">{userData.phone}</p>}
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 text-sm">Create Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                />

                {/* Password Requirements */}
                <div className="mt-3 space-y-1.5 px-1">
                    <div className={`text-[11px] flex items-center transition-colors ${validation.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`mr-2 h-4 w-4 flex items-center justify-center rounded-full border ${validation.minLength ? 'bg-green-100 border-green-200 text-green-700' : 'border-gray-300'}`}>
                            {validation.minLength ? '✓' : ''}
                        </span>
                        At least 8 characters
                    </div>
                    <div className={`text-[11px] flex items-center transition-colors ${validation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`mr-2 h-4 w-4 flex items-center justify-center rounded-full border ${validation.hasNumber ? 'bg-green-100 border-green-200 text-green-700' : 'border-gray-300'}`}>
                            {validation.hasNumber ? '✓' : ''}
                        </span>
                        At least 1 number
                    </div>
                    <div className={`text-[11px] flex items-center transition-colors ${validation.hasSpecial ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`mr-2 h-4 w-4 flex items-center justify-center rounded-full border ${validation.hasSpecial ? 'bg-green-100 border-green-200 text-green-700' : 'border-gray-300'}`}>
                            {validation.hasSpecial ? '✓' : ''}
                        </span>
                        At least 1 special character (!@#$%^&*)
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2 text-sm">Confirm Password</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    required
                />
                {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-red-600 mt-1 pl-1">Passwords do not match</p>
                )}
            </div>

            <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword || !validation.minLength || !validation.hasNumber || !validation.hasSpecial}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
            >
                {loading ? 'Setting up...' : 'Create Account'}
            </button>
        </form>
    );
};

export default LoginPage;
