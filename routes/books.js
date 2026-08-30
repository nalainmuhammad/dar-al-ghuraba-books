/* ============================================================
   Dar Al Ghuraba Books — Book API Routes
   ============================================================
   GET    /api/books                  Public   — List/search/filter books
   GET    /api/books/filters/options  Public   — Get filter dropdown values
   GET    /api/books/:id              Public   — Single book by ID
   POST   /api/books                  Admin    — Create book
   PUT    /api/books/:id              Admin    — Update book
   DELETE /api/books/:id              Admin    — Delete book
   ============================================================ */
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Book = require('../models/Book');
const Category = require('../models/Category');
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

/* ─── Book field validators (reusable) ──────────────────── */
const bookValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('author').trim().notEmpty().withMessage('Author is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('language').optional().trim(),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('featured').optional().isBoolean(),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid hex color'),
  body('imageUrl').optional().trim(),
  body('inStock').optional().isBoolean(),
  body('sortOrder').optional().isInt().toInt(),
];

/* ─── GET /api/books — List, Search, Filter, Sort, Paginate ─ */
router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      author,
      language,
      search,
      sort,
      featured,
      inStock,
      page = 1,
      limit = 50,
    } = req.query;

    // Build filter object
    const filter = {};

    if (category) filter.category = category;
    if (author) filter.author = author;
    if (language) filter.language = language;
    if (featured === 'true') filter.featured = true;
    if (inStock !== undefined) filter.inStock = inStock === 'true';

    // Text search across title, author, description
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    let sortObj = { sortOrder: 1, createdAt: -1 }; // default: specified order, then newest first
    switch (sort) {
      case 'price-low':
        sortObj = { price: 1 };
        break;
      case 'price-high':
        sortObj = { price: -1 };
        break;
      case 'title-az':
        sortObj = { title: 1 };
        break;
      case 'title-za':
        sortObj = { title: -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
    }

    // If text search, add relevance score sorting
    if (search) {
      sortObj = { score: { $meta: 'textScore' }, ...sortObj };
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    let queryBuilder = Book.find(filter);

    if (search) {
      queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
    }

    const [books, total] = await Promise.all([
      queryBuilder.sort(sortObj).skip(skip).limit(limitNum).lean(),
      Book.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: books,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalBooks: total,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ─── GET /api/books/filters/options — Filter Dropdown Values ─ */
router.get('/filters/options', async (req, res, next) => {
  try {
    const [categories, authors, languages] = await Promise.all([
      Category.find().select('name').sort({ name: 1 }).lean(),
      Book.distinct('author'),
      Book.distinct('language'),
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map((c) => c.name),
        authors: authors.sort(),
        languages: languages.sort(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ─── GET /api/books/slug/:slug — Single Book by Slug ──────────── */
router.get(
  '/slug/:slug',
  async (req, res, next) => {
    try {
      const param = req.params.slug;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(param);
      const book = await Book.findOne(isMongoId ? { $or: [{ slug: param }, { _id: param }] } : { slug: param }).lean();

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      res.json({ success: true, data: book });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── GET /api/books/:id — Single Book ──────────────────── */
router.get(
  '/:id',
  param('id').isMongoId().withMessage('Invalid book ID'),
  validate,
  async (req, res, next) => {
    try {
      const book = await Book.findById(req.params.id).lean();

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      res.json({ success: true, data: book });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── POST /api/books — Create Book (Admin Only) ────────── */
router.post(
  '/',
  protect,
  adminOnly,
  bookValidators,
  validate,
  async (req, res, next) => {
    try {
      let bookData = { ...req.body };
      
      // Generate initial slug
      let baseSlug = bookData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/(^-|-$)+/g, ''); // Remove leading/trailing hyphens
      
      // Ensure unique slug
      let slug = baseSlug;
      let slugExists = await Book.findOne({ slug });
      let counter = 1;
      while (slugExists) {
        slug = `${baseSlug}-${counter}`;
        slugExists = await Book.findOne({ slug });
        counter++;
      }
      
      bookData.slug = slug;
      
      const book = await Book.create(bookData);

      res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── PUT /api/books/:id — Update Book (Admin Only) ─────── */
router.put(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid book ID'),
  // Make all fields optional for partial updates
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().trim().notEmpty().withMessage('Author cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('language').optional().trim(),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('featured').optional().isBoolean(),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid hex color'),
  body('imageUrl').optional().trim(),
  body('inStock').optional().isBoolean(),
  body('sortOrder').optional().isInt().toInt(),
  validate,
  async (req, res, next) => {
    try {
      let updateData = { ...req.body };
      
      // If title is being updated, handle slug generation
      if (updateData.title) {
         let baseSlug = updateData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        
        let slug = baseSlug;
        let slugExists = await Book.findOne({ slug, _id: { $ne: req.params.id } });
        let counter = 1;
        while (slugExists) {
          slug = `${baseSlug}-${counter}`;
          slugExists = await Book.findOne({ slug, _id: { $ne: req.params.id } });
          counter++;
        }
        updateData.slug = slug;
      }
      
      const book = await Book.findByIdAndUpdate(req.params.id, updateData, {
        new: true, // return the updated document
        runValidators: true, // apply schema validation on update
      });

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── DELETE /api/books/:id — Delete Book (Admin Only) ──── */
router.delete(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid book ID'),
  validate,
  async (req, res, next) => {
    try {
      const book = await Book.findByIdAndDelete(req.params.id);

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found',
        });
      }

      res.json({
        success: true,
        message: 'Book deleted successfully',
        data: { id: req.params.id },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
