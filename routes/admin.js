/* ============================================================
   Dar Al Ghuraba Books — Admin Dashboard Routes
   ============================================================
   GET    /api/admin/stats   — Dashboard statistics
   ============================================================ */
const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require authentication
router.use(protect, adminOnly);

/* ─── GET /api/admin/stats — Dashboard Statistics ───────── */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalBooks,
      featuredBooks,
      outOfStock,
      categoryBreakdown,
      priceStats,
      languageBreakdown,
    ] = await Promise.all([
      Book.countDocuments(),
      Book.countDocuments({ featured: true }),
      Book.countDocuments({ inStock: false }),
      Book.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Book.aggregate([
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            totalValue: { $sum: '$price' },
          },
        },
      ]),
      Book.aggregate([
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalBooks,
        featuredBooks,
        inStock: totalBooks - outOfStock,
        outOfStock,
        categories: categoryBreakdown.map((c) => ({
          name: c._id,
          count: c.count,
        })),
        languages: languageBreakdown.map((l) => ({
          name: l._id,
          count: l.count,
        })),
        pricing: priceStats[0] || {
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalValue: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
