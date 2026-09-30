/* ============================================================
   Dar Al Ghuraba Books — Admin Dashboard Routes
   ============================================================
   GET    /api/admin/stats   — Dashboard statistics
   ============================================================ */
const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Order = require('../models/Order');
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
      totalOrders,
      orderRevenueAgg,
      pendingOrders,
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
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ orderStatus: 'pending' }),
    ]);

    const totalRevenue = orderRevenueAgg[0]?.totalRevenue || 0;

    res.json({
      success: true,
      data: {
        totalBooks,
        featuredBooks,
        inStock: totalBooks - outOfStock,
        outOfStock,
        onDemandBooks: await Book.countDocuments({ onDemand: true }),
        totalOrders,
        pendingOrders,
        totalRevenue,
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

/* ─── GET /api/admin/orders — List Orders (Pagination, Filters) ──── */
router.get('/orders', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      paymentStatus,
      orderStatus,
      paymentMethod,
      search,
    } = req.query;

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { orderId: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'customer.phone': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ─── GET /api/admin/orders/:id — Order Details ───────────── */
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.productId').lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

/* ─── PUT /api/admin/orders/:id/status — Update Order Status ─ */
router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { orderStatus, trackingNumber, carrier, paymentStatus, notes } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (orderStatus) {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid order status' });
      }
      order.orderStatus = orderStatus;

      if (orderStatus === 'shipped' && !order.shippingDetails?.shippedAt) {
        order.shippingDetails = order.shippingDetails || {};
        order.shippingDetails.shippedAt = new Date();
      }
      if (orderStatus === 'delivered' && !order.shippingDetails?.deliveredAt) {
        order.shippingDetails = order.shippingDetails || {};
        order.shippingDetails.deliveredAt = new Date();
      }
    }

    if (trackingNumber !== undefined) {
      order.shippingDetails = order.shippingDetails || {};
      order.shippingDetails.trackingNumber = trackingNumber;
    }

    if (carrier !== undefined) {
      order.shippingDetails = order.shippingDetails || {};
      order.shippingDetails.carrier = carrier;
    }

    if (paymentStatus) {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      if (validPaymentStatuses.includes(paymentStatus)) {
        order.paymentStatus = paymentStatus;
        if (paymentStatus === 'paid' && !order.paymentVerifiedAt) {
          order.paymentVerifiedAt = new Date();
        }
      }
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
