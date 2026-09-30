/* ============================================================
   Dar Al Ghuraba Books — Checkout & Payment Routes
   ============================================================
   POST /api/checkout/create-order       — Create pending order
   POST /api/checkout/initiate-payment   — Generate payment link
   POST /api/checkout/webhook/safepay    — Safepay webhook
   POST /api/checkout/webhook/jazzcash   — JazzCash webhook
   POST /api/checkout/webhook/easypaisa  — Easypaisa webhook
   GET  /api/checkout/verify/:orderId    — Verify order status
   GET  /api/checkout/order/:orderId     — Get order details
   ============================================================ */
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const crypto = require('crypto');
const axios = require('axios');
const Book = require('../models/Book');
const Order = require('../models/Order');
const shippingRates = require('../data/shipping-rates.json');
const {
  verifyJazzCashSignature,
  verifyEasypaisaSignature,
  verifySafepaySignature,
  captureRawBody,
} = require('../middleware/paymentSecurity');
const { sendOrderConfirmationEmail, sendPaymentSuccessEmail } = require('../services/emailService');

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

/* ─── Helper: Calculate shipping cost server-side ────────── */
function calculateShipping(countryCode, totalWeightGrams) {
  const code = countryCode.toUpperCase();
  const weightKg = totalWeightGrams / 1000;

  if (code === 'PK') {
    const bracket = shippingRates.domestic.brackets.find((b) => weightKg <= b.maxKg);
    if (!bracket) {
      throw new Error(`Domestic shipping limited to ${shippingRates.domestic.brackets.at(-1).maxKg}kg`);
    }
    return bracket.rate;
  }

  const country = shippingRates.international[code];
  if (!country) {
    throw new Error(`Shipping not available to: ${code}`);
  }

  if (weightKg <= 1) return country.firstKg;
  return country.firstKg + Math.ceil(weightKg - 1) * country.additionalKg;
}

