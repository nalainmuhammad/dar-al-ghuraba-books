const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
/* ============================================================
   Dar Al Ghuraba Books — Express Server Entry Point
   ============================================================
   Production-ready server with:
   • Helmet security headers
   • Gzip compression
   • Rate limiting (global, API, auth)
   • CORS configuration
   • Static file serving with caching
   • MongoDB connection
   • Centralized error handling
   ============================================================ */
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const bookRoutes = require('./routes/books');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render load balancer)
const PORT = process.env.PORT || 3000;

/* ─── 1. Security Headers (Helmet) ──────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'https://wa.me'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

/* ─── 2. Gzip Compression ──────────────────────────────── */
app.use(
  compression({
    level: 6, // balanced speed/compression
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

/* ─── 3. CORS ───────────────────────────────────────────── */
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.ALLOWED_ORIGIN || 'https://yourdomain.com']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

/* ─── 4. Static Files (Frontend) ───────────────────────── */
// Placed BEFORE rate limiting so static assets don't exhaust the limit
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    etag: true,
    lastModified: true,
  })
);

/* ─── 5. Rate Limiting ──────────────────────────────────── */
// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
});
app.use(globalLimiter);

// Stricter limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests. Please slow down.',
  },
});

// Very strict limiter for auth routes (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // only 10 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

/* ─── 6. Body Parsing ───────────────────────────────────── */
app.use(express.json({ limit: '50mb' })); // allow larger payloads for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ─── 7. API Routes ─────────────────────────────────────── */
app.use('/api/books', apiLimiter, bookRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);

// Config endpoint (serves WhatsApp number to frontend)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      whatsappNumber: process.env.WHATSAPP_NUMBER || '923708998986',
      storeName: 'Dar Al Ghuraba Books',
    },
  });
});

/* ─── 8. Health Check ───────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dar Al Ghuraba Books API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/* ─── 9. SPA Fallback — Redirect unknown routes to home ─ */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
    });
  }
  res.redirect('/');
});

/* ─── 10. Error Handler (must be last middleware) ────────── */
app.use(errorHandler);

/* ─── 11. Start Server ──────────────────────────────────── */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n🕌  Dar Al Ghuraba Books Server`);
      console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`   🌐  URL:         http://localhost:${PORT}`);
      console.log(`   📦  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   📚  API:         http://localhost:${PORT}/api/books`);
      console.log(`   🔐  Admin:       http://localhost:${PORT}/admin.html`);
      console.log(`   ❤️   Health:      http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
