import Avatar from '../common/Avatar';

const UserProfileModal = ({ user, onClose, onSendMessage }) => {
    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return 'a while ago';
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}></div>

            <div className="fixed inset-x-0 bottom-0 top-20 bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Profile</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-b from-primary/10 to-white p-8 text-center">
                        <div className="relative inline-block mb-4">
                            <Avatar user={user} size="xlarge" />
                            {user.is_online && (
                                <span className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                        <p className="text-gray-500 mt-1">{user.uid}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {user.is_online ? (
                                <span className="text-green-600 font-medium">● Online</span>
                            ) : (
                                `Last seen ${formatLastSeen(user.last_seen)}`
                            )}
                        </p>
                    </div>

                    {/* User Details */}
                    <div className="p-4 space-y-4">
                        {user.gender && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-sm text-gray-500">Gender</p>
                                <p className="font-medium text-gray-800">{user.gender}</p>
                            </div>
                        )}

                        {user.place && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-sm text-gray-500">Place</p>
                                <p className="font-medium text-gray-800">{user.place}</p>
                            </div>
                        )}

                        {user.email && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-800">{user.email}</p>
                            </div>
                        )}

                        {user.phone && (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <p className="text-sm text-gray-500">Phone</p>
                                <p className="font-medium text-gray-800">{user.phone}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    <button
                        onClick={() => {
                            onSendMessage(user);
                            onClose();
                        }}
                        className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Send Message</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default UserProfileModal;