/* ─── POST /api/checkout/create-order ────────────────────── */
router.post(
  '/create-order',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('customer.name').trim().notEmpty().withMessage('Name is required'),
    body('customer.email').isEmail().withMessage('Valid email is required'),
    body('customer.phone').trim().notEmpty().withMessage('Phone number is required'),
    body('customer.address').trim().notEmpty().withMessage('Address is required'),
    body('customer.city').trim().notEmpty().withMessage('City is required'),
    body('customer.country').trim().notEmpty().withMessage('Country is required'),
    body('customer.countryCode')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Country code must be 2 letters'),
    body('paymentMethod')
      .isIn(['safepay', 'jazzcash', 'easypaisa', 'whatsapp', 'cod'])
      .withMessage('Invalid payment method'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { items, customer, paymentMethod } = req.body;

      // ─── SECURITY: Re-fetch prices from DB (NEVER trust client) ───
      const productIds = items.map((i) => i.productId);
      const products = await Book.find({ _id: { $in: productIds } }).lean();

      if (products.length !== productIds.length) {
        const foundIds = products.map((p) => p._id.toString());
        const missingIds = productIds.filter((id) => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          message: `Some products not found: ${missingIds.join(', ')}`,
        });
      }

      // Build order items with server-verified prices
      const productMap = {};
      products.forEach((p) => {
        productMap[p._id.toString()] = p;
      });

      let subtotal = 0;
      let totalWeightGrams = 0;
      const orderItems = items.map((item) => {
        const product = productMap[item.productId];
        const lineTotal = product.price * item.quantity;
        subtotal += lineTotal;
        const itemWeight = (product.weight || 500) * item.quantity; // Default 500g if no weight
        totalWeightGrams += itemWeight;

        return {
          productId: product._id,
          title: product.title,
          quantity: item.quantity,
          priceAtPurchase: product.price,
          weight: product.weight || 500,
        };
      });

      // ─── Calculate shipping ───
      let shippingCost;
      try {
        shippingCost = calculateShipping(customer.countryCode, totalWeightGrams);
      } catch (shippingError) {
        return res.status(400).json({
          success: false,
          message: shippingError.message,
        });
      }

      const totalAmount = subtotal + shippingCost;

      // ─── Create order ───
      const orderId = Order.generateOrderId();
      const order = await Order.create({
        orderId,
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim().toLowerCase(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          city: customer.city.trim(),
          state: (customer.state || '').trim(),
          postalCode: (customer.postalCode || '').trim(),
          country: customer.country.trim(),
          countryCode: customer.countryCode.toUpperCase(),
        },
        items: orderItems,
        subtotal,
        shippingCost,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'whatsapp' || paymentMethod === 'cod' ? 'pending' : 'pending',
        orderStatus: 'pending',
      });

      // Send order confirmation email (fire-and-forget)
      sendOrderConfirmationEmail(order).catch((err) =>
        console.error('Failed to send order email:', err.message)
      );

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          orderId: order.orderId,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          currency: 'PKR',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── POST /api/checkout/initiate-payment ────────────────── */
router.post(
  '/initiate-payment',
  [
    body('orderId').trim().notEmpty().withMessage('Order ID is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ orderId: req.body.orderId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Order is already paid',
        });
      }

      const paymentMethod = order.paymentMethod;
      const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://daralghuraba.com').replace(/\/$/, '');

      // ─── Safepay (Visa/Mastercard) ───
      if (paymentMethod === 'safepay') {
        if (!process.env.SAFEPAY_API_KEY) {
          return res.status(503).json({
            success: false,
            message: 'Card payment gateway not configured. Please contact support.',
          });
        }

        try {
          const { Safepay } = require('@sfpy/node-sdk');
          const safepay = new Safepay({
            environment: process.env.SAFEPAY_ENVIRONMENT || 'sandbox',
            apiKey: process.env.SAFEPAY_API_KEY,
            v1Secret: process.env.SAFEPAY_V1_SECRET,
            webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
          });

          // Create payment tracker
          const { token } = await safepay.payments.create({
            amount: Math.round(order.totalAmount * 100), // Amount in paisa
            currency: 'PKR',
          });

          // Generate checkout URL
          const checkoutUrl = safepay.checkout.create({
            token,
            orderId: order.orderId,
            cancelUrl: `${siteUrl}/checkout.html?status=cancelled&orderId=${order.orderId}`,
            redirectUrl: `${siteUrl}/order-confirmation.html?orderId=${order.orderId}`,
          });

          // Store payment token for verification
          order.paymentReference = token;
          await order.save();

          return res.json({
            success: true,
            data: {
              paymentMethod: 'safepay',
              redirectUrl: checkoutUrl,
              token,
            },
          });
        } catch (safepayError) {
          console.error('Safepay error:', safepayError);
          return res.status(500).json({
            success: false,
            message: 'Failed to initiate card payment. Please try again.',
          });
        }
      }

      // ─── JazzCash ───
      if (paymentMethod === 'jazzcash') {
        if (!process.env.JAZZCASH_MERCHANT_ID) {
          return res.status(503).json({
            success: false,
            message: 'JazzCash payment not configured. Please contact support.',
          });
        }

        const merchantId = process.env.JAZZCASH_MERCHANT_ID;
        const password = process.env.JAZZCASH_PASSWORD;
        const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
        const isProduction = process.env.JAZZCASH_ENVIRONMENT === 'production';
        const baseUrl = isProduction
          ? 'https://payments.jazzcash.com.pk'
          : 'https://sandbox.jazzcash.com.pk';

        const now = new Date();
        const txnDateTime = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const expiryDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .replace(/[-:T]/g, '')
          .slice(0, 14);

        const txnRefNo = `T${txnDateTime}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        const paymentData = {
          pp_Version: '1.1',
          pp_TxnType: 'MWALLET',
          pp_Language: 'EN',
          pp_MerchantID: merchantId,
          pp_SubMerchantID: '',
          pp_Password: password,
          pp_BankID: 'TBANK',
          pp_ProductID: 'RETL',
          pp_TxnRefNo: txnRefNo,
          pp_Amount: String(Math.round(order.totalAmount * 100)),
          pp_TxnCurrency: 'PKR',
          pp_TxnDateTime: txnDateTime,
          pp_BillReference: order.orderId,
          pp_Description: `Order ${order.orderId} - Dar Al Ghuraba Books`,
          pp_TxnExpiryDateTime: expiryDateTime,
          pp_ReturnURL: `${siteUrl}/api/checkout/webhook/jazzcash`,
          pp_SecureHash: '',
        };

        // Generate HMAC
        const sortedKeys = Object.keys(paymentData)
          .filter((key) => key !== 'pp_SecureHash' && paymentData[key] !== '')
          .sort();
        const hashString = integritySalt + '&' + sortedKeys.map((key) => paymentData[key]).join('&');
        paymentData.pp_SecureHash = crypto
          .createHmac('sha256', integritySalt)
          .update(hashString)
          .digest('hex')
          .toUpperCase();

        order.paymentReference = txnRefNo;
        await order.save();

        return res.json({
          success: true,
          data: {
            paymentMethod: 'jazzcash',
            formAction: `${baseUrl}/ApplicationAPI/API/PaymentInquiry/Inquire`,
            formData: paymentData,
          },
        });
      }

      // ─── Easypaisa ───
      if (paymentMethod === 'easypaisa') {
        if (!process.env.EASYPAISA_STORE_ID) {
          return res.status(503).json({
            success: false,
            message: 'Easypaisa payment not configured. Please contact support.',
          });
        }

        const storeId = process.env.EASYPAISA_STORE_ID;
        const hashKey = process.env.EASYPAISA_HASH_KEY;
        const isProduction = process.env.EASYPAISA_ENVIRONMENT === 'production';
        const baseUrl = isProduction
          ? 'https://easypay.easypaisa.com.pk'
          : 'https://easypaystg.easypaisa.com.pk';

        const now = new Date();
        const txnDateTime = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
        const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');

        const orderId = order.orderId;
        const amount = order.totalAmount.toFixed(1);

        const hashString = `${amount}&${expiryDate}&${orderId}&${storeId}&${hashKey}`;
        const hash = crypto.createHash('sha256').update(hashString).digest('hex');

        const paymentData = {
          storeId,
          amount,
          postBackURL: `${siteUrl}/api/checkout/webhook/easypaisa`,
          orderRefNum: orderId,
          expiryDate,
          autoRedirect: '1',
          paymentMethod: 'MA_PAYMENT_METHOD',
          emailAddr: order.customer.email,
          mobileNum: order.customer.phone,
          hash,
        };

        order.paymentReference = orderId;
        await order.save();

        return res.json({
          success: true,
          data: {
            paymentMethod: 'easypaisa',
            formAction: `${baseUrl}/easypay/Index.jsf`,
            formData: paymentData,
          },
        });
      }

      // ─── WhatsApp / COD ───
      if (paymentMethod === 'whatsapp' || paymentMethod === 'cod') {
        return res.json({
          success: true,
          data: {
            paymentMethod,
            message:
              paymentMethod === 'whatsapp'
                ? 'Please complete your order via WhatsApp.'
                : 'Your order will be delivered with Cash on Delivery.',
            orderId: order.orderId,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Unknown payment method',
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── POST /api/checkout/webhook/safepay — Safepay Webhook ── */
router.post('/webhook/safepay', captureRawBody, async (req, res) => {
  try {
    const signature = req.headers['x-sfpy-signature'];
    const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;

    if (!verifySafepaySignature(req.rawBody, signature, webhookSecret)) {
      console.warn('⚠️  Safepay webhook: invalid signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;
    const orderId = event.data?.metadata?.order_id || event.data?.order_id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Missing order ID' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const eventType = (event.type || '').toLowerCase();
    if (
      eventType === 'payment:created' ||
      eventType === 'payment.created' ||
      eventType === 'payment:completed' ||
      eventType === 'payment.completed' ||
      eventType === 'payment.succeeded' ||
      eventType === 'payments.succeeded'
    ) {
      order.paymentStatus = 'paid';
      order.paymentVerifiedAt = new Date();
      order.orderStatus = 'confirmed';
      order.paymentReference = event.data?.tracker?.token || order.paymentReference;
      order.webhookPayload = event;
      await order.save();

      // Send payment success email
      sendPaymentSuccessEmail(order).catch((err) =>
        console.error('Payment email failed:', err.message)
      );
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Safepay webhook error:', error);
    res.status(500).json({ success: false });
  }
});

/* ─── POST /api/checkout/webhook/jazzcash — JazzCash Webhook ── */
router.post('/webhook/jazzcash', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const payload = req.body;
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

    if (!verifyJazzCashSignature(payload, integritySalt)) {
      console.warn('⚠️  JazzCash webhook: invalid signature');
      return res.status(401).send('Invalid signature');
    }

    const billRef = payload.pp_BillReference;
    const responseCode = payload.pp_ResponseCode;
    const txnRef = payload.pp_TxnRefNo;

    const order = await Order.findOne({ orderId: billRef });
    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (responseCode === '000') {
      // Success
      order.paymentStatus = 'paid';
      order.paymentVerifiedAt = new Date();
      order.orderStatus = 'confirmed';
      order.paymentReference = txnRef;
      order.webhookPayload = payload;
      await order.save();

      sendPaymentSuccessEmail(order).catch((err) =>
        console.error('Payment email failed:', err.message)
      );
    } else {
      order.paymentStatus = 'failed';
      order.webhookPayload = payload;
      await order.save();
    }

    // Redirect customer to confirmation page
    const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://daralghuraba.com').replace(/\/$/, '');
    res.redirect(`${siteUrl}/order-confirmation.html?orderId=${billRef}`);
  } catch (error) {
    console.error('JazzCash webhook error:', error);
    res.status(500).send('Internal error');
  }
});

/* ─── POST /api/checkout/webhook/easypaisa — Easypaisa Webhook ── */
router.post('/webhook/easypaisa', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const payload = req.body;
    const hashKey = process.env.EASYPAISA_HASH_KEY;

    if (!verifyEasypaisaSignature(payload, hashKey)) {
      console.warn('⚠️  Easypaisa webhook: invalid signature');
      return res.status(401).send('Invalid signature');
    }

    const orderRef = payload.orderRefNum;
    const responseCode = payload.responseCode;

    const order = await Order.findOne({ orderId: orderRef });
    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (responseCode === '0000') {
      order.paymentStatus = 'paid';
      order.paymentVerifiedAt = new Date();
      order.orderStatus = 'confirmed';
      order.paymentReference = payload.transactionRefNumber || '';
      order.webhookPayload = payload;
      await order.save();

      sendPaymentSuccessEmail(order).catch((err) =>
        console.error('Payment email failed:', err.message)
      );
    } else {
      order.paymentStatus = 'failed';
      order.webhookPayload = payload;
      await order.save();
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://daralghuraba.com').replace(/\/$/, '');
    res.redirect(`${siteUrl}/order-confirmation.html?orderId=${orderRef}`);
  } catch (error) {
    console.error('Easypaisa webhook error:', error);
    res.status(500).send('Internal error');
  }
});

/* ─── GET /api/checkout/verify/:orderId — Server-Side Verification ── */
router.get(
  '/verify/:orderId',
  param('orderId').trim().notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      res.json({
        success: true,
        data: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          paymentVerifiedAt: order.paymentVerifiedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/* ─── GET /api/checkout/order/:orderId — Customer Order View ── */
router.get(
  '/order/:orderId',
  param('orderId').trim().notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Return only safe customer-facing data
      res.json({
        success: true,
        data: {
          orderId: order.orderId,
          customer: {
            name: order.customer.name,
            email: order.customer.email,
            city: order.customer.city,
            country: order.customer.country,
          },
          items: order.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            price: item.priceAtPurchase,
          })),
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          shippingDetails: order.shippingDetails,
          createdAt: order.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
