/* ============================================================
   Dar Al Ghuraba Books — Shopping Cart Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCart();
});

let cart = [];

function initCart() {
  const savedCart = localStorage.getItem('darAlGhurabaCart');
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch (e) {
      cart = [];
    }
  }

  // Inject Cart UI if not present
  if (!document.getElementById('cart-drawer')) {
    injectCartUI();
  }

  updateCartUI();
  
  // Attach event listeners for cart UI
  document.getElementById('cart-toggle')?.addEventListener('click', () => toggleCart(true));
  document.getElementById('cart-close')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-overlay')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-checkout-btn')?.addEventListener('click', checkoutCart);
}

function injectCartUI() {
  // Add Cart icon to navbar
  const navActions = document.querySelector('.nav-actions');
  if (navActions) {
    const cartBtn = document.createElement('button');
    cartBtn.id = 'cart-toggle';
    cartBtn.className = 'cart-toggle theme-toggle'; // reuse some styles
    cartBtn.setAttribute('aria-label', 'Open Cart');
    cartBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 4px;">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span class="cart-badge" id="cart-badge">0</span>
    `;
    // Insert before mobile toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    if (mobileToggle) {
      mobileToggle.before(cartBtn);
    } else {
      navActions.prepend(cartBtn);
    }
  }

  // Add Cart Drawer
  const cartDrawerHTML = `
    <div class="cart-overlay" id="cart-overlay"></div>
    <div class="cart-drawer" id="cart-drawer">
      <div class="cart-header">
        <h2>Your Cart</h2>
        <button class="cart-close" id="cart-close">&times;</button>
      </div>
      <div class="cart-body" id="cart-items-container">
        <!-- Cart items will be rendered here -->
      </div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <span>Total:</span>
          <span class="cart-total-price">Rs. <span id="cart-total-amount">0</span></span>
        </div>
        <button class="btn btn-primary" id="cart-checkout-btn" style="width: 100%;">
          Order via WhatsApp
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', cartDrawerHTML);
  
  // Re-attach listeners since we just injected HTML
  document.getElementById('cart-toggle')?.addEventListener('click', () => toggleCart(true));
  document.getElementById('cart-close')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-overlay')?.addEventListener('click', () => toggleCart(false));
  document.getElementById('cart-checkout-btn')?.addEventListener('click', checkoutCart);
}

window.addToCart = function (book) {
  const existingItem = cart.find(item => item.id === book.id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: book.id,
      title: book.title,
      price: book.price,
      imageUrl: book.imageUrl,
      slug: book.slug,
      quantity: 1
    });
  }
  
  saveCart();
  updateCartUI();
  toggleCart(true); // Open cart when item added
};

window.removeFromCart = function (bookId) {
  cart = cart.filter(item => item.id !== bookId);
  saveCart();
  updateCartUI();
};

window.updateQuantity = function (bookId, delta) {
  const item = cart.find(item => item.id === bookId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(bookId);
    } else {
      saveCart();
      updateCartUI();
    }
  }
};

function saveCart() {
  localStorage.setItem('darAlGhurabaCart', JSON.stringify(cart));
}

function updateCartUI() {
  const badge = document.getElementById('cart-badge');
  const container = document.getElementById('cart-items-container');
  const totalAmount = document.getElementById('cart-total-amount');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (!badge || !container || !totalAmount) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;
  
  if (totalItems > 0) {
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p></div>';
    totalAmount.textContent = '0';
    if(checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if(checkoutBtn) checkoutBtn.disabled = false;

  let total = 0;

  // Build cart items using event delegation instead of inline onclick
  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="cart-item" data-item-id="${item.id}">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="cart-item-image">` : `<div class="cart-item-image-placeholder">📖</div>`}
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.title}</h4>
          <div class="cart-item-price">Rs. ${parseFloat(item.price).toFixed(2)}</div>
          <div class="cart-item-actions">
            <div class="quantity-controls">
              <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
            </div>
            <button class="cart-item-remove" data-action="remove" data-id="${item.id}">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  totalAmount.textContent = parseFloat(total).toFixed(2);

  // Attach event delegation to the cart container for buttons
  container.addEventListener('click', handleCartAction);
}

function handleCartAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const bookId = btn.dataset.id;

  if (action === 'remove') {
    window.removeFromCart(bookId);
  } else if (action === 'decrease') {
    window.updateQuantity(bookId, -1);
  } else if (action === 'increase') {
    window.updateQuantity(bookId, 1);
  }
}

function toggleCart(open) {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  
  if (!drawer || !overlay) return;

  if (open) {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

async function checkoutCart() {
  if (cart.length === 0) return;

  try {
    let whatsappNumber = '923708998986';
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      if (config.data?.whatsappNumber) {
        whatsappNumber = config.data.whatsappNumber;
      }
    } catch (configErr) {
      // Use default number if config endpoint fails
    }
    
    let message = "Assalamu Alaikum, I would like to place an order from Dar Al Ghuraba Books:%0A%0A";
    
    let total = 0;
    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      message += `${index + 1}. *${item.title}*%0A   Qty: ${item.quantity} x Rs. ${item.price} = Rs. ${itemTotal}%0A`;
    });
    
    message += `%0A*Total Amount: Rs. ${total}*%0A%0APlease let me know the payment and delivery details. JazakAllah Khair.`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('Failed to initiate checkout. Please try again.');
  }
}
