import { useState } from 'react';
import { supabase } from '../../config/supabase';
import Toast from '../common/Toast';

const ChangePasswordModal = ({ onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
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

    const handleNewPasswordChange = (e) => {
        const value = e.target.value;
        setNewPassword(value);
        validatePassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (!validation.minLength || !validation.hasNumber || !validation.hasSpecial) {
            showToast('Password does not meet requirements', 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showToast('Password changed successfully');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Change password error:', err.message);
            showToast(err.message || 'Failed to change password', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            <div className="fixed inset-x-0 bottom-0 top-20 bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={handleNewPasswordChange}
                                placeholder="Enter new password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />

                            {/* Password Requirements */}
                            <div className="mt-2 space-y-1">
                                <div className={`text-xs flex items-center ${validation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                                    <span className="mr-2">{validation.minLength ? '✓' : '○'}</span>
                                    At least 8 characters
                                </div>
                                <div className={`text-xs flex items-center ${validation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                    <span className="mr-2">{validation.hasNumber ? '✓' : '○'}</span>
                                    At least 1 number
                                </div>
                                <div className={`text-xs flex items-center ${validation.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                                    <span className="mr-2">{validation.hasSpecial ? '✓' : '○'}</span>
                                    At least 1 special character (!@#$%^&*)
                                </div>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || !validation.minLength || !validation.hasNumber || !validation.hasSpecial}
                                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};

export default ChangePasswordModal;
