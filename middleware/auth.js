/* ============================================================
   Dar Al Ghuraba Books — JWT Authentication Middleware
   ============================================================ */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Token blacklist for revoked tokens (logout)
// Set stores token string; periodically purged of expired tokens
const tokenBlacklist = new Map(); // token -> expiry timestamp ms

const cleanupBlacklist = () => {
  const now = Date.now();
  for (const [token, expiry] of tokenBlacklist.entries()) {
    if (expiry <= now) {
      tokenBlacklist.delete(token);
    }
  }
};

// Purge expired tokens every 30 minutes
setInterval(cleanupBlacklist, 30 * 60 * 1000).unref();

/**
 * Add a token to the blacklist.
 * @param {string} token - JWT string
 * @param {number} expiresInMs - duration in ms before token expires
 */
const blacklistToken = (token, expiresInMs = 7 * 24 * 60 * 60 * 1000) => {
  tokenBlacklist.set(token, Date.now() + expiresInMs);
};

/**
 * Protects routes — verifies JWT from Authorization header.
 * Attaches authenticated user to req.user on success.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // ─── Extract token from Authorization header ────────────
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // ─── Check Blacklist ────────────────────────────────────
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please log in again.',
      });
    }

    // ─── Verify token ───────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ─── Attach user to request (exclude password) ──────────
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token expired',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * Restricts access to admin role only.
 * Must be used AFTER the protect middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Forbidden — admin access required',
  });
};

module.exports = { protect, adminOnly, blacklistToken };

