/* ============================================================
   Dar Al Ghuraba Books — Reusable UI Components
   ============================================================
   Updated to work with the async API client (books.js).
   Carousel and Catalog now fetch data from the server.
   ============================================================ */

/* ─── Book Card Renderer ────────────────────────────────── */
function renderBookCard(book, extraClass = '') {
  const whatsappURL = getWhatsAppURL(book.title);
  const bookId = book._id || book.id;

  // Use imageUrl if available, otherwise fall back to CSS gradient cover
  const coverContent = book.imageUrl
    ? `<img src="${book.imageUrl}" alt="${book.title}" class="book-cover-img" loading="lazy">`
    : `<div class="book-cover-art" style="background: linear-gradient(135deg, ${book.color}, ${adjustColor(book.color, -30)});">
        <span class="book-icon">📖</span>
        <span class="book-cover-title">${book.title}</span>
        <span class="book-cover-author">${book.author}</span>
      </div>`;

  return `
    <div class="book-card ${extraClass}" id="book-${bookId}" data-book-id="${bookId}">
      <div class="book-card-image">
        ${coverContent}
        ${book.featured ? '<span class="book-card-badge">Featured</span>' : ''}
        ${book.inStock === false ? '<span class="book-card-badge" style="background: #E74C3C;">Out of Stock</span>' : ''}
      </div>
      <div class="book-card-body">
        <span class="book-card-category">${book.category}</span>
        <h3 class="book-card-title">${book.title}</h3>
        <p class="book-card-author">by ${book.author}</p>
        <div class="book-card-footer">
          <span class="book-card-price"><span class="currency">Rs.</span>${parseFloat(book.price).toFixed(2)}</span>
          <a href="${whatsappURL}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm book-card-order-btn" aria-label="Order ${book.title} via WhatsApp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Order
          </a>
        </div>
      </div>
    </div>
  `;
}

/* ─── Color helper ──────────────────────────────────────── */
function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  let r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  let g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  let b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/* ─── Loading Spinner ───────────────────────────────────── */
function showLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-spinner" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
      <div style="width: 40px; height: 40px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
      <p style="color: var(--text-muted); font-size: 0.95rem;">Loading books...</p>
    </div>
  `;
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}

/* ─── Book Detail Modal ─────────────────────────────────── */
let _bookDetailOverlay = null;

function ensureBookDetailOverlay() {
  if (_bookDetailOverlay) return _bookDetailOverlay;

  const overlay = document.createElement('div');
  overlay.className = 'book-detail-overlay';
  overlay.id = 'book-detail-overlay';
  overlay.innerHTML = '<div class="book-detail-card" id="book-detail-card"></div>';
  document.body.appendChild(overlay);

  // Close on overlay click (not on card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBookDetail();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeBookDetail();
    }
  });

  _bookDetailOverlay = overlay;
  return overlay;
}

async function openBookDetail(bookId) {
  const overlay = ensureBookDetailOverlay();
  const card = document.getElementById('book-detail-card');

  // Show overlay with loading state
  card.innerHTML = `
    <div style="padding: 60px; text-align: center;">
      <div style="width: 40px; height: 40px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-emerald); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;"></div>
      <p style="color: var(--text-muted);">Loading book details...</p>
    </div>`;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API_BASE}/books/${bookId}`);
    const data = await res.json();

    if (!data.success) throw new Error('Book not found');

    const book = data.data;
    const whatsappURL = getWhatsAppURL(book.title);

    const coverHTML = book.imageUrl
      ? `<img src="${book.imageUrl}" alt="${book.title}">`
      : `<div class="book-cover-art" style="background: linear-gradient(135deg, ${book.color || '#1B6B3A'}, ${adjustColor(book.color || '#1B6B3A', -30)});">
          <span class="book-icon">📖</span>
          <span class="book-cover-title">${book.title}</span>
          <span class="book-cover-author">${book.author}</span>
        </div>`;

    card.innerHTML = `
      <button class="book-detail-close" id="book-detail-close" aria-label="Close">✕</button>
      <div class="book-detail-cover">${coverHTML}</div>
      <div class="book-detail-body">
        <div class="book-detail-badges">
          <span class="book-detail-badge book-detail-badge-category">${book.category}</span>
          ${book.featured ? '<span class="book-detail-badge book-detail-badge-featured">⭐ Featured</span>' : ''}
          ${book.inStock !== false
            ? '<span class="book-detail-badge book-detail-badge-stock">In Stock</span>'
            : '<span class="book-detail-badge book-detail-badge-out">Out of Stock</span>'}
        </div>
        <h2 class="book-detail-title">${book.title}</h2>
        <p class="book-detail-author">by ${book.author}</p>
        <div class="book-detail-meta">
          <div class="book-detail-meta-item">
            <span class="book-detail-meta-label">Category</span>
            <span class="book-detail-meta-value">${book.category}</span>
          </div>
          <div class="book-detail-meta-item">
            <span class="book-detail-meta-label">Language</span>
            <span class="book-detail-meta-value">${book.language || 'English'}</span>
          </div>
          <div class="book-detail-meta-item">
            <span class="book-detail-meta-label">Price</span>
            <span class="book-detail-meta-value">Rs. ${parseFloat(book.price).toFixed(2)}</span>
          </div>
        </div>
        <p class="book-detail-description">${book.description}</p>
        <div class="book-detail-footer">
          <span class="book-detail-price"><span class="currency">Rs.</span>${parseFloat(book.price).toFixed(2)}</span>
          <a href="${whatsappURL}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Order via WhatsApp
          </a>
        </div>
      </div>
    `;

    document.getElementById('book-detail-close').addEventListener('click', closeBookDetail);
  } catch (error) {
    card.innerHTML = `
      <button class="book-detail-close" id="book-detail-close" aria-label="Close">✕</button>
      <div style="padding: 60px; text-align: center;">
        <p style="font-size: 2rem; margin-bottom: 12px;">😔</p>
        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Could not load book details</h3>
        <p style="color: var(--text-muted);">${error.message}</p>
      </div>`;
    document.getElementById('book-detail-close').addEventListener('click', closeBookDetail);
  }
}

