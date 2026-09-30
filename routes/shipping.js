/* ============================================================
   Dar Al Ghuraba Books — Shipping Calculator Routes
   ============================================================
   GET  /api/shipping/countries  — List shipping destinations
   POST /api/shipping/calculate  — Calculate shipping cost
   ============================================================ */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const shippingRates = require('../data/shipping-rates.json');

/* ─── GET /api/shipping/countries — Available Destinations ── */
router.get('/countries', (req, res) => {
  const countries = [
    { code: 'PK', name: 'Pakistan (Domestic)', isDomestic: true },
    ...Object.entries(shippingRates.international)
      .map(([code, data]) => ({
        code,
        name: data.name,
        isDomestic: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  res.set('Cache-Control', 'public, max-age=86400'); // Cache 24h — rates don't change often
  res.json({ success: true, data: countries });
});

/* ─── POST /api/shipping/calculate — Calculate Shipping Cost ── */
router.post(
  '/calculate',
  [
    body('countryCode')
      .trim()
      .notEmpty()
      .withMessage('Country code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 letters'),
    body('totalWeightGrams')
      .isFloat({ min: 1 })
      .withMessage('Weight must be a positive number in grams'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { countryCode, totalWeightGrams } = req.body;
    const code = countryCode.toUpperCase();
    const weightKg = totalWeightGrams / 1000;

    // Domestic Pakistan shipping
    if (code === 'PK') {
      const bracket = shippingRates.domestic.brackets.find((b) => weightKg <= b.maxKg);
      
      if (!bracket) {
        return res.status(400).json({
          success: false,
          message: `Domestic shipping is limited to ${shippingRates.domestic.brackets[shippingRates.domestic.brackets.length - 1].maxKg}kg. Please contact us for heavier packages.`,
        });
      }

      return res.json({
        success: true,
        data: {
          countryCode: 'PK',
          countryName: 'Pakistan (Domestic)',
          isDomestic: true,
          weightGrams: totalWeightGrams,
          weightKg: Math.round(weightKg * 100) / 100,
          shippingCost: bracket.rate,
          currency: 'PKR',
          bracket: `Up to ${bracket.maxKg}kg`,
        },
      });
    }

    // International shipping
    const country = shippingRates.international[code];
    if (!country) {
      return res.status(400).json({
        success: false,
        message: `Shipping not available to country code: ${code}. Please contact us.`,
      });
    }

    // Calculate: firstKg rate + additional kg rate
    let shippingCost;
    if (weightKg <= 1) {
      shippingCost = country.firstKg;
    } else {
      const additionalKg = Math.ceil(weightKg - 1); // Round up additional kg
      shippingCost = country.firstKg + additionalKg * country.additionalKg;
    }

    res.json({
      success: true,
      data: {
        countryCode: code,
        countryName: country.name,
        isDomestic: false,
        weightGrams: totalWeightGrams,
        weightKg: Math.round(weightKg * 100) / 100,
        shippingCost,
        currency: 'PKR',
        rateBreakdown: {
          firstKg: country.firstKg,
          additionalKgRate: country.additionalKg,
          additionalKgs: weightKg > 1 ? Math.ceil(weightKg - 1) : 0,
        },
      },
    });
  }
);

module.exports = router;
