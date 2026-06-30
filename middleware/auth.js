/* ============================================================
   Dar Al Ghuraba Books — JWT Authentication Middleware
   ============================================================ */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { protect, adminOnly };
