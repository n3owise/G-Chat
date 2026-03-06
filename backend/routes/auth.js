const express = require('express');
const router = express.Router();
const { checkUID, login, signup, logout, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/check-uid', checkUID);
router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
