/* ============================================================
   Dar Al Ghuraba Books — Checkout Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
});

let cart = [];
let shippingCost = 225; // default PK domestic up to 1kg
let subtotal = 0;
let totalWeightGrams = 0;
let availableCountries = [];

async function initCheckout() {
  // 1. Load Cart
  const savedCart = localStorage.getItem('darAlGhurabaCart');
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch (e) {
      cart = [];
    }
  }

  if (!cart || cart.length === 0) {
    showEmptyCart();
    return;
  }

  // 2. Render Order Summary
  renderOrderSummary();

  // 3. Load Shipping Destinations
  await loadDestinations();

  // 4. Attach Event Listeners
  setupEventListeners();

  // 5. Initial Shipping Calculation
  await updateShippingCalculation();
}

function showEmptyCart() {
  const container = document.querySelector('.checkout-container');
  if (container) {
    container.innerHTML = `
      <div class="checkout-panel empty-cart-state" style="grid-column: 1 / -1; max-width: 600px; margin: 60px auto;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🛒</div>
        <h2 style="font-family: 'Cinzel', serif; color: #fff; margin-bottom: 8px;">Your Cart is Empty</h2>
        <p style="color: var(--checkout-muted);">You haven't added any books or products to your cart yet.</p>
        <a href="/catalog.html" class="btn btn-primary" style="margin-top: 20px; display: inline-block; padding: 12px 28px; background: var(--checkout-gold); color: #0d1310; border-radius: 8px; font-weight: 600; text-decoration: none;">
          Explore Our Catalog
        </a>
      </div>
    `;
  }
}

function renderOrderSummary() {
  const itemsContainer = document.getElementById('summary-items-list');
  const countDisplay = document.getElementById('cart-item-count');
  const subtotalDisplay = document.getElementById('summary-subtotal');
  const weightDisplay = document.getElementById('total-weight-display');

  if (!itemsContainer) return;

  subtotal = 0;
  totalWeightGrams = 0;
  let totalCount = 0;

  itemsContainer.innerHTML = cart.map((item) => {
    const itemPrice = parseFloat(item.price) || 0;
    const itemQty = parseInt(item.quantity, 10) || 1;
    const itemTotal = itemPrice * itemQty;
    const itemWeight = (parseInt(item.weight, 10) || 500) * itemQty;

    subtotal += itemTotal;
    totalWeightGrams += itemWeight;
    totalCount += itemQty;

    const thumbHtml = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="${item.title}" class="summary-item-thumb">`
      : `<div class="summary-item-thumb" style="display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📖</div>`;

    return `
      <div class="summary-item">
        ${thumbHtml}
        <div class="summary-item-info">
          <div class="summary-item-title" title="${item.title}">${item.title}</div>
          <div class="summary-item-meta">Qty: ${itemQty} × Rs. ${itemPrice.toFixed(0)}</div>
        </div>
        <div class="summary-item-price">Rs. ${itemTotal.toFixed(0)}</div>
      </div>
    `;
  }).join('');

  if (countDisplay) {
    countDisplay.textContent = `(${totalCount} ${totalCount === 1 ? 'item' : 'items'})`;
  }
  if (subtotalDisplay) {
    subtotalDisplay.textContent = `Rs. ${subtotal.toLocaleString()}`;
  }
  if (weightDisplay) {
    weightDisplay.textContent = `${(totalWeightGrams / 1000).toFixed(2)} kg`;
  }
}

async function loadDestinations() {
  const select = document.getElementById('cust-country');
  if (!select) return;

  try {
    const res = await fetch('/api/shipping/countries');
    const json = await res.json();

    if (json.success && json.data) {
      availableCountries = json.data;

      // Keep Pakistan as first option, append international
      select.innerHTML = '';

      // Domestic
      const optPk = document.createElement('option');
      optPk.value = 'PK';
      optPk.dataset.code = 'PK';
      optPk.textContent = '🇵🇰 Pakistan (Domestic Delivery)';
      optPk.selected = true;
      select.appendChild(optPk);

      // International
      const intlOptGroup = document.createElement('optgroup');
      intlOptGroup.label = 'International Destinations (Air Parcel)';

      availableCountries
        .filter((c) => c.code !== 'PK')
        .forEach((country) => {
          const opt = document.createElement('option');
          opt.value = country.code;
          opt.dataset.code = country.code;
          opt.textContent = `${country.name} (${country.code})`;
          intlOptGroup.appendChild(opt);
        });

      select.appendChild(intlOptGroup);
    }
  } catch (err) {
    console.warn('Could not load shipping destinations list, using default.', err);
  }
}

function setupEventListeners() {
  // Country change listener
  const countrySelect = document.getElementById('cust-country');
  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      const isPk = countrySelect.value === 'PK';
      const codWrap = document.getElementById('cod-option-wrap');
      const codRadio = document.getElementById('pay-cod');

      if (codWrap) {
        if (!isPk) {
          codWrap.style.opacity = '0.4';
          codWrap.style.pointerEvents = 'none';
          if (codRadio && codRadio.checked) {
            document.getElementById('pay-safepay').checked = true;
            updatePaymentSelection();
          }
        } else {
          codWrap.style.opacity = '1';
          codWrap.style.pointerEvents = 'auto';
        }
      }

      updateShippingCalculation();
    });
  }

  // Payment option radio selection styles
  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', updatePaymentSelection);
  });

  // Submit Order button
  const placeOrderBtn = document.getElementById('btn-place-order');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
  }
}

function updatePaymentSelection() {
  document.querySelectorAll('.payment-option').forEach((opt) => {
    const radio = opt.querySelector('input[type="radio"]');
    if (radio && radio.checked) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

async function updateShippingCalculation() {
  const countryCode = document.getElementById('cust-country')?.value || 'PK';
  const shippingDisplay = document.getElementById('summary-shipping');
  const totalDisplay = document.getElementById('summary-total');
  const tagDisplay = document.getElementById('shipping-method-tag');

  try {
    const res = await fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        totalWeightGrams,
      }),
    });

    const json = await res.json();
    if (json.success && json.data) {
      shippingCost = json.data.shippingCost;
      if (shippingDisplay) shippingDisplay.textContent = `Rs. ${shippingCost.toLocaleString()}`;
      if (tagDisplay) tagDisplay.textContent = json.data.method === 'domestic' ? 'Domestic' : 'Air Parcel';
      
      const grandTotal = subtotal + shippingCost;
      if (totalDisplay) totalDisplay.textContent = `Rs. ${grandTotal.toLocaleString()}`;
    }
  } catch (err) {
    console.error('Shipping calculation error:', err);
  }
}

function showAlert(message, type = 'error') {
  const alertBox = document.getElementById('checkout-alert');
  if (!alertBox) return;

  alertBox.className = `checkout-alert ${type}`;
  alertBox.textContent = message;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function handlePlaceOrder(e) {
  e.preventDefault();

  const name = document.getElementById('cust-name')?.value.trim();
  const email = document.getElementById('cust-email')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const address = document.getElementById('cust-address')?.value.trim();
  const city = document.getElementById('cust-city')?.value.trim();
  const postalCode = document.getElementById('cust-postal')?.value.trim() || '';
  const countrySelect = document.getElementById('cust-country');
  const country = countrySelect?.options[countrySelect.selectedIndex]?.text.split('(')[0].trim() || 'Pakistan';
  const countryCode = countrySelect?.value || 'PK';
  const notes = document.getElementById('cust-notes')?.value.trim() || '';

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'safepay';

  // Validation
  if (!name) return showAlert('Please enter your full name.');
  if (!email || !email.includes('@')) return showAlert('Please enter a valid email address.');
  if (!phone) return showAlert('Please enter your WhatsApp or phone number.');
  if (!address) return showAlert('Please enter your delivery street address.');
  if (!city) return showAlert('Please enter your city.');

  if (!cart || cart.length === 0) {
    return showAlert('Your cart is empty. Please add items before checking out.');
  }

  const placeOrderBtn = document.getElementById('btn-place-order');
  const btnText = document.getElementById('place-order-text');

  try {
    placeOrderBtn.disabled = true;
    btnText.textContent = 'Processing Order...';

    // 1. Create Order in Backend (server recalculates all prices)
    const orderPayload = {
      items: cart.map((i) => ({
        productId: i.id,
        quantity: parseInt(i.quantity, 10) || 1,
      })),
      customer: {
        name,
        email,
        phone,
        address,
        city,
        postalCode,
        country,
        countryCode,
      },
      paymentMethod,
      notes,
    };

    const orderRes = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    const orderJson = await orderRes.json();
    if (!orderJson.success) {
      throw new Error(orderJson.message || 'Failed to create order.');
    }

    const { orderId } = orderJson.data;

    // 2. Clear Cart once order is created in database
    localStorage.removeItem('darAlGhurabaCart');

    // 3. Initiate Payment Gateway
    btnText.textContent = 'Connecting to Payment...';

    const payRes = await fetch('/api/checkout/initiate-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        paymentMethod,
      }),
    });

    const payJson = await payRes.json();
    if (!payJson.success) {
      throw new Error(payJson.message || 'Payment initiation failed.');
    }

    const payData = payJson.data;

    // ── Safepay ──
    if (paymentMethod === 'safepay') {
      const redirect = payData.redirectUrl || payData.checkoutUrl;
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      throw new Error('Safepay checkout URL was not generated.');
    }

    // ── JazzCash / Easypaisa (Auto POST Form) ──
    if (paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') {
      if (payData.formAction && payData.formData) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payData.formAction;

        for (const [key, val] of Object.entries(payData.formData)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }
      throw new Error('Payment gateway submission details missing.');
    }

    // ── Cash on Delivery ──
    if (paymentMethod === 'cod') {
      window.location.href = `/order-confirmation.html?orderId=${encodeURIComponent(orderId)}`;
      return;
    }

    // ── WhatsApp ──
    if (paymentMethod === 'whatsapp') {
      let whatsappNumber = '923708998986';
      try {
        const cfgRes = await fetch('/api/config');
        const cfg = await cfgRes.json();
        if (cfg.data?.whatsappNumber) whatsappNumber = cfg.data.whatsappNumber;
      } catch {}

      let msg = `Assalamu Alaikum! I have created Order *${orderId}* on your website:%0A%0A`;
      msg += `Name: ${name}%0A`;
      msg += `City: ${city}, ${country}%0A`;
      msg += `Total Amount: Rs. ${(subtotal + shippingCost).toLocaleString()}%0A%0A`;
      msg += `Please confirm payment & dispatch details. JazakAllah Khair!`;

      window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
      window.location.href = `/order-confirmation.html?orderId=${encodeURIComponent(orderId)}`;
      return;
    }

    // Fallback
    window.location.href = `/order-confirmation.html?orderId=${encodeURIComponent(orderId)}`;
  } catch (error) {
    console.error('Order error:', error);
    showAlert(error.message || 'Something went wrong while placing your order. Please try again.');
    placeOrderBtn.disabled = false;
    btnText.textContent = 'Place Order & Pay';
  }
}
