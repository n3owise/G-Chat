const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Allowed types ──────────────────────────────────────
const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const DOC_FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

// ─── Image storage ──────────────────────────────────────
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'gchat/images',
        resource_type: 'image',
        allowed_formats: IMAGE_FORMATS,
        transformation: [{ width: 1920, height: 1080, crop: 'limit', quality: 'auto' }],
    },
});

// ─── Video storage ──────────────────────────────────────
const videoStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'gchat/videos',
        resource_type: 'video',
        allowed_formats: VIDEO_FORMATS,
    },
});

// ─── Document storage ──────────────────────────────────
const documentStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'gchat/documents',
        resource_type: 'raw',
        public_id: `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    }),
});

// ─── Voice storage ────────────────────────────────────
const voiceStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'gchat/voice',
        resource_type: 'video', // audio is handled as video
        allowed_formats: ['mp3', 'wav', 'ogg', 'webm', 'm4a'],
    },
});

// ─── Multer instances ───────────────────────────────────
const uploadImage = multer({ storage: imageStorage, limits: { fileSize: MAX_SIZE } });
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: MAX_SIZE } });
const uploadDocument = multer({ storage: documentStorage, limits: { fileSize: MAX_SIZE } });
const uploadVoice = multer({ storage: voiceStorage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

module.exports = { cloudinary, uploadImage, uploadVideo, uploadDocument, uploadVoice };
