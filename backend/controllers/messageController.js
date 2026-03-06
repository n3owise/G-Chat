const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Permission helper: can sender message receiver?
async function canMessage(senderUID, receiverUID) {
    // Check if receiver is a direct downline of sender
    const [senderRow] = await db.query(
        'SELECT left_uid, center_uid, right_uid, parent_id, sponser_id FROM users WHERE uid = ?',
        [senderUID]
    );
    if (!senderRow.length) return false;
    const { left_uid, center_uid, right_uid, parent_id, sponser_id } = senderRow[0];

    // Sender can message their direct downline
    if ([left_uid, center_uid, right_uid].includes(receiverUID)) return true;

    // Receiver can reply if sender is their upline (parent or sponsor)
    const [receiverRow] = await db.query(
        'SELECT parent_id, sponser_id FROM users WHERE uid = ?',
        [receiverUID]
    );
    if (!receiverRow.length) return false;
    if ([receiverRow[0].parent_id, receiverRow[0].sponser_id].includes(senderUID)) return true;

    // Also allow if a prior conversation already exists (both parties can reply once initiated)
    const [existing] = await db.query(
        `SELECT COUNT(*) as cnt FROM gchat_messages
     WHERE (sender_uid = ? AND receiver_uid = ?) OR (sender_uid = ? AND receiver_uid = ?)`,
        [senderUID, receiverUID, receiverUID, senderUID]
    );
    return existing[0].cnt > 0;
}

