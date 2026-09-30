/* ============================================================
   Dar Al Ghuraba Books — Image Migration Script (Base64 -> Cloudinary)
   ============================================================
   Migrates existing base64 product images stored in MongoDB to
   Cloudinary CDN URLs.
   
   Usage:
     node scripts/migrateImages.js
   
   Prerequisites:
     Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and
     CLOUDINARY_API_SECRET are set in your .env file.
   ============================================================ */
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

async function migrate() {
  console.log('🖼️  Starting image migration to Cloudinary...\n');

  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary is not configured in .env!');
    console.error('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is missing from .env!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // Find all books with base64 data URIs
    const books = await Book.find({
      imageUrl: { $regex: '^data:image/' }
    });

    console.log(`Found ${books.length} books with base64 images.\n`);

    if (books.length === 0) {
      console.log('🎉 No base64 images found to migrate! All images are already hosted.');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const book of books) {
      try {
        console.log(`Uploading image for: "${book.title}" (${book._id})...`);
        const result = await cloudinary.uploader.upload(book.imageUrl, {
          folder: 'dar-al-ghuraba/products',
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
          resource_type: 'image',
        });

        book.imageUrl = result.secure_url;
        await book.save();
        console.log(`  -> Uploaded successfully: ${result.secure_url}`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Failed for "${book.title}":`, err.message);
        failCount++;
      }
    }

    console.log('\n=======================================');
    console.log(`Migration Complete:`);
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log('=======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Fatal migration error:', error);
    process.exit(1);
  }
}

migrate();
