/* ============================================================
   Dar-ul-Ilm Books — Centralized Error Handler Middleware
   ============================================================ */

/**
 * Catches all errors thrown in routes and middleware.
 * Returns consistent JSON error responses.
 * Hides stack traces in production.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ─── Mongoose Validation Error ────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
  }

  // ─── Mongoose Cast Error (invalid ObjectId) ───────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ─── Mongoose Duplicate Key Error ─────────────────────────
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for '${field}'. This ${field} already exists.`;
  }

  // ─── JWT Errors ───────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // ─── Send Response ───────────────────────────────────────
  const response = {
    success: false,
    message,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  console.error(`❌ Error: ${message}`, process.env.NODE_ENV === 'development' ? err.stack : '');

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
