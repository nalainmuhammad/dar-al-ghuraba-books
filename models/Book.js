/* ============================================================
   Dar Al Ghuraba Books — Book Model (Mongoose)
   ============================================================ */
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [150, 'Author name cannot exceed 150 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
      default: 'English',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#1B6B3A',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color code'],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    onDemand: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Pre-save: Generate Slug ──────────────────────────────
   Auto-generates slug from title if not present or title changed */
bookSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('title')) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/(^-|-$)+/g, ''); // Remove leading/trailing hyphens
    
    // Add a random string or use object id to ensure uniqueness if needed, 
    // but for simplicity, we'll just use the base slug and handle duplicates in route
    this.slug = baseSlug;
  }
  next();
});

/* ─── Indexes for Performance ───────────────────────────────
   - Text index: powers the search bar (title, author, description)
   - Category index: fast filtering by category
   - Featured index: homepage featured carousel query
   - Compound index: common catalog query pattern             */
bookSchema.index({ title: 'text', author: 'text', description: 'text' }, { language_override: 'dummy_field_ignore' });
bookSchema.index({ category: 1 });
bookSchema.index({ featured: 1 });
bookSchema.index({ category: 1, language: 1 });
bookSchema.index({ price: 1 });
bookSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('Book', bookSchema);