// @desc    Get all conversations for logged-in user
// @route   GET /api/messages/conversations
// @access  Private
exports.getChatList = async (req, res) => {
    try {
        const { uid } = req.user;

        const [rows] = await db.query(`
      SELECT DISTINCT
        CASE WHEN sender_uid = ? THEN receiver_uid ELSE sender_uid END AS other_uid
      FROM gchat_messages
      WHERE (sender_uid = ? OR receiver_uid = ?)
        AND is_deleted_for_everyone = FALSE
        AND (
          (sender_uid = ? AND is_deleted_by_sender = FALSE) OR
          (receiver_uid = ? AND is_deleted_by_receiver = FALSE)
        )
    `, [uid, uid, uid, uid, uid]);

        const chatList = [];

        for (const row of rows) {
            const otherUID = row.other_uid;

            const [users] = await db.query(
                'SELECT uid, name, profile_image, is_online, last_seen FROM users WHERE uid = ?',
                [otherUID]
            );
            if (!users.length) continue;

            const [lastMsgs] = await db.query(`
        SELECT message_text, message_type, created_at, sender_uid
        FROM gchat_messages
        WHERE ((sender_uid = ? AND receiver_uid = ?) OR (sender_uid = ? AND receiver_uid = ?))
          AND is_deleted_for_everyone = FALSE
        ORDER BY created_at DESC LIMIT 1
      `, [uid, otherUID, otherUID, uid]);

            const [unreadRes] = await db.query(`
        SELECT COUNT(*) AS cnt
        FROM gchat_messages m
        LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
        WHERE m.sender_uid = ? AND m.receiver_uid = ?
          AND (ms.is_read = 0 OR ms.is_read IS NULL)
          AND m.is_deleted_for_everyone = FALSE
      `, [otherUID, uid]);

            const last = lastMsgs[0] || null;
            chatList.push({
                user: users[0],
                lastMessage: last ? {
                    text: last.message_type === 'text' ? last.message_text : `📎 ${last.message_type}`,
                    timestamp: last.created_at,
                    isSentByMe: last.sender_uid === uid
                } : null,
                unreadCount: parseInt(unreadRes[0].cnt)
            });
        }

        chatList.sort((a, b) => {
            const ta = a.lastMessage ? new Date(a.lastMessage.timestamp) : 0;
            const tb = b.lastMessage ? new Date(b.lastMessage.timestamp) : 0;
            return tb - ta;
        });

        res.json({ success: true, chats: chatList });
    } catch (err) {
        console.error('getChatList error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get messages between two users
// @route   GET /api/messages/:otherUID
// @access  Private
exports.getMessages = async (req, res) => {
    try {
        const { uid } = req.user;
        const { otherUID } = req.params;
        const limit = parseInt(req.query.limit) || 60;
        const offset = parseInt(req.query.offset) || 0;

        const [messages] = await db.query(`
      SELECT
        m.message_id, m.sender_uid, m.receiver_uid, m.message_type,
        m.message_text, m.file_url, m.file_name, m.file_size,
        m.is_edited, m.edit_deadline, m.is_deleted_for_everyone, m.created_at,
        ms.is_delivered, ms.is_read, ms.delivered_at, ms.read_at
      FROM gchat_messages m
      LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
      WHERE ((m.sender_uid = ? AND m.receiver_uid = ?) OR (m.sender_uid = ? AND m.receiver_uid = ?))
        AND m.is_deleted_for_everyone = FALSE
        AND (
          (m.sender_uid = ? AND m.is_deleted_by_sender = FALSE) OR
          (m.receiver_uid = ? AND m.is_deleted_by_receiver = FALSE)
        )
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `, [uid, otherUID, otherUID, uid, uid, uid, limit, offset]);

        // Mark received messages as delivered
        const undelivered = messages
            .filter(m => m.receiver_uid === uid && !m.is_delivered)
            .map(m => m.message_id);

        if (undelivered.length) {
            await db.query(
                `UPDATE gchat_message_status ms
         JOIN gchat_messages m ON ms.message_id = m.message_id
         SET ms.is_delivered = 1, ms.delivered_at = NOW()
         WHERE ms.message_id IN (?) AND m.receiver_uid = ?`,
                [undelivered, uid]
            );
        }

        res.json({ success: true, messages });
    } catch (err) {
        console.error('getMessages error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Send a text message via REST (fallback; socket is primary)
// @route   POST /api/messages/send
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { uid: senderUID } = req.user;
        const { receiverUID, messageText } = req.body;

        if (!receiverUID || !messageText?.trim()) {
            return res.status(400).json({ success: false, message: 'receiverUID and messageText required' });
        }

        const allowed = await canMessage(senderUID, receiverUID);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'You are not allowed to message this user' });
        }

        const messageId = uuidv4();
        const now = new Date();
        const deadline = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

        await db.query(`
      INSERT INTO gchat_messages
        (message_id, sender_uid, receiver_uid, message_type, message_text, edit_deadline, delete_deadline)
      VALUES (?, ?, ?, 'text', ?, ?, ?)
    `, [messageId, senderUID, receiverUID, messageText.trim(), deadline, deadline]);

        await db.query(
            `INSERT INTO gchat_message_status (message_id) VALUES (?)`,
            [messageId]
        );

        const [rows] = await db.query(`
      SELECT m.*, ms.is_delivered, ms.is_read
      FROM gchat_messages m
      LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
      WHERE m.message_id = ?
    `, [messageId]);

        const message = rows[0];

        // Emit via socket
        const io = req.app.get('io');
        if (io) {
            io.to(receiverUID).emit('receive_message', message);
            io.to(senderUID).emit('message_sent', { ...message, temp_id: req.body.temp_id });
        }

        res.status(201).json({ success: true, message });
    } catch (err) {
        console.error('sendMessage error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Mark messages as read
// @route   POST /api/messages/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const { uid } = req.user;
        const { messageIds } = req.body;

        if (!Array.isArray(messageIds) || !messageIds.length) {
            return res.status(400).json({ success: false, message: 'messageIds[] required' });
        }

        await db.query(`
      UPDATE gchat_message_status ms
      JOIN gchat_messages m ON ms.message_id = m.message_id
      SET ms.is_read = 1, ms.read_at = NOW(), ms.is_delivered = 1
      WHERE ms.message_id IN (?) AND m.receiver_uid = ?
    `, [messageIds, uid]);

        const io = req.app.get('io');
        if (io) {
            messageIds.forEach(id => io.emit('message_status_update', { message_id: id, is_read: true }));
        }

        res.json({ success: true });
    } catch (err) {
        console.error('markAsRead error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// @desc    Edit a message (within 5 minutes)
// @route   PUT /api/messages/:messageId/edit
// @access  Private
exports.editMessage = async (req, res) => {
    try {
        const { uid } = req.user;
        const { messageId } = req.params;
        const { newText } = req.body;

        if (!newText?.trim()) {
            return res.status(400).json({ success: false, message: 'Message text required' });
        }

        const [rows] = await db.query(
            'SELECT sender_uid, receiver_uid, edit_deadline FROM gchat_messages WHERE message_id = ?',
            [messageId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
        const msg = rows[0];

        if (msg.sender_uid !== uid) {
            return res.status(403).json({ success: false, message: 'You can only edit your own messages' });
        }

        if (msg.edit_deadline && new Date() > new Date(msg.edit_deadline)) {
            return res.status(403).json({ success: false, message: 'Edit window has expired (5 minutes)' });
        }

        await db.query(
            'UPDATE gchat_messages SET message_text = ?, is_edited = 1, edited_at = NOW() WHERE message_id = ?',
            [newText.trim(), messageId]
        );

        const [updated] = await db.query(`
            SELECT m.*, ms.is_delivered, ms.is_read
            FROM gchat_messages m
            LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
            WHERE m.message_id = ?
        `, [messageId]);

        const updatedMsg = updated[0];
        const io = req.app.get('io');
        if (io) {
            io.to(msg.receiver_uid).emit('message_edited', updatedMsg);
            io.to(uid).emit('message_edited', updatedMsg);
        }

        res.json({ success: true, message: updatedMsg });
    } catch (err) {
        console.error('editMessage error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete message for current user only
// @route   DELETE /api/messages/:messageId/delete-for-me
// @access  Private
exports.deleteForMe = async (req, res) => {
    try {
        const { uid } = req.user;
        const { messageId } = req.params;

        const [rows] = await db.query(
            'SELECT sender_uid, receiver_uid FROM gchat_messages WHERE message_id = ?',
            [messageId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
        const msg = rows[0];

        if (msg.sender_uid === uid) {
            await db.query('UPDATE gchat_messages SET is_deleted_by_sender = 1 WHERE message_id = ?', [messageId]);
        } else if (msg.receiver_uid === uid) {
            await db.query('UPDATE gchat_messages SET is_deleted_by_receiver = 1 WHERE message_id = ?', [messageId]);
        } else {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        res.json({ success: true, messageId });
    } catch (err) {
        console.error('deleteForMe error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete message for everyone (within 5 minutes)
// @route   DELETE /api/messages/:messageId/delete-for-everyone
// @access  Private
exports.deleteForEveryone = async (req, res) => {
    try {
        const { uid } = req.user;
        const { messageId } = req.params;

        const [rows] = await db.query(
            'SELECT sender_uid, receiver_uid, delete_deadline FROM gchat_messages WHERE message_id = ?',
            [messageId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Message not found' });
        const msg = rows[0];

        if (msg.sender_uid !== uid) {
            return res.status(403).json({ success: false, message: 'You can only delete your own messages for everyone' });
        }

        if (msg.delete_deadline && new Date() > new Date(msg.delete_deadline)) {
            return res.status(403).json({ success: false, message: 'Delete window has expired (5 minutes)' });
        }

        await db.query(
            'UPDATE gchat_messages SET is_deleted_for_everyone = 1 WHERE message_id = ?',
            [messageId]
        );

        const io = req.app.get('io');
        if (io) {
            io.to(msg.receiver_uid).emit('message_deleted_for_everyone', { message_id: messageId });
            io.to(uid).emit('message_deleted_for_everyone', { message_id: messageId });
        }

        res.json({ success: true, messageId });
    } catch (err) {
        console.error('deleteForEveryone error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Forward a message to one or more users
// @route   POST /api/messages/forward
// @access  Private
exports.forwardMessage = async (req, res) => {
    try {
        const { uid: senderUID } = req.user;
        const { messageId, receiverUIDs } = req.body;

        if (!messageId || !Array.isArray(receiverUIDs) || !receiverUIDs.length) {
            return res.status(400).json({ success: false, message: 'messageId and receiverUIDs[] required' });
        }
        if (receiverUIDs.length > 5) {
            return res.status(400).json({ success: false, message: 'Maximum 5 recipients for forwarding' });
        }

        const [origRows] = await db.query(
            'SELECT message_text, message_type, file_url, file_name FROM gchat_messages WHERE message_id = ?',
            [messageId]
        );
        if (!origRows.length) return res.status(404).json({ success: false, message: 'Message not found' });
        const orig = origRows[0];

        const forwardedMessages = [];
        const io = req.app.get('io');

        for (const receiverUID of receiverUIDs) {
            const [rec] = await db.query('SELECT uid FROM users WHERE uid = ?', [receiverUID]);
            if (!rec.length) continue;

            const newId = uuidv4();
            const now = new Date();
            const deadline = new Date(now.getTime() + 5 * 60 * 1000);

            await db.query(`
                INSERT INTO gchat_messages
                  (message_id, sender_uid, receiver_uid, message_type, message_text,
                   file_url, file_name, is_forwarded, edit_deadline, delete_deadline)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `, [newId, senderUID, receiverUID, orig.message_type, orig.message_text,
                orig.file_url || null, orig.file_name || null, deadline, deadline]);

            await db.query('INSERT INTO gchat_message_status (message_id) VALUES (?)', [newId]);

            const [newRows] = await db.query(`
                SELECT m.*, ms.is_delivered, ms.is_read
                FROM gchat_messages m
                LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
                WHERE m.message_id = ?
            `, [newId]);

            const newMsg = newRows[0];
            forwardedMessages.push(newMsg);

            if (io) io.to(receiverUID).emit('receive_message', newMsg);
        }

        res.status(201).json({ success: true, count: forwardedMessages.length, messages: forwardedMessages });
    } catch (err) {
        console.error('forwardMessage error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = exports;


// ─── Shared file-send helper ─────────────────────────────
async function sendFileMessage(req, res, messageType) {
    try {
        const { uid: senderUID } = req.user;
        const { receiverUID } = req.body;

        if (!receiverUID) return res.status(400).json({ success: false, message: 'receiverUID required' });
        if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

        const [receivers] = await db.query('SELECT uid FROM users WHERE uid = ?', [receiverUID]);
        if (!receivers.length) return res.status(404).json({ success: false, message: 'Receiver not found' });

        const messageId = uuidv4();
        const now = new Date();
        const deadline = new Date(now.getTime() + 5 * 60 * 1000);

        // Cloudinary stores path/secure_url differently across versions
        const fileUrl = req.file.path || req.file.secure_url || req.file.url;
        const fileName = req.file.originalname || req.file.filename;
        const fileSize = req.file.size || 0;
        const fileType = req.file.mimetype || messageType;
        const publicId = req.file.filename || req.file.public_id;

        await db.query(`
            INSERT INTO gchat_messages
              (message_id, sender_uid, receiver_uid, message_type, file_url, file_name, file_size, file_type, cloudinary_public_id, edit_deadline, delete_deadline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [messageId, senderUID, receiverUID, messageType, fileUrl, fileName, fileSize, fileType, publicId, deadline, deadline]);

        await db.query('INSERT INTO gchat_message_status (message_id) VALUES (?)', [messageId]);

        const [rows] = await db.query(`
            SELECT m.*, ms.is_delivered, ms.is_read
            FROM gchat_messages m
            LEFT JOIN gchat_message_status ms ON m.message_id = ms.message_id
            WHERE m.message_id = ?
        `, [messageId]);

        const message = rows[0];
        const io = req.app.get('io');
        if (io) {
            io.to(receiverUID).emit('receive_message', message);
            io.to(senderUID).emit('message_sent', message);
        }

        res.status(201).json({ success: true, message });
    } catch (err) {
        console.error(`send${messageType}Error:`, err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

exports.sendImage = (req, res) => sendFileMessage(req, res, 'image');
exports.sendVideo = (req, res) => sendFileMessage(req, res, 'video');
exports.sendDocument = (req, res) => sendFileMessage(req, res, 'file');
exports.sendVoice = (req, res) => sendFileMessage(req, res, 'voice');

