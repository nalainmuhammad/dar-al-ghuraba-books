/* ============================================================
   Dar Al Ghuraba Books — Image Upload Routes (Cloudinary)
   ============================================================
   POST /api/upload/image — Admin only: upload image to Cloudinary
   ============================================================ */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');

// Configure multer for memory storage (we stream to Cloudinary, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, WebP, GIF, or AVIF.`), false);
    }
  },
});

/* ─── POST /api/upload/image — Upload to Cloudinary ────── */
router.post(
  '/image',
  protect,
  adminOnly,
  (req, res, next) => {
    // Check Cloudinary is configured before attempting upload
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Image upload service not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment variables.',
      });
    }
    next();
  },
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided. Please upload an image.',
        });
      }

      // Upload to Cloudinary via stream
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'dar-al-ghuraba/products',
            transformation: [
              { quality: 'auto:good', fetch_format: 'auto' }, // Auto-optimize
            ],
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Write buffer to stream
        stream.end(req.file.buffer);
      });

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image is too large. Maximum size is 10MB.',
        });
      }

      next(error);
    }
  }
);

module.exports = router;
