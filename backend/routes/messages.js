const express = require('express');
const router = express.Router();
const {
    getChatList,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    deleteForMe,
    deleteForEveryone,
    forwardMessage,
    sendImage,
    sendVideo,
    sendDocument,
    sendVoice,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { uploadImage, uploadVideo, uploadDocument, uploadVoice } = require('../config/cloudinary');

// Static routes first
router.get('/conversations', protect, getChatList);
router.post('/send', protect, sendMessage);
router.post('/forward', protect, forwardMessage);
router.post('/read', protect, markAsRead);

// File upload routes
router.post('/send-image', protect, uploadImage.single('image'), sendImage);
router.post('/send-video', protect, uploadVideo.single('video'), sendVideo);
router.post('/send-document', protect, uploadDocument.single('document'), sendDocument);
router.post('/send-voice', protect, uploadVoice.single('voice'), sendVoice);

// Message action routes
router.put('/:messageId/edit', protect, editMessage);
router.delete('/:messageId/delete-for-me', protect, deleteForMe);
router.delete('/:messageId/delete-for-everyone', protect, deleteForEveryone);

// Dynamic (must be last)
router.get('/:otherUID', protect, getMessages);

module.exports = router;
