/* ============================================================
   Dar Al Ghuraba Books — Email Service (Resend)
   ============================================================
   Sends transactional emails for order confirmations.
   Uses Resend API for reliable delivery.
   
   Setup: Set RESEND_API_KEY and RESEND_FROM_EMAIL in .env
   Verify your domain at resend.com for production use.
   ============================================================ */
const { Resend } = require('resend');

let resend = null;

/**
 * Initialize Resend client lazily (only when first email is sent).
 * This prevents startup failures if API key isn't configured yet.
 */
function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Check if email service is configured.
 */
function isEmailConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

/**
 * Send order confirmation email to customer.
 * @param {Object} order - The order document from MongoDB
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendOrderConfirmationEmail(order) {
  const client = getResendClient();
  if (!client) {
    console.warn('⚠️  Resend not configured — skipping order confirmation email');
    return { success: false, error: 'Email service not configured' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@daralghuraba.com';
  const storeName = 'Dar Al Ghuraba Books';

  try {
    const itemsHTML = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">Rs. ${item.priceAtPurchase.toLocaleString()}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">Rs. ${(item.priceAtPurchase * item.quantity).toLocaleString()}</td>
        </tr>`
      )
      .join('');

    const paymentMethodLabel = {
      safepay: 'Credit/Debit Card (Safepay)',
      jazzcash: 'JazzCash',
      easypaisa: 'Easypaisa',
      cod: 'Cash on Delivery',
      whatsapp: 'WhatsApp Order',
    }[order.paymentMethod] || order.paymentMethod;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1B6B3A 0%, #0d4a25 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 1px;">🕌 ${storeName}</h1>
          <p style="color: #e8e8e8; margin: 8px 0 0; font-size: 14px;">Order Confirmation</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 32px 24px 16px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0;">
            Assalamu Alaikum <strong>${order.customer.name}</strong>,
          </p>
          <p style="color: #4b5563; font-size: 14px; margin: 12px 0 0;">
            JazakAllah Khair for your order! Your order has been placed successfully. Here are the details:
          </p>
        </div>

        <!-- Order Info -->
        <div style="padding: 0 24px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Order ID</td>
                <td style="color: #1f2937; font-weight: 600; font-size: 13px; text-align: right;">${order.orderId}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Date</td>
                <td style="color: #1f2937; font-size: 13px; text-align: right;">${new Date(order.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Payment Method</td>
                <td style="color: #1f2937; font-size: 13px; text-align: right;">${paymentMethodLabel}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Payment Status</td>
                <td style="text-align: right;">
                  <span style="background-color: ${order.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7'}; color: ${order.paymentStatus === 'paid' ? '#166534' : '#92400e'}; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                    ${order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                  </span>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Items Table -->
        <div style="padding: 0 24px;">
          <h3 style="color: #1f2937; font-size: 15px; margin: 0 0 12px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Item</th>
                <th style="padding: 10px 12px; text-align: center; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 10px 12px; text-align: right; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="padding: 16px 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Subtotal</td>
              <td style="padding: 6px 0; text-align: right; color: #1f2937;">Rs. ${order.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Shipping</td>
              <td style="padding: 6px 0; text-align: right; color: #1f2937;">Rs. ${order.shippingCost.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #1B6B3A; font-weight: 700; font-size: 16px; border-top: 2px solid #1B6B3A;">Total</td>
              <td style="padding: 10px 0; text-align: right; color: #1B6B3A; font-weight: 700; font-size: 16px; border-top: 2px solid #1B6B3A;">Rs. ${order.totalAmount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <!-- Shipping Address -->
        <div style="padding: 0 24px 24px;">
          <h3 style="color: #1f2937; font-size: 15px; margin: 0 0 8px;">Shipping Address</h3>
          <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.6;">
            ${order.customer.name}<br>
            ${order.customer.address}<br>
            ${order.customer.city}${order.customer.state ? ', ' + order.customer.state : ''} ${order.customer.postalCode}<br>
            ${order.customer.country}<br>
            📞 ${order.customer.phone}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            If you have any questions about your order, please contact us via WhatsApp or email.
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin: 12px 0 0;">
            © ${new Date().getFullYear()} ${storeName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>`;

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: [order.customer.email],
      subject: `Order Confirmed — ${order.orderId} | ${storeName}`,
      html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Order confirmation email sent to ${order.customer.email} (ID: ${data.id})`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send payment success notification email.
 * @param {Object} order - The order document
 */
async function sendPaymentSuccessEmail(order) {
  const client = getResendClient();
  if (!client) return { success: false, error: 'Email service not configured' };

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@daralghuraba.com';
  const storeName = 'Dar Al Ghuraba Books';

  try {
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1B6B3A 0%, #0d4a25 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">🕌 ${storeName}</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 32px;">✅</span>
          </div>
          <h2 style="color: #166534; margin: 0 0 8px;">Payment Successful!</h2>
          <p style="color: #4b5563; font-size: 14px; margin: 0;">
            Your payment of <strong>Rs. ${order.totalAmount.toLocaleString()}</strong> for order <strong>${order.orderId}</strong> has been received.
          </p>
          <p style="color: #4b5563; font-size: 14px; margin: 16px 0 0;">
            We are now processing your order and will notify you when it ships.
          </p>
          ${order.paymentReference ? `<p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0;">Transaction ID: ${order.paymentReference}</p>` : ''}
        </div>
        <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ${storeName}</p>
        </div>
      </div>
    </body>
    </html>`;

    const { data, error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to: [order.customer.email],
      subject: `Payment Received — ${order.orderId} | ${storeName}`,
      html,
    });

    if (error) {
      console.error('❌ Payment email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Payment email error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  isEmailConfigured,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
};
