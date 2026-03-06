const UserDetailsModal = ({ user, onClose, onEdit, onResetPassword, onBanToggle }) => {
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-800">User Details</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Profile Picture */}
                        <div className="text-center">
                            {user.profile_image ? (
                                <img
                                    src={user.profile_image}
                                    alt={user.name}
                                    className="w-24 h-24 rounded-full mx-auto object-cover"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-gray-800 mt-4">{user.name}</h3>
                            <p className="text-gray-500">{user.uid}</p>
                        </div>

                        {/* User Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500">Gender</label>
                                <p className="font-medium text-gray-800">{user.gender || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Place</label>
                                <p className="font-medium text-gray-800">{user.place || user.city || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Email</label>
                                <p className="font-medium text-gray-800">{user.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Phone</label>
                                <p className="font-medium text-gray-800">{user.phone || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Status</label>
                                <p className="font-medium">
                                    {user.gchat_status === 'banned' ? (
                                        <span className="text-red-600">Banned</span>
                                    ) : user.is_online ? (
                                        <span className="text-green-600">● Online</span>
                                    ) : (
                                        <span className="text-gray-600">○ Offline</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500">Registered</label>
                                <p className="font-medium text-gray-800">
                                    {new Date(user.gchat_registered_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Statistics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500">Messages Sent</label>
                                    <p className="text-2xl font-bold text-gray-800">{user.messagesSent || 0}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Messages Received</label>
                                    <p className="text-2xl font-bold text-gray-800">{user.messagesReceived || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-200 space-y-2">
                        <button
                            onClick={onEdit}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition"
                        >
                            Edit User
                        </button>
                        <button
                            onClick={onResetPassword}
                            className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 transition"
                        >
                            Reset Password
                        </button>
                        <button
                            onClick={onBanToggle}
                            className={`w-full py-3 rounded-lg transition ${user.gchat_status === 'banned'
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                        >
                            {user.gchat_status === 'banned' ? 'Unban User' : 'Ban User'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserDetailsModal;
