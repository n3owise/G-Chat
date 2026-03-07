import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext();

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within SocketProvider');
    return ctx;
};

export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const { user, isAuthenticated } = useAuth();
    const [messages, setMessages] = useState([]); // Buffer for real-time messages

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // 1. Subscribe to real-time messages
        const channel = supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Real-time message received:', payload.new);
                    setMessages(prev => [...prev, payload.new]);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                } else {
                    setIsConnected(false);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            setIsConnected(false);
        };
    }, [isAuthenticated, user]);

    // Send via Supabase Client (Inserts into DB, triggers Realtime for receiver)
    const sendMessage = async (data) => {
        const { receiver_id, content, message_type = 'text' } = data;

        const { error } = await supabase
            .from('messages')
            .insert([
                {
                    sender_id: user.id,
                    receiver_id,
                    content,
                    message_type
                }
            ]);

        if (error) {
            console.error('Error sending message:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    return (
        <SocketContext.Provider value={{ isConnected, sendMessage, messages }}>
            {children}
        </SocketContext.Provider>
    );
};
