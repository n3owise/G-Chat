import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import api from '../services/api';

const ChangePasswordPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validation = {
        minLength: form.newPass.length >= 8,
        hasNumber: /\d/.test(form.newPass),
        hasSpecial: /[!@#$%^&*]/.test(form.newPass),
        matches: form.newPass === form.confirm && form.confirm.length > 0,
    };
    const isValid = Object.values(validation).every(Boolean) && form.current.length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: form.current,
                newPassword: form.newPass,
            });
            setSuccess(true);
            setTimeout(() => navigate('/profile'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Password Changed!</h2>
                    <p className="text-gray-500 mt-2 text-sm">Redirecting to your profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header title="Change Password" showBack />

            <div className="p-4 max-w-md mx-auto">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 mt-4 space-y-5">

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    {[
                        { label: 'Current Password', key: 'current', placeholder: 'Enter current password' },
                        { label: 'New Password', key: 'newPass', placeholder: 'Min 8 chars with number & special' },
                        { label: 'Confirm New Password', key: 'confirm', placeholder: 'Re-enter new password' },
                    ].map(field => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                            <input
                                type="password"
                                value={form[field.key]}
                                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition"
                                required
                            />
                        </div>
                    ))}

                    {/* Validation hints */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        {[
                            { ok: validation.minLength, label: 'At least 8 characters' },
                            { ok: validation.hasNumber, label: 'At least 1 number' },
                            { ok: validation.hasSpecial, label: 'At least 1 special character' },
                            { ok: validation.matches, label: 'Passwords match' },
                        ].map(r => (
                            <div key={r.label} className={`text-xs flex items-center space-x-2 transition-colors ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${r.ok ? 'bg-green-100 border-green-300' : 'border-gray-300'}`}>
                                    {r.ok ? '✓' : ''}
                                </span>
                                <span>{r.label}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid || loading}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition active:scale-[0.98] shadow-md"
                    >
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