function closeBookDetail() {
  const overlay = document.getElementById('book-detail-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ─── Book Card Click Delegation ────────────────────────── */
function initBookCardClicks(container) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    // Don't intercept Order button clicks
    if (e.target.closest('.book-card-order-btn')) return;

    const card = e.target.closest('.book-card[data-book-id]');
    if (card) {
      openBookDetail(card.dataset.bookId);
    }
  });
}

/* ─── Featured Carousel (Async + Touch Swipe) ───────────── */
async function initCarousel() {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!track) return;

  showLoading(track);

  const featured = await getFeaturedBooks();

  if (!featured.length) {
    track.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 40px;">No featured books available.</p>';
    return;
  }

  track.innerHTML = featured.map(b => renderBookCard(b)).join('');

  // Attach book card click delegation
  initBookCardClicks(track);

  /* Arrow buttons for native scroll */
  const wrapper = track.parentElement;
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      wrapper.scrollBy({ left: -304, behavior: 'smooth' }); // 280 width + 24 gap
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      wrapper.scrollBy({ left: 304, behavior: 'smooth' });
    });
  }
}



/* ─── Categories Renderer ───────────────────────────────── */
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;

  const categoryData = [
    { name: 'Quran', icon: '📖', desc: 'Tafsir, translations, and Tajweed' },
    { name: 'Hadith', icon: '📜', desc: 'Authentic Hadith collections' },
    { name: 'Seerah', icon: '🕌', desc: 'Prophetic biography & companions' },
    { name: 'Fiqh', icon: '⚖️', desc: 'Islamic jurisprudence & rulings' },
    { name: 'Aqeedah', icon: '🕋', desc: 'Islamic creed & theology' },
    { name: 'Islamic Clothing', icon: '👕', desc: 'Premium Kufis, modest wear & accessories' }
  ];

  grid.innerHTML = categoryData.map((cat, i) => `
    <a href="catalog.html?category=${encodeURIComponent(cat.name)}" class="category-card glass-card reveal reveal-delay-${i + 1}">
      <span class="category-icon">${cat.icon}</span>
      <h3>${cat.name}</h3>
      <p>${cat.desc}</p>
    </a>
  `).join('');

  initScrollReveal();
}

