/* ============================================================
   Dar Al Ghuraba Books — Order Model (Mongoose)
   ============================================================
   Stores all order data: items, customer info, payment details,
   shipping, and status tracking. Follows SOLID — single 
   responsibility for order persistence.
   ============================================================ */
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0,
    },
    weight: {
      type: Number,
      default: 0, // grams
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    customer: {
      type: customerSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      enum: ['PKR'],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['safepay', 'jazzcash', 'easypaisa', 'whatsapp', 'cod'],
    },
    paymentStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'paid', 'failed', 'refunded'],
      index: true,
    },
    paymentReference: {
      type: String,
      default: '',
    },
    paymentVerifiedAt: {
      type: Date,
    },
    orderStatus: {
      type: String,
      default: 'pending',
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      index: true,
    },
    shippingDetails: {
      trackingNumber: { type: String, default: '' },
      carrier: { type: String, default: '' },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },
    webhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      select: false, // Don't include in default queries (audit data)
    },
    notes: {
      type: String,
      default: '',
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Static: Generate Order ID ─────────────────────────── */
orderSchema.statics.generateOrderId = function () {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DAG-${dateStr}-${random}`;
};

/* ─── Indexes ──────────────────────────────────────────── */
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
