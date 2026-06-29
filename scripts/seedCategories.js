/* ============================================================
   Dar-ul-Ilm Books — Seed Categories
   ============================================================ */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');
const connectDB = require('../config/db');

const initialCategories = [
  { name: 'Quran', description: 'Tafsir, translations, and Tajweed' },
  { name: 'Hadith', description: 'Authentic Hadith collections' },
  { name: 'Seerah', description: 'Prophetic biography & companions' },
  { name: 'Fiqh', description: 'Islamic jurisprudence & rulings' },
  { name: 'Aqeedah', description: 'Islamic creed & theology' },
  { name: 'Arabic Language', description: 'Arabic grammar & vocabulary' }
];

const seedCategories = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    for (const cat of initialCategories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Category seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