/* ─── Catalog Page Logic (Async — API-Driven) ───────────── */
async function initCatalog() {
  const grid = document.getElementById('books-grid');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('filter-category');
  const authorFilter = document.getElementById('filter-author');
  const languageFilter = document.getElementById('filter-language');
  const sortSelect = document.getElementById('sort-select');
  const resultsCount = document.getElementById('results-count');
  const paginationContainer = document.getElementById('pagination');

  if (!grid) return;

  // Attach book card click delegation for catalog grid
  initBookCardClicks(grid);

  const filterOptions = await getFilterOptions();

  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      filterOptions.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  if (authorFilter) {
    authorFilter.innerHTML = '<option value="">All Authors</option>' +
      filterOptions.authors.map(a => `<option value="${a}">${a}</option>`).join('');
  }

  if (languageFilter) {
    languageFilter.innerHTML = '<option value="">All Languages</option>' +
      filterOptions.languages.map(l => `<option value="${l}">${l}</option>`).join('');
  }

  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get('category');
  if (initialCategory && categoryFilter) {
    categoryFilter.value = initialCategory;
  }

  const ITEMS_PER_PAGE = 12;
  let currentPage = 1;

  async function render() {
    showLoading(grid);

    const queryParams = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };

    const query = searchInput ? searchInput.value.trim() : '';
    if (query) queryParams.search = query;

    const cat = categoryFilter ? categoryFilter.value : '';
    if (cat) queryParams.category = cat;

    const auth = authorFilter ? authorFilter.value : '';
    if (auth) queryParams.author = auth;

    const lang = languageFilter ? languageFilter.value : '';
    if (lang) queryParams.language = lang;

    const sort = sortSelect ? sortSelect.value : 'default';
    if (sort && sort !== 'default') queryParams.sort = sort;

    const result = await fetchBooks(queryParams);
    const books = result.data || [];
    const pagination = result.pagination || {};

    if (resultsCount) {
      resultsCount.textContent = `Showing ${books.length} of ${pagination.totalBooks || 0} books`;
    }

    if (books.length === 0) {
      grid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
          <div class="no-results-icon">🔍</div>
          <h3>No books found</h3>
          <p>Try adjusting your search or filters</p>
        </div>`;
    } else {
      grid.innerHTML = books.map(b => renderBookCard(b)).join('');
    }

    renderPagination(pagination.totalPages || 1, pagination.currentPage || 1);
  }

  function renderPagination(totalPages, current) {
    if (!paginationContainer) return;
    if (totalPages <= 1) { paginationContainer.innerHTML = ''; return; }

    let html = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">‹</button>`;

    const maxVisible = 7;
    let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) html += `<span class="page-ellipsis">…</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="page-ellipsis">…</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${current === totalPages ? 'disabled' : ''} data-page="${current + 1}">›</button>`;

    paginationContainer.innerHTML = html;
  }

  /* Event listener for pagination */
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (btn && !btn.disabled) {
        currentPage = parseInt(btn.dataset.page, 10);
        render();
        window.scrollTo({ top: grid.offsetTop - 120, behavior: 'smooth' });
      }
    });
  }

  /* Debounced search */
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => { currentPage = 1; render(); }, 300);
    });
  }

  /* Filter change events */
  [categoryFilter, authorFilter, languageFilter, sortSelect].forEach(el => {
    if (el) el.addEventListener('change', () => { currentPage = 1; render(); });
  });

  render();
}

/* ─── FAQ Accordion ─────────────────────────────────────── */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      items.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ─── Contact Form ──────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('#contact-name').value.trim();
    const email = form.querySelector('#contact-email').value.trim();
    const message = form.querySelector('#contact-message').value.trim();

    if (!name || !email || !message) {
      showNotification('Please fill in all fields.', 'error');
      return;
    }

    const waMessage = encodeURIComponent(
      `Assalamu Alaikum,\n\nMy name is ${name}.\nEmail: ${email}\n\nMessage:\n${message}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`, '_blank');

    form.reset();
    showNotification('Redirecting to WhatsApp...', 'success');
  });
}

/* ─── Simple Notification ───────────────────────────────── */
function showNotification(message, type = 'success') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    position: fixed; top: 90px; right: 24px; z-index: 10000;
    padding: 16px 24px; border-radius: 12px; font-family: var(--font-body);
    font-size: 0.9rem; font-weight: 500; max-width: 360px;
    background: ${type === 'success' ? '#25D366' : '#E74C3C'};
    color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideInRight 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);

  if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
}
