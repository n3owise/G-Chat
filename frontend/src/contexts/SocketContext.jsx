import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext();

export const useSocket = () => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within SocketProvider');
    return ctx;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const offlineQueueRef = useRef([]); // messages queued while offline
    const { user, isAuthenticated } = useAuth();
    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const token = localStorage.getItem('gchat_token');
        const newSocket = io(SOCKET_URL, {
            auth: { token },
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            // Flush offline queue
            const queue = offlineQueueRef.current;
            if (queue.length) {
                queue.forEach(msg => newSocket.emit('send_message', msg));
                offlineQueueRef.current = [];
            }
        });

        newSocket.on('disconnect', () => setIsConnected(false));

        newSocket.on('connect_error', (err) => {
            console.warn('[Socket] connect_error:', err.message);
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
            setSocket(null);
            setIsConnected(false);
        };
    }, [isAuthenticated, user]);

    // Send via socket or queue if offline
    const sendMessage = (data) => {
        if (socket && isConnected) {
            socket.emit('send_message', data);
        } else {
            // Store in localStorage queue for persistence
            const stored = JSON.parse(localStorage.getItem('gchat_offline_queue') || '[]');
            stored.push(data);
            localStorage.setItem('gchat_offline_queue', JSON.stringify(stored));
            offlineQueueRef.current.push(data);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, sendMessage }}>
            {children}
        </SocketContext.Provider>
    );
};
