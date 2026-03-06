import { useState } from 'react';
import adminApi from '../../services/adminApi';

const AddUserModal = ({ onClose, onSuccess, showToast }) => {
    const [formData, setFormData] = useState({
        uid: '',
        name: '',
        gender: '',
        place: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(generatedPassword);
        showToast('Password copied to clipboard');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await adminApi.post('/admin/users/add', formData);

            if (response.data.success) {
                setGeneratedPassword(response.data.temporaryPassword);
                showToast('User added successfully');
                // Don't close immediately - show password first
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to add user', 'error');
            setLoading(false);
        }
    };

    const handleDone = () => {
        onSuccess();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800">Add New User</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {generatedPassword ? (
                        <div className="p-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-lg font-bold text-green-800 mb-2">User Added Successfully!</h3>
                                <p className="text-sm text-green-700 mb-4">
                                    User <strong>{formData.name}</strong> ({formData.uid}) has been created.
                                </p>

                                <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                                    <p className="text-xs text-gray-600 mb-2">Temporary Password:</p>
                                    <p className="text-xl font-mono font-bold text-gray-800 mb-3">{generatedPassword}</p>
                                    <button
                                        onClick={copyPassword}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                                    >
                                        Copy Password
                                    </button>
                                </div>

                                <p className="text-xs text-gray-600 mb-4">
                                    ⚠️ Save this password! The user will need it to login for the first time.
                                </p>

                                <button
                                    onClick={handleDone}
                                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                                <input
                                    type="text"
                                    name="uid"
                                    value={formData.uid}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
                                <input
                                    type="text"
                                    name="place"
                                    value={formData.place}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                    A temporary password will be generated automatically. You'll need to share it with the user.
                                </p>
                            </div>

                            <div className="pt-4 space-y-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? 'Adding User...' : 'Add User'}
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
                    )}
                </div>
            </div>
        </>
    );
};

export default AddUserModal;
