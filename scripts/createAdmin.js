/* ============================================================
   Dar Al Ghuraba Books — Seed/Create Admin User Script
   ============================================================ */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'info.ghuraba@gmail.com';
    const password = process.env.ADMIN_PASSWORD || '@Darulilm6';

    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is missing from .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    let user = await User.findOne({ email });
    if (user) {
      user.password = password;
      user.role = 'admin';
      await user.save();
      console.log(`Updated existing admin user password for: ${email}`);
    } else {
      user = await User.create({
        email,
        password,
        name: 'Dar Al Ghuraba Admin',
        role: 'admin',
      });
      console.log(`Created new admin user: ${email}`);
    }

    console.log('Admin user setup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
