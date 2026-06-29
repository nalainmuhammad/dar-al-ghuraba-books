/* ============================================================
   Dar-ul-Ilm Books — Category API Routes
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
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: categories });
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
      const category = await Category.findById(req.params.id).lean();
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
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
  ],
  validate,
  async (req, res, next) => {
    try {
      // Check for duplicate name
      const exists = await Category.findOne({ name: req.body.name });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }

      const category = await Category.create(req.body);
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

      await category.save();

      // If name changed, update all associated books to the new category name
      if (req.body.name && oldName !== req.body.name) {
        await Book.updateMany({ category: oldName }, { category: req.body.name });
      }

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

      // User requested: "delete all the books under those categories"
      await Book.deleteMany({ category: catName });
      await category.deleteOne();

      res.json({ success: true, message: 'Category and all associated books deleted' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
