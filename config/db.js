/* ============================================================
   Dar Al Ghuraba Books — MongoDB Connection
   ============================================================ */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Neither MONGO_URI nor MONGODB_URI environment variable is defined.');
    }
    const conn = await mongoose.connect(uri, {
      // Mongoose 8 defaults to the new URL parser and unified topology
      maxPoolSize: 20, // increased connection pool for concurrent traffic
      minPoolSize: 2,  // maintain warm connections to avoid cold starts
      serverSelectionTimeoutMS: 15000, // 15s timeout to prevent premature timeouts during Atlas replica set failovers
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000, // close idle connections before cloud firewalls terminate them
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ─── Connection Event Listeners ─────────────────────────
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Waiting for auto-reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully.');
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
