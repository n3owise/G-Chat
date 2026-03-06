const express = require('express');
const router = express.Router();
const {
    adminLogin,
    getDashboardStats,
    getAllUsersAdmin,
    getUserDetailsAdmin,
    updateUserAdmin,
    resetUserPassword,
    toggleUserBan,
    getConversation,
    deleteMessageAdmin,
    addUserAdmin,
    getMessageStats,
    getSupportSettings,
    updateSupportSettings
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminAuth');

// Public routes
router.post('/login', adminLogin);

// Protected admin routes
router.get('/dashboard', protectAdmin, getDashboardStats);
router.get('/users', protectAdmin, getAllUsersAdmin);
router.get('/users/:uid', protectAdmin, getUserDetailsAdmin);
router.put('/users/:uid', protectAdmin, updateUserAdmin);
router.post('/users/:uid/reset-password', protectAdmin, resetUserPassword);
router.put('/users/:uid/ban', protectAdmin, toggleUserBan);
router.post('/users/add', protectAdmin, addUserAdmin);
router.get('/messages/:uid1/:uid2', protectAdmin, getConversation);
router.delete('/messages/:messageId', protectAdmin, deleteMessageAdmin);
router.get('/message-stats', protectAdmin, getMessageStats);
router.get('/support-settings', protectAdmin, getSupportSettings);
router.put('/support-settings', protectAdmin, updateSupportSettings);

module.exports = router;
