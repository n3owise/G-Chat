import { useState, useEffect } from 'react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';
import UserProfileModal from '../profile/UserProfileModal';

const UserSearch = ({ onUserClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showingSearchResults, setShowingSearchResults] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/all?limit=100');
            if (response.data.success) {
                setAllUsers(response.data.users);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setShowingSearchResults(false);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
            if (response.data.success) {
                setUsers(response.data.users);
                setShowingSearchResults(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setShowingSearchResults(false);
        setUsers([]);
    };

    const displayUsers = showingSearchResults ? users : allUsers;

    const handleUserProfileClick = (user) => {
        setSelectedUserProfile(user);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by User ID or Name..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <svg
                            className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {showingSearchResults ? (
                        <button
                            onClick={handleClearSearch}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition"
                        >
                            Clear
                        </button>
                    ) : (
                        <button
                            onClick={handleSearch}
                            disabled={!searchTerm.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                        >
                            Search
                        </button>
                    )}
                </div>

                {showingSearchResults && (
                    <p className="text-sm text-gray-600 mt-2">
                        {users.length} result{users.length !== 1 ? 's' : ''} found
                    </p>
                )}
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <Loader text="Loading users..." />
                ) : displayUsers.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">
                        {showingSearchResults ? (
                            <>
                                <p>No users found</p>
                                <p className="text-sm mt-2">Try a different search term</p>
                            </>
                        ) : (
                            <p>No users available</p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {displayUsers.map((user) => (
                            <div
                                key={user.uid}
                                onClick={() => onUserClick(user)}
                                className="flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition active:bg-gray-100"
                            >
                                <div
                                    className="relative flex-shrink-0 cursor-pointer"
                                    onClick={() => handleUserProfileClick(user)}
                                >
                                    <Avatar user={user} size="medium" />
                                    {user.is_online && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>

                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleUserProfileClick(user)}
                                >
                                    <h3 className="font-semibold text-gray-800 truncate">{user.name}</h3>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                                        <span>{user.uid}</span>
                                        {user.place && (
                                            <>
                                                <span>•</span>
                                                <span>{user.place}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right">
                                    {user.is_online ? (
                                        <span className="text-xs text-green-600 font-medium">Online</span>
                                    ) : user.last_seen ? (
                                        <span className="text-xs text-gray-400">
                                            {formatLastSeen(user.last_seen)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {selectedUserProfile && (
                <UserProfileModal
                    user={selectedUserProfile}
                    onClose={() => setSelectedUserProfile(null)}
                    onSendMessage={onUserClick}
                />
            )}
        </div>
    );
};

// Helper function
const formatLastSeen = (lastSeen) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeenDate.toLocaleDateString();
};

export default UserSearch;
