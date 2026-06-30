/* ============================================================
   Dar Al Ghuraba Books — Standalone Admin User Creator
   ============================================================
   Usage: node scripts/createAdmin.js
   Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env
   ============================================================ */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@darulilmbooks.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@DarUlIlm2024';

    // Check if admin already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`⚠️  Admin user already exists: ${email}`);
      process.exit(0);
    }

    const admin = await User.create({
      email,
      password,
      name: 'Dar Al Ghuraba Admin',
      role: 'admin',
    });

    console.log(`\n✅ Admin user created:`);
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${password}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
