import { useState, useRef } from 'react';
import api from '../../services/api';
import Toast from '../common/Toast';
import Avatar from '../common/Avatar';

const EditProfileModal = ({ user, onClose, onUpdate }) => {
    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleSave = async () => {
        setSaving(true);

        try {
            const response = await api.put('/users/profile', {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim()
            });

            if (response.data.success) {
                showToast('Profile updated successfully');
                setTimeout(() => {
                    onUpdate(response.data.user);
                    onClose();
                }, 1000);
            }
        } catch (err) {
            console.error('Update profile error:', err);
            showToast(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        setUploadingImage(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            const response = await api.post('/users/upload-profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.data.success) {
                showToast('Profile picture updated');
                onUpdate({ ...user, profile_image: response.data.profileImage });
            }
        } catch (err) {
            console.error('Upload error:', err);
            showToast('Failed to upload image', 'error');
        } finally {
            setUploadingImage(false);
            setUploadProgress(0);
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
                    <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Profile Picture */}
                    <div className="text-center mb-6">
                        <div className="relative inline-block">
                            <Avatar user={user} size="xlarge" />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition shadow-lg disabled:bg-gray-300"
                            >
                                {uploadingImage ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {uploadingImage && (
                            <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {/* User ID (Read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                User ID <span className="text-gray-400">(Cannot be changed)</span>
                            </label>
                            <input
                                type="text"
                                value={user.uid}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Gender (Read-only) */}
                        {user.gender && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gender <span className="text-gray-400">(From database)</span>
                                </label>
                                <input
                                    type="text"
                                    value={user.gender}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        )}

                        {/* Place (Read-only) */}
                        {user.place && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Place <span className="text-gray-400">(From database)</span>
                                </label>
                                <input
                                    type="text"
                                    value={user.place}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-white space-y-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                        Cancel
                    </button>
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

export default EditProfileModal;
