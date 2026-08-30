/* ============================================================
   Dar Al Ghuraba Books — Reusable UI Components
   ============================================================
   Updated to work with the async API client (books.js).
   Carousel and Catalog now fetch data from the server.
   ============================================================ */

/* ─── Book Card Renderer ────────────────────────────────── */
function renderBookCard(book, extraClass = '') {
  const bookId = book._id || book.id;
  const slug = book.slug || bookId;
  const productUrl = `/book/${slug}`;

  // Use imageUrl if available, otherwise fall back to CSS gradient cover
  const coverContent = book.imageUrl
    ? `<img src="${book.imageUrl}" alt="${book.title}" class="book-cover-img" loading="lazy">`
    : `<div class="book-cover-art" style="background: linear-gradient(135deg, ${book.color || '#1B6B3A'}, ${adjustColor(book.color || '#1B6B3A', -30)});">
        <span class="book-icon">📖</span>
        <span class="book-cover-title">${book.title}</span>
        <span class="book-cover-author">${book.author}</span>
      </div>`;

  const stockBadge = book.inStock !== false 
    ? '<span class="book-card-badge" style="background: #2ECC71; color: white;">In Stock</span>' 
    : '<span class="book-card-badge" style="background: #E74C3C; color: white;">Out of Stock</span>';

  const cartBtnDisabled = book.inStock === false ? 'disabled' : '';
  const cartBtnText = book.inStock === false ? 'Out of Stock' : 'Add to Cart';

  return `
    <div class="book-card ${extraClass}" id="book-${bookId}" data-book-slug="${slug}">
      <div class="book-card-image">
        ${coverContent}
        ${book.featured ? '<span class="book-card-badge" style="right: auto; left: 12px;">Featured</span>' : ''}
        ${stockBadge}
      </div>
      <div class="book-card-body">
        <span class="book-card-category">${book.category}</span>
        <h3 class="book-card-title">${book.title}</h3>
        <p class="book-card-author">by ${book.author}</p>
        <div class="book-card-footer">
          <span class="book-card-price"><span class="currency">Rs.</span>${parseFloat(book.price).toFixed(2)}</span>
          <button class="btn btn-gold btn-sm book-card-cart-btn" data-book='${JSON.stringify({id: bookId, title: book.title, price: book.price, imageUrl: book.imageUrl, inStock: book.inStock, slug: slug}).replace(/'/g, "&apos;")}' ${cartBtnDisabled}>
            🛒 ${cartBtnText}
          </button>
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

/* ─── Book Card Click Delegation ────────────────────────── */
function initBookCardClicks(container) {
  if (!container) return;
  container.addEventListener('click', (e) => {
    // Don't intercept Cart button clicks
    if (e.target.closest('.book-card-cart-btn')) {
      const btn = e.target.closest('.book-card-cart-btn');
      if (window.addToCart && btn.dataset.book) {
        window.addToCart(JSON.parse(btn.dataset.book));
      }
      return;
    }

    const card = e.target.closest('.book-card[data-book-slug]');
    if (card) {
      window.location.href = `/book/${card.dataset.bookSlug}`;
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
    { name: 'Matoon', icon: '📑', desc: 'Classical Arabic texts & essential treatises' },
    { name: 'Notebooks', icon: '📓', desc: 'Premium Islamic-themed notebooks & journals' },
    { name: 'Islamic Clothing', icon: '👕', desc: 'Premium Kufis, modest wear & accessories' }
  ];

  grid.innerHTML = categoryData.map((cat) => `
    <a href="catalog.html?category=${encodeURIComponent(cat.name)}" class="category-card">
      <span class="category-icon">${cat.icon}</span>
      <h3>${cat.name}</h3>
      <p>${cat.desc}</p>
    </a>
  `).join('');
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
    const matchingOpt = Array.from(categoryFilter.options).find(
      o => o.value.toLowerCase() === initialCategory.toLowerCase()
    );
    if (matchingOpt) {
      categoryFilter.value = matchingOpt.value;
    } else {
      // If category not yet in database filter options, append and select it
      const newOpt = document.createElement('option');
      newOpt.value = initialCategory;
      newOpt.textContent = initialCategory;
      categoryFilter.appendChild(newOpt);
      categoryFilter.value = initialCategory;
    }
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

    const cat = categoryFilter ? categoryFilter.value : (initialCategory || '');
    if (cat) queryParams.category = cat;

    const auth = authorFilter ? authorFilter.value : '';
    if (auth) queryParams.author = auth;

    const lang = languageFilter ? languageFilter.value : '';
    if (lang) queryParams.language = lang;

    const stockFilter = document.getElementById('filter-stock');
    if (stockFilter && stockFilter.value) {
      queryParams.inStock = stockFilter.value === 'true';
    }

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
  const stockFilter = document.getElementById('filter-stock');
  [categoryFilter, authorFilter, languageFilter, sortSelect, stockFilter].forEach(el => {
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
