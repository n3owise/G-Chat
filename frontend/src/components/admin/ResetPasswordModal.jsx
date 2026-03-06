import { useState } from 'react';
import adminApi from '../../services/adminApi';

const ResetPasswordModal = ({ user, onClose, onSuccess, showToast }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
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
        setNewPassword(value);
        validatePassword(value);
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const specials = '!@#$%^&*';

        let password = '';
        password += chars[Math.floor(Math.random() * chars.length)];
        password += chars[Math.floor(Math.random() * chars.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += specials[Math.floor(Math.random() * specials.length)];

        for (let i = 4; i < 12; i++) {
            const allChars = chars + numbers + specials;
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        setNewPassword(password);
        setConfirmPassword(password);
        validatePassword(password);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(newPassword);
        showToast('Password copied to clipboard');
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
            const response = await adminApi.post(`/admin/users/${user.uid}/reset-password`, {
                newPassword
            });

            if (response.data.success) {
                showToast('Password reset successfully');
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to reset password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800">Reset Password</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                Resetting password for: <strong>{user.name}</strong> ({user.uid})
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">New Password</label>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="text-xs text-primary hover:text-primary/80"
                                >
                                    Generate
                                </button>
                            </div>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={handlePasswordChange}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                                {newPassword && (
                                    <button
                                        type="button"
                                        onClick={copyToClipboard}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        title="Copy to clipboard"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                )}
                            </div>

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="text"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        <div className="pt-4 space-y-2">
                            <button
                                type="submit"
                                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                {loading ? 'Resetting Password...' : 'Reset Password'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default ResetPasswordModal;
