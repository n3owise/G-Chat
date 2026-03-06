import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import { useSocket } from '../../contexts/SocketContext';

const formatTimestamp = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString())
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ChatList = ({ onChatClick }) => {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = useCallback(async () => {
        try {
            const res = await api.get('/messages/conversations');
            if (res.data.success) setChats(res.data.chats);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchChats(); }, [fetchChats]);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => fetchChats();
        socket.on('receive_message', refresh);
        socket.on('message_sent', refresh);
        return () => { socket.off('receive_message', refresh); socket.off('message_sent', refresh); };
    }, [socket, fetchChats]);

    if (loading) return <Loader text="Loading chats..." />;

    if (!chats.length) {
        return (
            <EmptyState
                icon="💬"
                title="No Chats Yet"
                description="Go to Contacts to find your team members and start a conversation."
                action={{ label: 'View Contacts', onClick: () => navigate('/contacts') }}
            />
        );
    }

    return (
        <div className="divide-y divide-gray-100 bg-white">
            {chats.map(chat => (
                <button
                    key={chat.user.uid}
                    onClick={() => onChatClick(chat.user)}
                    className="w-full flex items-center space-x-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition text-left"
                >
                    {/* Avatar with online dot */}
                    <div className="relative flex-shrink-0">
                        <Avatar user={chat.user} size="medium" />
                        {chat.user.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </div>

                    {/* Chat info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-semibold text-sm truncate ${chat.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                {chat.user.name}
                            </span>
                            <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                                {formatTimestamp(chat.lastMessage?.timestamp)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                                {chat.lastMessage?.isSentByMe && <span className="text-primary">You: </span>}
                                {chat.lastMessage?.text || 'No messages yet'}
                            </p>
                            {chat.unreadCount > 0 && (
                                <span className="ml-2 min-w-[20px] h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 flex-shrink-0">
                                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default ChatList;
