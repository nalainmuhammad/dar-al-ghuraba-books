/* ============================================================
   Dar Al Ghuraba Books — Currency Conversion Routes
   ============================================================
   GET /api/currency/rate — Public: get current USD/PKR rate
   ============================================================ */
const express = require('express');
const router = express.Router();
const { getExchangeRate, refreshExchangeRate } = require('../services/exchangeRate');
const { protect, adminOnly } = require('../middleware/auth');

/* ─── GET /api/currency/rate — Public Rate ──────────────── */
router.get('/rate', async (req, res, next) => {
  try {
    const rateData = await getExchangeRate();
    
    res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.json({
      success: true,
      data: {
        from: 'USD',
        to: 'PKR',
        rate: rateData.rate,
        fetchedAt: rateData.fetchedAt,
        nextRefreshAt: rateData.nextRefreshAt,
        stale: rateData.stale || false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ─── POST /api/currency/refresh — Admin: Force Refresh ─── */
router.post('/refresh', protect, adminOnly, async (req, res, next) => {
  try {
    const rateData = await refreshExchangeRate();
    
    res.json({
      success: true,
      message: 'Exchange rate refreshed successfully',
      data: {
        from: 'USD',
        to: 'PKR',
        rate: rateData.rate,
        fetchedAt: rateData.fetchedAt,
        nextRefreshAt: rateData.nextRefreshAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
