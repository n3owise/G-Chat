const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Generate JWT Token
const generateToken = (uid) => {
    return jwt.sign({ uid }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// @desc    Check if UID exists and password status
// @route   POST /api/auth/check-uid
// @access  Public
exports.checkUID = async (req, res) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Check if UID exists in database
        const [users] = await db.query(
            'SELECT uid, name, gender, city as place, email, phone, profile_image, gchat_password, gchat_status FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid User ID. Please contact support.',
                supportEmail: process.env.SUPPORT_EMAIL,
                supportPhone: process.env.SUPPORT_PHONE
            });
        }

        const user = users[0];

        // Check if account is banned/suspended
        if (user.gchat_status === 'banned' || user.gchat_status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Account suspended. Please contact support.',
                supportEmail: process.env.SUPPORT_EMAIL,
                supportPhone: process.env.SUPPORT_PHONE
            });
        }

        // Check if first-time user (no gchat_password set)
        if (!user.gchat_password) {
            return res.status(200).json({
                success: true,
                firstTimeUser: true,
                userData: {
                    uid: user.uid,
                    name: user.name,
                    gender: user.gender,
                    place: user.place,
                    email: user.email,
                    phone: user.phone,
                    profileImage: user.profile_image
                }
            });
        }

        // User has password, proceed to login
        return res.status(200).json({
            success: true,
            firstTimeUser: false,
            uid: user.uid
        });

    } catch (error) {
        console.error('Check UID error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { uid, password } = req.body;

        if (!uid || !password) {
            return res.status(400).json({ success: false, message: 'Please provide UID and password' });
        }

        // Get user with password
        const [users] = await db.query(
            'SELECT uid, name, gender, city as place, email, phone, profile_image, gchat_password, gchat_status FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check if account is banned/suspended
        if (user.gchat_status === 'banned' || user.gchat_status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Account suspended. Please contact support.',
                supportEmail: process.env.SUPPORT_EMAIL,
                supportPhone: process.env.SUPPORT_PHONE
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.gchat_password);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        // Generate token
        const token = generateToken(user.uid);

        // Create session (Update ip_address based on your server settings, usually req.ip)
        await db.query(
            'INSERT INTO gchat_sessions (uid, session_token, device_info) VALUES (?, ?, ?)',
            [user.uid, token, req.headers['user-agent']]
        );

        // Update last_seen and is_online
        await db.query(
            'UPDATE users SET last_seen = NOW(), is_online = TRUE WHERE uid = ?',
            [user.uid]
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                uid: user.uid,
                name: user.name,
                gender: user.gender,
                place: user.place,
                email: user.email,
                phone: user.phone,
                profileImage: user.profile_image
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// @desc    Signup (First-time password setup)
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
    try {
        const { uid, password } = req.body;

        if (!uid || !password) {
            return res.status(400).json({ success: false, message: 'UID and password are required' });
        }

        // Validate password
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters with 1 number and 1 special character'
            });
        }

        // Check if user exists and hasn't set password yet
        const [users] = await db.query(
            'SELECT uid, name, gender, city as place, phone, email, profile_image, gchat_password FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (users[0].gchat_password) {
            return res.status(400).json({ success: false, message: 'Account already registered. Please login.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user with password and registration date
        await db.query(
            'UPDATE users SET gchat_password = ?, gchat_registered_at = NOW(), gchat_status = "active" WHERE uid = ?',
            [hashedPassword, uid]
        );

        // Auto-create groups for this user (REMOVED)
        // await createUserGroups(uid);

        // Get updated user data
        const [updatedUser] = await db.query(
            'SELECT uid, name, gender, city as place, phone, email, profile_image FROM users WHERE uid = ?',
            [uid]
        );

        const user = updatedUser[0];

        // Generate token (Prompt 1.2 says no expiry: 100y, prompt below says 30d. I'll use 30d per specific Part 2 requirements)
        const token = generateToken(user.uid);

        // Create session
        await db.query(
            'INSERT INTO gchat_sessions (uid, session_token, ip_address, device_info) VALUES (?, ?, ?, ?)',
            [user.uid, token, req.ip, req.headers['user-agent']]
        );

        // Set online status
        await db.query(
            'UPDATE users SET last_seen = NOW(), is_online = TRUE WHERE uid = ?',
            [user.uid]
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                uid: user.uid,
                name: user.name,
                gender: user.gender,
                place: user.place,
                phone: user.phone,
                email: user.email,
                profileImage: user.profile_image
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// Helper function to create groups (REMOVED)
// async function createUserGroups(uid) {
//     console.log(`Groups will be created for user: ${uid}`);
// }

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        const { uid } = req.user;

        // Delete session
        await db.query(
            'DELETE FROM gchat_sessions WHERE uid = ?',
            [uid]
        );

        // Update online status
        await db.query(
            'UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE uid = ?',
            [uid]
        );

        res.status(200).json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const { uid } = req.user;

        const [users] = await db.query(
            'SELECT uid, name, gender, city as place, email, phone, profile_image, is_online, last_seen FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { uid } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters with 1 number and 1 special character' });
        }

        const [users] = await db.query('SELECT gchat_password FROM users WHERE uid = ?', [uid]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, users[0].gchat_password);
        if (!isValid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET gchat_password = ? WHERE uid = ?', [hashed, uid]);

        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
