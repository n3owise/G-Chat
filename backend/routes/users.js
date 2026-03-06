const express = require('express');
const router = express.Router();
const {
    searchUsers,
    getAllUsers,
    getUserByUID,
    updateProfile,
    uploadProfilePicture,
    changePassword
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

router.get('/search', protect, searchUsers);
router.get('/all', protect, getAllUsers);
router.get('/:uid', protect, getUserByUID);
router.put('/profile', protect, updateProfile);
router.post('/upload-profile-picture', protect, uploadImage.single('profilePicture'), uploadProfilePicture);
router.put('/change-password', protect, changePassword);

module.exports = router;
