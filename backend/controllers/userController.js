const db = require('../config/database');
const bcrypt = require('bcryptjs'); // Using bcryptjs as we have been earlier
const { cloudinary } = require('../config/cloudinary');

// @desc    Search users by UID or name
// @route   GET /api/users/search?q=searchTerm
// @access  Private
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const { uid: currentUserUID } = req.user;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Search term required' });
        }

        const searchTerm = `%${q.trim()}%`;

        // Search by UID or name
        const [users] = await db.query(`
      SELECT 
        uid, 
        name, 
        gender,
        city as place,
        email, 
        phone, 
        profile_image, 
        is_online, 
        last_seen 
      FROM users 
      WHERE (uid LIKE ? OR name LIKE ?) 
        AND uid != ?
        AND gchat_password IS NOT NULL
      LIMIT 50
    `, [searchTerm, searchTerm, currentUserUID]);

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all users (with pagination)
// @route   GET /api/users/all
// @access  Private
exports.getAllUsers = async (req, res) => {
    try {
        const { uid: currentUserUID } = req.user;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        // Get all users except current user
        const [users] = await db.query(`
      SELECT 
        uid, 
        name, 
        gender,
        city as place,
        email, 
        phone, 
        profile_image, 
        is_online, 
        last_seen 
      FROM users 
      WHERE uid != ? 
        AND gchat_password IS NOT NULL
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `, [currentUserUID, limit, offset]);

        // Get total count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM users WHERE uid != ? AND gchat_password IS NOT NULL',
            [currentUserUID]
        );

        res.status(200).json({
            success: true,
            count: users.length,
            total: countResult[0].total,
            users
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get user details by UID
// @route   GET /api/users/:uid
// @access  Private
exports.getUserByUID = async (req, res) => {
    try {
        const { uid } = req.params;

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
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { uid } = req.user;
        const { name, email, phone } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name && name.trim()) {
            updates.push('name = ?');
            values.push(name.trim());
        }

        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email?.trim() || null);
        }

        if (phone !== undefined) {
            updates.push('phone = ?');
            values.push(phone?.trim() || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(uid);

        await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE uid = ?`,
            values
        );

        // Get updated user
        const [users] = await db.query(
            'SELECT uid, name, gender, city as place, email, phone, profile_image, is_online, last_seen FROM users WHERE uid = ?',
            [uid]
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: users[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Upload profile picture
// @route   POST /api/users/upload-profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
    try {
        const { uid } = req.user;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        // Delete old profile picture from Cloudinary if exists
        const [users] = await db.query(
            'SELECT profile_image FROM users WHERE uid = ?',
            [uid]
        );

        if (users[0]?.profile_image) {
            try {
                // Extract public_id from Cloudinary URL
                const urlParts = users[0].profile_image.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = `gchat/images/${filename.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error('Error deleting old image:', err);
            }
        }

        // Update profile image URL
        await db.query(
            'UPDATE users SET profile_image = ? WHERE uid = ?',
            [req.file.path, uid]
        );

        res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully',
            profileImage: req.file.path
        });

    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { uid } = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters with 1 number and 1 special character'
            });
        }

        // Get current password from database
        const [users] = await db.query(
            'SELECT gchat_password FROM users WHERE uid = ?',
            [uid]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, users[0].gchat_password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await db.query(
            'UPDATE users SET gchat_password = ? WHERE uid = ?',
            [hashedPassword, uid]
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    searchUsers: exports.searchUsers,
    getAllUsers: exports.getAllUsers,
    getUserByUID: exports.getUserByUID,
    updateProfile: exports.updateProfile,
    uploadProfilePicture: exports.uploadProfilePicture,
    changePassword: exports.changePassword
};
