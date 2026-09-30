/* ============================================================
   Dar Al Ghuraba Books — Cloudinary Configuration
   ============================================================
   Cloud image storage for permanent, CDN-optimized product images.
   Replaces fragile base64 storage in MongoDB.
   
   Setup: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, 
          CLOUDINARY_API_SECRET in .env
   ============================================================ */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

/**
 * Validates that Cloudinary credentials are configured.
 * Call during server startup to fail fast.
 * @returns {boolean} true if configured
 */
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

module.exports = { cloudinary, isCloudinaryConfigured };
