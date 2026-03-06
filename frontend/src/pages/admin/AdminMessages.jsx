import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import Toast from '../../components/common/Toast';

const AdminMessages = () => {
    const navigate = useNavigate();
    const { logout } = useAdminAuth();
    const [users, setUsers] = useState([]);
    const [user1, setUser1] = useState('');
    const [user2, setUser2] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await adminApi.get('/admin/users?limit=10000');
            if (response.data.success) {
                setUsers(response.data.users);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchConversation = async () => {
        if (!user1 || !user2) {
            showToast('Please select both users', 'error');
            return;
        }

        if (user1 === user2) {
            showToast('Please select different users', 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await adminApi.get(`/admin/messages/${user1}/${user2}`);
            if (response.data.success) {
                setMessages(response.data.messages);
                if (response.data.messages.length === 0) {
                    showToast('No messages found between these users');
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load messages', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Are you sure you want to permanently delete this message?')) {
            return;
        }

        try {
            const response = await adminApi.delete(`/admin/messages/${messageId}`);
            if (response.data.success) {
                showToast('Message deleted successfully');
                setMessages(messages.filter(m => m.id !== messageId));
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to delete message', 'error');
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
            navigate('/admin/login');
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const groupMessagesByDate = (msgs) => {
        const groups = [];
        let currentDate = null;
        let currentGroup = null;

        msgs.forEach(message => {
            const messageDate = new Date(message.created_at);
            const dateStr = formatDateDivider(messageDate);

            if (dateStr !== currentDate) {
                if (currentGroup) groups.push(currentGroup);
                currentDate = dateStr;
                currentGroup = { date: dateStr, messages: [] };
            }

            currentGroup.messages.push(message);
        });

        if (currentGroup) groups.push(currentGroup);
        return groups;
    };

    const formatDateDivider = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xl">G</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">G-Chat Admin</h1>
                            <p className="text-xs text-gray-500">Message Monitoring</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Navigation */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Users
                        </button>
                        <button
                            onClick={() => navigate('/admin/messages')}
                            className="px-4 py-2 bg-primary text-white rounded-lg"
                        >
                            Messages
                        </button>
                    </div>
                </div>

                {/* User Selection */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">View Conversation Between Users</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">User 1</label>
                            <select
                                value={user1}
                                onChange={(e) => setUser1(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select User 1</option>
                                {users.map(user => (
                                    <option key={user.uid} value={user.uid}>
                                        {user.name} ({user.uid})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">User 2</label>
                            <select
                                value={user2}
                                onChange={(e) => setUser2(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select User 2</option>
                                {users.map(user => (
                                    <option key={user.uid} value={user.uid}>
                                        {user.name} ({user.uid})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={fetchConversation}
                                disabled={loading}
                                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:bg-gray-300 transition"
                            >
                                {loading ? 'Loading...' : 'View Messages'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages Display */}
                {messages.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-800">
                                Conversation: {users.find(u => u.uid === user1)?.name || user1} ↔ {users.find(u => u.uid === user2)?.name || user2}
                            </h3>
                            <p className="text-sm text-gray-500">{messages.length} messages</p>
                        </div>

                        <div className="p-6 max-h-[600px] overflow-y-auto bg-gray-50">
                            {groupMessagesByDate(messages).map((group, groupIndex) => (
                                <div key={groupIndex}>
                                    {/* Date Divider */}
                                    <div className="flex items-center justify-center my-4">
                                        <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                            {group.date}
                                        </span>
                                    </div>

                                    {/* Messages */}
                                    {group.messages.map((message) => (
                                        <div key={message.id} className="mb-4 group">
                                            <div className="flex items-start space-x-3">
                                                {/* Sender Info */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                                                        {message.sender_name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                </div>

                                                {/* Message Content */}
                                                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{message.sender_name}</p>
                                                            <p className="text-xs text-gray-500">{formatTimestamp(message.created_at)}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteMessage(message.id)}
                                                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
                                                            title="Delete message"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Message Type */}
                                                    {message.is_deleted_for_everyone ? (
                                                        <p className="text-gray-500 italic">🚫 This message was deleted</p>
                                                    ) : message.message_type === 'text' ? (
                                                        <p className="text-gray-800">{message.message_text}</p>
                                                    ) : message.message_type === 'image' ? (
                                                        <div>
                                                            <img src={message.file_url} alt="Image" className="max-w-sm rounded-lg mb-2" />
                                                            <p className="text-xs text-gray-500">{message.file_name}</p>
                                                        </div>
                                                    ) : message.message_type === 'video' ? (
                                                        <div>
                                                            <video src={message.file_url} controls className="max-w-sm rounded-lg mb-2" />
                                                            <p className="text-xs text-gray-500">{message.file_name}</p>
                                                        </div>
                                                    ) : message.message_type === 'voice' ? (
                                                        <div>
                                                            <audio src={message.file_url} controls className="w-full max-w-sm" />
                                                            <p className="text-xs text-gray-500 mt-2">Voice message</p>
                                                        </div>
                                                    ) : message.message_type === 'file' ? (
                                                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                            </svg>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800">{message.file_name}</p>
                                                                <p className="text-xs text-gray-500">{Math.round(message.file_size / 1024)} KB</p>
                                                            </div>
                                                            <a
                                                                href={message.file_url}
                                                                download={message.file_name}
                                                                className="text-primary hover:text-primary/80"
                                                            >
                                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    ) : null}

                                                    {/* Edit indicator */}
                                                    {message.is_edited && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            Edited {message.edited_at && `at ${formatTimestamp(message.edited_at)}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {messages.length === 0 && user1 && user2 && !loading && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-gray-500 text-lg">No conversation found between these users</p>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminMessages;
