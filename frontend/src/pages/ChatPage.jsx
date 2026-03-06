import { useState } from 'react';
import Header from '../components/common/Header';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';
import UserSearch from '../components/users/UserSearch';

const ChatPage = () => {
    const [activeTab, setActiveTab] = useState('chats');
    const [selectedUser, setSelectedUser] = useState(null);

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setActiveTab('chats');
    };

    const handleChatClick = (user) => {
        setSelectedUser(user);
    };

    const handleBackToList = () => {
        setSelectedUser(null);
    };

    // If a user is selected, show chat window
    if (selectedUser) {
        return <ChatWindow otherUser={selectedUser} onBack={handleBackToList} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="G-Chat" />

            <div className="flex bg-white shadow-sm border-b">
                <button
                    className={`flex-1 py-3 text-center font-medium ${activeTab === 'chats' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('chats')}
                >
                    💬 Chats
                </button>
                <button
                    className={`flex-1 py-3 text-center font-medium ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Users
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'chats' && (
                    <ChatList onChatClick={handleChatClick} />
                )}

                {activeTab === 'users' && (
                    <UserSearch onUserClick={handleUserClick} />
                )}
            </div>
        </div>
    );
};

export default ChatPage;
