const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const server = http.createServer(app);
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socketIo(server, {
    cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'G-Chat API is running!' });
});

// ─────────────────────────────────────────────
// Socket.io — Online Presence Map
// ─────────────────────────────────────────────
const onlineUsers = new Map(); // uid → socketId
const db = require('./config/database');

// Helper: can senderUID message receiverUID?
// Simplification: Any user can message any user
async function canMessage(senderUID, receiverUID) {
    return true;
}

// ─────────────────────────────────────────────
// Socket.io — JWT Authentication Middleware
// ─────────────────────────────────────────────
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.uid = decoded.uid;
        next();
    } catch {
        next(new Error('Invalid token'));
    }
});

// ─────────────────────────────────────────────
// Socket.io — Connection Handler
// ─────────────────────────────────────────────
io.on('connection', async (socket) => {
    const uid = socket.uid;
    console.log(`[Socket] ${uid} connected (${socket.id})`);

    // Register user
    onlineUsers.set(uid, socket.id);
    socket.join(uid);

    // Update DB
    try {
        await db.query('UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE uid = ?', [uid]);
    } catch (e) { console.error('DB online update error:', e.message); }

    // Broadcast online
    io.emit('user_online', { uid, isOnline: true });

    // ── Send Message ────────────────────────────
    socket.on('send_message', async (data) => {
        const { receiver_uid, content, message_type = 'text', temp_id } = data;
        if (!receiver_uid || !content?.trim()) return;

        try {
            const allowed = await canMessage(uid, receiver_uid);
            if (!allowed) {
                return socket.emit('error', { message: 'Not allowed to message this user' });
            }

            const messageId = uuidv4();
            const now = new Date();
            const deadline = new Date(now.getTime() + 5 * 60 * 1000);
            const receiverOnline = onlineUsers.has(receiver_uid);

            await db.query(`
        INSERT INTO gchat_messages
          (message_id, sender_uid, receiver_uid, message_type, message_text, edit_deadline, delete_deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [messageId, uid, receiver_uid, message_type, content.trim(), deadline, deadline]);

            await db.query(
                'INSERT INTO gchat_message_status (message_id, is_delivered) VALUES (?, ?)',
                [messageId, receiverOnline ? 1 : 0]
            );

            if (receiverOnline) {
                await db.query(
                    'UPDATE gchat_message_status SET delivered_at = NOW() WHERE message_id = ?',
                    [messageId]
                );
            }

            const [rows] = await db.query(`
        SELECT m.*, ms.is_delivered, ms.is_read, ms.delivered_at, ms.read_at
        FROM gchat_messages m
        LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
        WHERE m.message_id = ?
      `, [messageId]);

            const message = rows[0];

            // Emit to receiver
            if (receiverOnline) {
                io.to(receiver_uid).emit('receive_message', message);
            }

            // Confirm to sender (replace temp_id)
            socket.emit('message_sent', { ...message, temp_id });
        } catch (err) {
            console.error('[Socket] send_message error:', err.message);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // ── Mark as Read ────────────────────────────
    socket.on('message_read', async ({ message_id, sender_uid }) => {
        try {
            await db.query(
                'UPDATE gchat_message_status SET is_read = 1, read_at = NOW() WHERE message_id = ?',
                [message_id]
            );
            // Notify sender
            if (sender_uid && onlineUsers.has(sender_uid)) {
                io.to(sender_uid).emit('message_status_update', {
                    message_id,
                    is_read: true,
                    read_at: new Date()
                });
            }
        } catch (err) { console.error('[Socket] message_read error:', err.message); }
    });

    // ── Typing Indicators ───────────────────────
    socket.on('typing', ({ receiver_uid, is_typing }) => {
        if (receiver_uid && onlineUsers.has(receiver_uid)) {
            io.to(receiver_uid).emit('user_typing', { sender_uid: uid, is_typing });
        }
    });

    // ── Disconnect ──────────────────────────────
    socket.on('disconnect', async () => {
        console.log(`[Socket] ${uid} disconnected`);
        onlineUsers.delete(uid);

        try {
            await db.query('UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE uid = ?', [uid]);
        } catch (e) { console.error('DB offline update error:', e.message); }

        io.emit('user_online', { uid, isOnline: false });
    });
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`[Server] G-Chat running on port ${PORT}`);
});
