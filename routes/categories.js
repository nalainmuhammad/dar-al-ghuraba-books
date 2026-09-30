/* ============================================================
   Dar Al Ghuraba Books — Category API Routes
   ============================================================
   GET    /api/categories     Public   — List all categories
   POST   /api/categories     Admin    — Create category
   PUT    /api/categories/:id Admin    — Update category
   DELETE /api/categories/:id Admin    — Delete category (and associated books)
   ============================================================ */
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Book = require('../models/Book');
const { protect, adminOnly } = require('../middleware/auth');

/* ─── Validation Helper ─────────────────────────────────── */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/* ─── GET /api/categories — List All ────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.productType) {
      filter.productType = req.query.productType;
    }
    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ order: 1, name: 1 })
      .lean();
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/* ─── GET /api/categories/tree — Hierarchical Tree ──────── */
router.get('/tree', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.productType) {
      filter.productType = req.query.productType;
    }

    const allCategories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();

    // Separate parents and children
    const rootCategories = [];
    const childrenMap = new Map();

    for (const cat of allCategories) {
      if (!cat.parentCategory) {
        rootCategories.push({ ...cat, subcategories: [] });
      } else {
        const pId = String(cat.parentCategory);
        if (!childrenMap.has(pId)) {
          childrenMap.set(pId, []);
        }
        childrenMap.get(pId).push(cat);
      }
    }

    for (const root of rootCategories) {
      const rootId = String(root._id);
      if (childrenMap.has(rootId)) {
        root.subcategories = childrenMap.get(rootId);
      }
    }

    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    res.json({ success: true, data: rootCategories });
  } catch (error) {
    next(error);
  }
});

/* ─── GET /api/categories/:id — Single Category ─────────── */
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Invalid category ID'),
  validate,
  async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id)
        .populate('parentCategory', 'name slug')
        .lean();
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── POST /api/categories — Create (Admin Only) ────────── */
router.post(
  '/',
  protect,
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim(),
    body('parentCategory').optional({ nullable: true }).isMongoId().withMessage('Invalid parent category ID'),
    body('productType').optional().isIn(['book', 'clothing', 'general']).withMessage('Invalid product type'),
    body('order').optional().isInt().toInt(),
    body('icon').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      // Check for duplicate name
      const exists = await Category.findOne({ name: req.body.name });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }

      const payload = { ...req.body };
      if (payload.parentCategory === '' || payload.parentCategory === undefined) {
        payload.parentCategory = null;
      }

      const category = await Category.create(payload);
      res.set('Cache-Control', 'no-store');
      res.status(201).json({ success: true, message: 'Category created', data: category });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── PUT /api/categories/:id — Update (Admin Only) ─────── */
router.put(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid category ID'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim(),
    body('parentCategory').optional({ nullable: true }),
    body('productType').optional().isIn(['book', 'clothing', 'general']),
    body('order').optional().isInt().toInt(),
    body('icon').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const oldName = category.name;

      // Update fields
      if (req.body.name) category.name = req.body.name;
      if (req.body.description !== undefined) category.description = req.body.description;
      if (req.body.parentCategory !== undefined) {
        category.parentCategory = req.body.parentCategory ? req.body.parentCategory : null;
      }
      if (req.body.productType !== undefined) category.productType = req.body.productType;
      if (req.body.order !== undefined) category.order = req.body.order;
      if (req.body.icon !== undefined) category.icon = req.body.icon;

      await category.save();

      // If name changed, update all associated books to the new category name
      if (req.body.name && oldName !== req.body.name) {
        await Book.updateMany({ category: oldName }, { category: req.body.name });
      }

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, message: 'Category updated', data: category });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Category name already exists' });
      }
      next(error);
    }
  }
);

/* ─── DELETE /api/categories/:id — Delete (Admin Only) ──── */
router.delete(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid category ID'),
  validate,
  async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const catName = category.name;

      // Also find child categories and delete them and their books
      const childCategories = await Category.find({ parentCategory: category._id });
      const allCategoryNames = [catName, ...childCategories.map((c) => c.name)];

      await Book.deleteMany({ category: { $in: allCategoryNames } });
      await Category.deleteMany({ _id: { $in: [category._id, ...childCategories.map((c) => c._id)] } });

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, message: 'Category, subcategories, and associated books deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
