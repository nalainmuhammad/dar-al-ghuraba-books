/* ============================================================
   Dar Al Ghuraba Books — Order Confirmation Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initConfirmation();
});

async function initConfirmation() {
  const container = document.getElementById('conf-card');
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (!orderId) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2 style="color: #fff; font-family: 'Cinzel', serif;">No Order Specified</h2>
        <p style="color: var(--conf-muted); margin: 12px 0 24px;">Please check the link or return to the bookstore.</p>
        <a href="/" class="conf-btn conf-btn-primary">Return to Store</a>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`/api/checkout/order/${encodeURIComponent(orderId)}`);
    const json = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.message || 'Order could not be retrieved.');
    }

    const order = json.data;
    renderConfirmationDetails(order);
  } catch (err) {
    console.error('Order fetch error:', err);
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2 style="color: #ff8585; font-family: 'Cinzel', serif;">Order Not Found</h2>
        <p style="color: var(--conf-muted); margin: 12px 0 24px;">
          We couldn't load details for order <strong>${escapeHtml(orderId)}</strong>.<br>
          If you have placed an order, please reach out to us with your Order ID on WhatsApp.
        </p>
        <a href="/" class="conf-btn conf-btn-primary">Return to Store</a>
      </div>
    `;
  }
}

function renderConfirmationDetails(order) {
  const container = document.getElementById('conf-card');
  const isPaid = order.paymentStatus === 'paid';
  const paymentMethodLabels = {
    safepay: 'Visa / Mastercard (Safepay)',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    cod: 'Cash on Delivery (COD)',
    whatsapp: 'Direct WhatsApp Confirmation',
  };

  const paymentLabel = paymentMethodLabels[order.paymentMethod] || order.paymentMethod;

  const itemsHtml = order.items.map((item) => {
    const itemTotal = (item.priceAtPurchase || 0) * (item.quantity || 1);
    return `
      <div class="conf-item-row">
        <div>
          <div class="conf-item-name">${escapeHtml(item.title)}</div>
          <div class="conf-item-qty">Qty: ${item.quantity} × Rs. ${item.priceAtPurchase.toLocaleString()}</div>
        </div>
        <div style="font-weight: 600; color: #fff;">Rs. ${itemTotal.toLocaleString()}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Hero Banner -->
    <div class="conf-hero">
      <div class="conf-icon-circle">
        ${isPaid ? '✓' : '📦'}
      </div>
      <h1 class="conf-title">
        ${isPaid ? 'Payment Successful & Order Confirmed!' : 'Order Placed Successfully!'}
      </h1>
      <p class="conf-subtitle">
        JazakAllah Khair for your purchase. We have received your order and a confirmation receipt has been dispatched to <strong>${escapeHtml(order.customer.email)}</strong>.
      </p>

      <div class="order-id-badge">
        <span>Order ID: <strong>${escapeHtml(order.orderId)}</strong></span>
        <button class="btn-copy" onclick="copyOrderId('${escapeHtml(order.orderId)}')">Copy</button>
      </div>
    </div>

    <!-- Details Grid -->
    <div class="conf-grid">
      <!-- Shipping Address -->
      <div class="info-block">
        <div class="info-block-title">Shipping Address</div>
        <div class="info-block-content">
          <strong>${escapeHtml(order.customer.name)}</strong><br>
          ${escapeHtml(order.customer.address)}<br>
          ${escapeHtml(order.customer.city)}${order.customer.postalCode ? ' - ' + escapeHtml(order.customer.postalCode) : ''}<br>
          ${escapeHtml(order.customer.country)}<br>
          📞 ${escapeHtml(order.customer.phone)}
        </div>
      </div>

      <!-- Payment & Status -->
      <div class="info-block">
        <div class="info-block-title">Payment & Status</div>
        <div class="info-block-content">
          <div style="margin-bottom: 8px;">
            <strong>Method:</strong> ${escapeHtml(paymentLabel)}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Payment Status:</strong> 
            <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
              ${escapeHtml(order.paymentStatus)}
            </span>
          </div>
          <div>
            <strong>Order Status:</strong> 
            <span class="status-pill" style="background: rgba(255,255,255,0.08); color: #fff;">
              ${escapeHtml(order.orderStatus)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items List -->
    <div class="conf-items">
      <div class="conf-items-title">Items Ordered</div>
      ${itemsHtml}

      <!-- Totals -->
      <div class="conf-totals">
        <div class="conf-totals-row">
          <span>Subtotal</span>
          <span>Rs. ${order.subtotal.toLocaleString()}</span>
        </div>
        <div class="conf-totals-row">
          <span>Shipping (${order.customer.countryCode === 'PK' ? 'Domestic' : 'Air Parcel'})</span>
          <span>Rs. ${order.shippingCost.toLocaleString()}</span>
        </div>
        <div class="conf-totals-row grand-total">
          <span>Total</span>
          <span>Rs. ${order.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="conf-actions">
      <a href="/" class="conf-btn conf-btn-primary">Continue Shopping</a>
      <a href="https://wa.me/923708998986?text=${encodeURIComponent(`Assalamu Alaikum, I am inquiring about my Order ${order.orderId}`)}" target="_blank" rel="noopener noreferrer" class="conf-btn conf-btn-outline">
        WhatsApp Support
      </a>
    </div>
  `;
}

function copyOrderId(id) {
  navigator.clipboard.writeText(id).then(() => {
    alert('Order ID copied to clipboard: ' + id);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
