const db = require('../config/database');
const bcrypt = require('bcryptjs'); // consistently using bcryptjs
const jwt = require('jsonwebtoken');

// Generate JWT for admin
const generateAdminToken = (username) => {
    return jwt.sign({ username, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        // Get admin user
        const [admins] = await db.query(
            'SELECT * FROM gchat_admins WHERE username = ?',
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const admin = admins[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate token
        const tokenExpiry = rememberMe ? '7d' : '1h';
        const token = jwt.sign(
            { username: admin.username, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

        // Update last login
        await db.query(
            'UPDATE gchat_admins SET last_login = NOW() WHERE id = ?',
            [admin.id]
        );

        res.status(200).json({
            success: true,
            token,
            admin: {
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
    try {
        // Total users
        const [totalUsers] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE gchat_password IS NOT NULL'
        );

        // Active users (online now)
        const [activeUsers] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE is_online = TRUE'
        );

        // Total messages
        const [totalMessages] = await db.query(
            'SELECT COUNT(*) as count FROM gchat_messages WHERE is_deleted_for_everyone = FALSE'
        );

        // Messages today
        const [messagesToday] = await db.query(
            'SELECT COUNT(*) as count FROM gchat_messages WHERE DATE(created_at) = CURDATE()'
        );

        // New users today
        const [newUsersToday] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE DATE(gchat_registered_at) = CURDATE()'
        );

        // Messages this week
        const [messagesThisWeek] = await db.query(
            'SELECT COUNT(*) as count FROM gchat_messages WHERE YEARWEEK(created_at) = YEARWEEK(NOW())'
        );

        // Recent users (last 10 registered)
        const [recentUsers] = await db.query(`
      SELECT uid, name, gchat_registered_at, is_online
      FROM users 
      WHERE gchat_password IS NOT NULL
      ORDER BY gchat_registered_at DESC 
      LIMIT 10
    `);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers: totalUsers[0].count,
                activeUsers: activeUsers[0].count,
                totalMessages: totalMessages[0].count,
                messagesToday: messagesToday[0].count,
                newUsersToday: newUsersToday[0].count,
                messagesThisWeek: messagesThisWeek[0].count,
                recentUsers
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all users (with pagination, search, filter)
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsersAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const status = req.query.status || 'all'; // all, active, banned

        let query = `
      SELECT 
        uid, name, gender, city as place, email, phone, 
        profile_image, gchat_status, gchat_registered_at, 
        is_online, last_seen
      FROM users 
      WHERE gchat_password IS NOT NULL
    `;

        const params = [];

        // Search filter
        if (search) {
            query += ` AND (uid LIKE ? OR name LIKE ? OR email LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Status filter
        if (status !== 'all') {
            query += ` AND gchat_status = ?`;
            params.push(status);
        }

        // Get total count
        const countQuery = query.replace('SELECT uid, name,', 'SELECT COUNT(*) as total FROM (SELECT uid,') + ') as subquery';
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Add pagination
        query += ` ORDER BY gchat_registered_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [users] = await db.query(query, params);

        res.status(200).json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get all users admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get user details with stats
// @route   GET /api/admin/users/:uid
// @access  Private (Admin)
exports.getUserDetailsAdmin = async (req, res) => {
    try {
        const { uid } = req.params;

        // Get user info
        const [users] = await db.query(
            'SELECT * FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // Get message stats
        const [sentMessages] = await db.query(
            'SELECT COUNT(*) as count FROM gchat_messages WHERE sender_uid = ?',
            [uid]
        );

        const [receivedMessages] = await db.query(
            'SELECT COUNT(*) as count FROM gchat_messages WHERE receiver_uid = ?',
            [uid]
        );

        res.status(200).json({
            success: true,
            user: {
                ...user,
                place: user.city,
                messagesSent: sentMessages[0].count,
                messagesReceived: receivedMessages[0].count
            }
        });

    } catch (error) {
        console.error('Get user details admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:uid
// @access  Private (Admin)
exports.updateUserAdmin = async (req, res) => {
    try {
        const { uid } = req.params;
        const { name, email, phone } = req.body;

        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }

        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email || null);
        }

        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(uid);

        await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE uid = ?`,
            values
        );

        res.status(200).json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('Update user admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reset user password (admin)
// @route   POST /api/admin/users/:uid/reset-password
// @access  Private (Admin)
exports.resetUserPassword = async (req, res) => {
    try {
        const { uid } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'New password required' });
        }

        // Validate password
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters with 1 number and 1 special character'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await db.query(
            'UPDATE users SET gchat_password = ? WHERE uid = ?',
            [hashedPassword, uid]
        );

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Ban/Unban user
// @route   PUT /api/admin/users/:uid/ban
// @access  Private (Admin)
exports.toggleUserBan = async (req, res) => {
    try {
        const { uid } = req.params;
        const { action } = req.body; // 'ban' or 'unban'

        const status = action === 'ban' ? 'banned' : 'active';

        await db.query(
            'UPDATE users SET gchat_status = ? WHERE uid = ?',
            [status, uid]
        );

        res.status(200).json({
            success: true,
            message: `User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`
        });

    } catch (error) {
        console.error('Toggle ban error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get conversation between two users
// @route   GET /api/admin/messages/:uid1/:uid2
// @access  Private (Admin)
exports.getConversation = async (req, res) => {
    try {
        const { uid1, uid2 } = req.params;

        const [messages] = await db.query(`
      SELECT 
        m.*,
        u1.name as sender_name,
        u2.name as receiver_name
      FROM gchat_messages m
      LEFT JOIN users u1 ON m.sender_uid = u1.uid
      LEFT JOIN users u2 ON m.receiver_uid = u2.uid
      WHERE (m.sender_uid = ? AND m.receiver_uid = ?) 
         OR (m.sender_uid = ? AND m.receiver_uid = ?)
      ORDER BY m.created_at ASC
    `, [uid1, uid2, uid2, uid1]);

        res.status(200).json({
            success: true,
            messages
        });

    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete message (admin)
// @route   DELETE /api/admin/messages/:messageId
// @access  Private (Admin)
exports.deleteMessageAdmin = async (req, res) => {
    try {
        const { messageId } = req.params;

        await db.query(
            'UPDATE gchat_messages SET is_deleted_for_everyone = TRUE, deleted_at = NOW() WHERE id = ?',
            [messageId]
        );

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        console.error('Delete message admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add new user (admin)
// @route   POST /api/admin/users/add
// @access  Private (Admin)
exports.addUserAdmin = async (req, res) => {
    try {
        const { uid, name, gender, place, email, phone } = req.body;

        if (!uid || !name) {
            return res.status(400).json({ success: false, message: 'UID and name are required' });
        }

        // Check if UID already exists
        const [existing] = await db.query('SELECT uid FROM users WHERE uid = ?', [uid]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'User ID already exists' });
        }

        // Generate temporary password
        const tempPassword = 'Temp@' + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Insert user
        await db.query(`
      INSERT INTO users 
      (uid, name, gender, city, email, phone, gchat_password, gchat_registered_at, gchat_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'active')
    `, [uid, name, gender, place, email, phone, hashedPassword]);

        res.status(201).json({
            success: true,
            message: 'User added successfully',
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('Add user admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get message statistics
// @route   GET /api/admin/message-stats
// @access  Private (Admin)
exports.getMessageStats = async (req, res) => {
    try {
        // Message type breakdown
        const [typeBreakdown] = await db.query(`
      SELECT 
        message_type,
        COUNT(*) as count
      FROM gchat_messages
      WHERE is_deleted_for_everyone = FALSE
      GROUP BY message_type
    `);

        // Most active users
        const [activeUsers] = await db.query(`
      SELECT 
        u.uid,
        u.name,
        COUNT(m.id) as message_count
      FROM users u
      LEFT JOIN gchat_messages m ON u.uid = m.sender_uid
      WHERE u.gchat_password IS NOT NULL
      GROUP BY u.uid, u.name
      ORDER BY message_count DESC
      LIMIT 10
    `);

        // Daily message trend (last 7 days)
        const [dailyTrend] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM gchat_messages
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

        res.status(200).json({
            success: true,
            stats: {
                typeBreakdown,
                activeUsers,
                dailyTrend
            }
        });

    } catch (error) {
        console.error('Get message stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get support settings
// @route   GET /api/admin/support-settings
// @access  Private (Admin)
exports.getSupportSettings = async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM gchat_support_info LIMIT 1');

        res.status(200).json({
            success: true,
            settings: settings[0] || { support_email: '', support_phone: '' }
        });

    } catch (error) {
        console.error('Get support settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update support settings
// @route   PUT /api/admin/support-settings
// @access  Private (Admin)
exports.updateSupportSettings = async (req, res) => {
    try {
        const { support_email, support_phone } = req.body;

        // Check if settings exist
        const [existing] = await db.query('SELECT id FROM gchat_support_info LIMIT 1');

        if (existing.length > 0) {
            // Update existing
            await db.query(
                'UPDATE gchat_support_info SET support_email = ?, support_phone = ? WHERE id = ?',
                [support_email, support_phone, existing[0].id]
            );
        } else {
            // Insert new
            await db.query(
                'INSERT INTO gchat_support_info (support_email, support_phone) VALUES (?, ?)',
                [support_email, support_phone]
            );
        }

        res.status(200).json({
            success: true,
            message: 'Support settings updated successfully'
        });

    } catch (error) {
        console.error('Update support settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Export all functions
module.exports = exports;
