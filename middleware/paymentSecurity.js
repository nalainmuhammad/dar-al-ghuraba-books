/* ============================================================
   Dar Al Ghuraba Books — Payment Security Middleware
   ============================================================
   Webhook signature verification for payment gateways.
   Follows SRP: only responsible for payment security logic.
   ============================================================ */
const crypto = require('crypto');

/**
 * Verify JazzCash webhook signature (HMAC-SHA256).
 * JazzCash sends a hash in pp_SecureHash field.
 */
function verifyJazzCashSignature(payload, integritySalt) {
  if (!integritySalt) return false;

  try {
    // JazzCash constructs hash from sorted key-value pairs
    const sortedKeys = Object.keys(payload)
      .filter((key) => key !== 'pp_SecureHash' && payload[key] !== '')
      .sort();

    const hashString = integritySalt + '&' + sortedKeys.map((key) => payload[key]).join('&');

    const computedHash = crypto
      .createHmac('sha256', integritySalt)
      .update(hashString)
      .digest('hex')
      .toUpperCase();

    return computedHash === (payload.pp_SecureHash || '').toUpperCase();
  } catch (error) {
    console.error('JazzCash signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify Easypaisa webhook signature.
 */
function verifyEasypaisaSignature(payload, hashKey) {
  if (!hashKey) return false;

  try {
    const sortedKeys = Object.keys(payload)
      .filter((key) => key !== 'hash' && payload[key] !== '')
      .sort();

    const hashString = sortedKeys.map((key) => payload[key]).join('&') + '&' + hashKey;

    const computedHash = crypto.createHash('sha256').update(hashString).digest('hex');

    return computedHash === payload.hash;
  } catch (error) {
    console.error('Easypaisa signature verification error:', error.message);
    return false;
  }
}

/**
 * Verify Safepay webhook signature.
 * Uses the webhookSecret from Safepay dashboard.
 */
function verifySafepaySignature(rawBody, signature, webhookSecret) {
  if (!webhookSecret || !signature) return false;

  try {
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Safepay signature verification error:', error.message);
    return false;
  }
}

/**
 * Express middleware: captures raw body for webhook signature verification.
 * Must be applied BEFORE express.json() for webhook routes.
 */
function captureRawBody(req, res, next) {
  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    req.rawBody = rawBody;
    try {
      req.body = JSON.parse(rawBody);
    } catch {
      // Body may not be JSON (form-encoded for JazzCash)
    }
    next();
  });
}

module.exports = {
  verifyJazzCashSignature,
  verifyEasypaisaSignature,
  verifySafepaySignature,
  captureRawBody,
};
