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
const fs = require('fs');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const bookRoutes = require('./routes/books');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');

// Models
const Book = require('./models/Book');

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
const jwt = require('jsonwebtoken');

// Lightweight in-memory check to identify authenticated admin requests
const isAdminRequest = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return Boolean(decoded && decoded.id);
    } catch {
      return false;
    }
  }
  return false;
};

// Global rate limiter (public browsing, 500 requests per 15 min; admins bypassed)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: (req) => isAdminRequest(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many requests. Please try again in a few minutes.',
  },
});
app.use(globalLimiter);

// Public API rate limiter (300 requests per 15 min; admins bypassed)
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: (req) => isAdminRequest(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many API requests. Please slow down and try again shortly.',
  },
});

// Admin rate limiter (5,000 requests per 15 min window to support batch edits/uploads/reordering)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Admin request threshold reached. Please wait a moment before continuing.',
  },
});

// Dedicated login rate limiter to prevent brute-force attacks on credentials
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // 15 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

/* ─── 6. Body Parsing ───────────────────────────────────── */
app.use(express.json({ limit: '50mb' })); // allow larger payloads for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ─── 7. API Routes ─────────────────────────────────────── */
// Note: bookRoutes, adminRoutes, categoryRoutes, authRoutes handle specific sub-limits
app.use('/api/books', publicApiLimiter, bookRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', publicApiLimiter, authRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/categories', publicApiLimiter, categoryRoutes);

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

/* ─── Sitemap ───────────────────────────────────────────── */
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://daralghuraba.com').replace(/\/$/, '');
    const books = await Book.find({ slug: { $exists: true, $ne: '' } }).select('slug updatedAt').lean();
    const urls = [
      `${siteUrl}/`,
      `${siteUrl}/catalog.html`,
      `${siteUrl}/about.html`,
      `${siteUrl}/contact.html`,
      `${siteUrl}/faq.html`,
      ...books.map((book) => `${siteUrl}/book/${encodeURIComponent(book.slug)}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
      .map((url) => `<url><loc>${url}</loc></url>`)
      .join('')}</urlset>`;
    res.type('application/xml').send(xml);
  } catch (error) {
    next(error);
  }
});

/* ─── 9. Product Page SEO (Server-Side Rendered) ──────────── */
app.get('/book/:slug', async (req, res, next) => {
  try {
    const param = req.params.slug;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(param);
    const book = await Book.findOne(isMongoId ? { $or: [{ slug: param }, { _id: param }] } : { slug: param }).lean();

    if (!book) {
      const templatePath = path.join(__dirname, 'public', 'product.html');
      let html = fs.readFileSync(templatePath, 'utf8');
      const metaTags = `
        <title>Book Not Found — Dar Al Ghuraba Books</title>
        <meta name="robots" content="noindex">
      `;
      html = html.replace('<!-- SEO_PLACEHOLDER -->', metaTags);
      const jsInit = `<script>window.__INITIAL_BOOK_NOT_FOUND__ = true; window.__INITIAL_BOOK_SLUG__ = "${encodeURIComponent(param)}";</script>`;
      html = html.replace('<!-- JS_PLACEHOLDER -->', jsInit);
      return res.status(404).send(html);
    }

    // Read the product.html template
    const templatePath = path.join(__dirname, 'public', 'product.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://daralghuraba.com').replace(/\/$/, '');
    const canonicalUrl = `${siteUrl}/book/${encodeURIComponent(book.slug || book._id)}`;
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: book.title,
      image: book.imageUrl ? [book.imageUrl] : [],
      description: `${(book.description || '').substring(0, 150)}...`,
      sku: String(book._id),
      brand: { '@type': 'Brand', name: 'Dar Al Ghuraba Books' },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'PKR',
        price: Number(book.price),
        availability: book.onDemand
          ? 'https://schema.org/PreOrder'
          : book.inStock !== false
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    };

    // Inject SEO Meta Tags
    const metaTags = `
      <title>${book.title} — Dar Al Ghuraba Books</title>
      <link rel="canonical" href="${canonicalUrl}">
      <meta name="description" content="${(book.description || '').substring(0, 150)}...">
      <meta property="og:title" content="${book.title} — Dar Al Ghuraba Books">
      <meta property="og:description" content="${(book.description || '').substring(0, 150)}...">
      <meta property="og:image" content="${book.imageUrl || 'assets/images/hero-bg.png'}">
      <meta name="twitter:title" content="${book.title} — Dar Al Ghuraba Books">
      <meta name="twitter:description" content="${(book.description || '').substring(0, 150)}...">
      <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
    `;

    // Replace a placeholder in the HTML head
    html = html.replace('<!-- SEO_PLACEHOLDER -->', metaTags);
    
    // Inject book id and data into a global JS variable so the client can use it immediately
    const jsInit = `<script>window.__INITIAL_BOOK_SLUG__ = "${book.slug || book._id}";</script>`;
    html = html.replace('<!-- JS_PLACEHOLDER -->', jsInit);

    // Set cache headers for SSR product pages
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.send(html);
  } catch (error) {
    console.error('Error rendering product page:', error.message);
    const templatePath = path.join(__dirname, 'public', 'product.html');
    if (fs.existsSync(templatePath)) {
      let html = fs.readFileSync(templatePath, 'utf8');
      const metaTags = `<title>Server Temporarily Busy — Dar Al Ghuraba Books</title>`;
      html = html.replace('<!-- SEO_PLACEHOLDER -->', metaTags);
      const jsInit = `<script>window.__INITIAL_SERVER_ERROR__ = true; window.__INITIAL_BOOK_SLUG__ = "${encodeURIComponent(req.params.slug || '')}";</script>`;
      html = html.replace('<!-- JS_PLACEHOLDER -->', jsInit);
      return res.status(503).send(html);
    }
    next(error);
  }
});

/* ─── 10. SPA Fallback — Redirect unknown routes to home ─ */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
    });
  }
  res.redirect('/');
});

/* ─── 11. Error Handler (must be last middleware) ────────── */
app.use(errorHandler);

/* ─── 12. Start Server ──────────────────────────────────── */
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
