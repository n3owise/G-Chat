import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/common/Header';
import Avatar from '../components/common/Avatar';
import EditProfileModal from '../components/profile/EditProfileModal';
import ChangePasswordModal from '../components/profile/ChangePasswordModal';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleUpdateProfile = (updatedUser) => {
        setUser(updatedUser);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header title="Profile" />

            <div className="p-4">
                {/* Profile Header */}
                <div className="bg-white rounded-lg shadow-md p-6 text-center mb-4">
                    <Avatar user={user} size="xlarge" />
                    <h2 className="text-2xl font-bold text-gray-800 mt-4">{user?.name}</h2>
                    <p className="text-gray-500">{user?.uid}</p>
                </div>

                {/* Profile Info */}
                <div className="bg-white rounded-lg shadow-md divide-y divide-gray-100 mb-4">
                    <div className="p-4">
                        <label className="text-sm text-gray-500">User ID</label>
                        <p className="font-medium text-gray-800">{user?.uid}</p>
                    </div>

                    <div className="p-4">
                        <label className="text-sm text-gray-500">Name</label>
                        <p className="font-medium text-gray-800">{user?.name}</p>
                    </div>

                    {user?.gender && (
                        <div className="p-4">
                            <label className="text-sm text-gray-500">Gender</label>
                            <p className="font-medium text-gray-800">{user.gender}</p>
                        </div>
                    )}

                    {user?.place && (
                        <div className="p-4">
                            <label className="text-sm text-gray-500">Place</label>
                            <p className="font-medium text-gray-800">{user.place}</p>
                        </div>
                    )}

                    <div className="p-4">
                        <label className="text-sm text-gray-500">Email</label>
                        <p className="font-medium text-gray-800">{user?.email || 'Not provided'}</p>
                    </div>

                    <div className="p-4">
                        <label className="text-sm text-gray-500">Phone</label>
                        <p className="font-medium text-gray-800">{user?.phone || 'Not provided'}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
                    >
                        Edit Profile
                    </button>

                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                        Change Password
                    </button>

                    <button
                        onClick={() => navigate('/chat')}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                    >
                        Back to Chats
                    </button>

                    <button
                        onClick={() => {
                            // we need logout functionality, user context provides it
                            const { logout } = useAuth(); // getting logout function 
                            logout();
                        }}
                        className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-lg font-semibold hover:bg-red-100 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showEditModal && (
                <EditProfileModal
                    user={user}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={handleUpdateProfile}
                />
            )}

            {showPasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowPasswordModal(false)}
                />
            )}
        </div>
    );
};

export default ProfilePage;
