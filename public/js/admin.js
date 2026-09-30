/* ============================================================
   Dar Al Ghuraba Books — Admin Dashboard Client Logic
   ============================================================
   Handles: Authentication, Books CRUD, Categories CRUD,
   Orders Management & Status Updates, Cloudinary Image Uploads,
   Dashboard Analytics, and Navigation.
   ============================================================ */

const API = '/api';

/* ─── State ─────────────────────────────────────────────── */
let currentSection = 'overview';
let adminBooks = [];
let adminCategories = [];
let adminOrders = [];
let adminCurrentPage = 1;
let adminOrdersCurrentPage = 1;
const ADMIN_PER_PAGE = 15;
const ADMIN_ORDERS_PER_PAGE = 15;
let deleteTargetId = null;
let deleteCategoryTargetId = null;
let editingBookId = null;
let editingCategoryId = null;
let viewingOrderId = null;

/* ─── Initialization ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLoginParticles();

  // Enforce immediate token check on load
  const token = localStorage.getItem('dar_admin_token');
  if (token) {
    verifyToken(token);
  } else {
    // Ensure dashboard is hidden and login is visible
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
  }

  // Setup all event listeners
  setupEventListeners();
});

/* ─── Login Particles (decorative) ──────────────────────── */
function initLoginParticles() {
  const container = document.getElementById('login-particles');
  if (!container) return;

  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      background: rgba(201, 151, 58, ${0.1 + Math.random() * 0.2});
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: float ${8 + Math.random() * 12}s ease-in-out infinite;
      animation-delay: ${Math.random() * 5}s;
    `;
    container.appendChild(particle);
  }

  if (!document.getElementById('particle-styles')) {
    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
        25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
        50% { transform: translateY(-15px) translateX(-10px); opacity: 0.4; }
        69% { transform: translateY(-40px) translateX(15px); opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ─── Event Listeners Setup ─────────────────────────────── */
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Password toggle
  const pwToggle = document.getElementById('password-toggle');
  if (pwToggle) {
    pwToggle.addEventListener('click', () => {
      const input = document.getElementById('login-password');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      pwToggle.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Sidebar navigation
  document.querySelectorAll('.sidebar-link[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section));
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', logout);

  // Mobile sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);

  // Modals for Book
  document.getElementById('btn-add-new')?.addEventListener('click', () => {
    clearBookForm();
    document.getElementById('book-modal').style.display = 'flex';
  });
  document.getElementById('btn-close-book-modal')?.addEventListener('click', () => {
    document.getElementById('book-modal').style.display = 'none';
  });

  // Modals for Category
  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    clearCategoryForm();
    document.getElementById('category-modal').style.display = 'flex';
  });
  document.getElementById('btn-close-category-modal')?.addEventListener('click', () => {
    document.getElementById('category-modal').style.display = 'none';
  });

  // Reset Book form
  document.getElementById('btn-reset-form')?.addEventListener('click', clearBookForm);

  // Forms submission
  document.getElementById('book-form')?.addEventListener('submit', handleBookSubmit);
  document.getElementById('category-form')?.addEventListener('submit', handleCategorySubmit);

  // Delete modals
  document.getElementById('btn-cancel-delete')?.addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete')?.addEventListener('click', handleDeleteConfirm);

  document.getElementById('btn-cancel-delete-category')?.addEventListener('click', closeDeleteCategoryModal);
  document.getElementById('btn-confirm-delete-category')?.addEventListener('click', handleDeleteCategoryConfirm);

  // Color picker live preview
  document.getElementById('form-book-color')?.addEventListener('input', (e) => {
    document.getElementById('color-value').textContent = e.target.value;
  });

  // Books table event delegation
  document.getElementById('books-tbody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-book"]');
    if (editBtn) editBook(editBtn.dataset.id);

    const deleteBtn = e.target.closest('[data-action="delete-book"]');
    if (deleteBtn) confirmDelete(deleteBtn.dataset.id, deleteBtn.dataset.title);
  });

  // Categories table event delegation
  document.getElementById('categories-tbody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-category"]');
    if (editBtn) editCategory(editBtn.dataset.id);

    const deleteBtn = e.target.closest('[data-action="delete-category"]');
    if (deleteBtn) confirmDeleteCategory(deleteBtn.dataset.id, deleteBtn.dataset.name);
  });

  // Books pagination
  document.getElementById('admin-pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.disabled) adminChangePage(parseInt(btn.dataset.page, 10));
  });

  // Books search & filter
  let searchTimeout;
  document.getElementById('admin-search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      adminCurrentPage = 1;
      loadBooks();
    }, 300);
  });

  document.getElementById('admin-category-filter')?.addEventListener('change', () => {
    adminCurrentPage = 1;
    loadBooks();
  });

  // Orders search & filters
  let orderSearchTimeout;
  document.getElementById('orders-search')?.addEventListener('input', () => {
    clearTimeout(orderSearchTimeout);
    orderSearchTimeout = setTimeout(() => {
      adminOrdersCurrentPage = 1;
      loadOrders();
    }, 300);
  });

  document.getElementById('orders-status-filter')?.addEventListener('change', () => {
    adminOrdersCurrentPage = 1;
    loadOrders();
  });

  document.getElementById('orders-payment-filter')?.addEventListener('change', () => {
    adminOrdersCurrentPage = 1;
    loadOrders();
  });

  // Orders pagination
  document.getElementById('orders-pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.disabled) {
      adminOrdersCurrentPage = parseInt(btn.dataset.page, 10);
      loadOrders();
    }
  });

  // Orders table action delegation
  document.getElementById('orders-tbody')?.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-action="view-order"]');
    if (viewBtn) viewOrder(viewBtn.dataset.id);
  });

  // Orders modal close buttons
  document.getElementById('btn-close-order-modal')?.addEventListener('click', closeOrderModal);
  document.getElementById('btn-cancel-order-modal')?.addEventListener('click', closeOrderModal);

  // Order update form
  document.getElementById('order-update-form')?.addEventListener('submit', handleOrderUpdateSubmit);
}

/* ─── Authentication ────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');

  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';
  errorEl.style.display = 'none';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('dar_admin_token', data.data.token);
    localStorage.setItem('dar_admin_user', JSON.stringify(data.data.user));
    showDashboard(data.data.user);
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

async function verifyToken(token) {
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.success) {
      showDashboard(data.data);
    } else {
      logout();
    }
  } catch {
    logout();
  }
}

function showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'flex';
  document.getElementById('admin-name').textContent = user.name || user.email;

  loadStats();
  loadCategories();
  loadBooks();
}

async function logout() {
  const token = localStorage.getItem('dar_admin_token');
  if (token) {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn('Logout notification failed:', e);
    }
  }

  localStorage.removeItem('dar_admin_token');
  localStorage.removeItem('dar_admin_user');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';

  document.getElementById('login-form').reset();
  document.getElementById('login-error').style.display = 'none';
}

/* ─── Auth Helper ───────────────────────────────────────── */
function getAuthHeaders() {
  const token = localStorage.getItem('dar_admin_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function authFetch(url, options = {}) {
  options.headers = { ...getAuthHeaders(), ...options.headers };
  const res = await fetch(url, options);

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 429) {
    throw new Error('Server is busy (rate limit reached). Please wait a moment and retry.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

/* ─── Navigation ────────────────────────────────────────── */
function navigateTo(section) {
  currentSection = section;

  document.querySelectorAll('.sidebar-link[data-section]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  document.querySelectorAll('.admin-section').forEach((sec) => {
    sec.style.display = 'none';
  });
  const target = document.getElementById(`section-${section}`);
  if (target) target.style.display = 'block';

  if (section === 'overview') loadStats();
  if (section === 'books') loadBooks();
  if (section === 'categories') loadCategoriesUI();
  if (section === 'orders') loadOrders();

  closeSidebar();
}

function toggleSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  sidebar.classList.toggle('open');

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active', sidebar.classList.contains('open'));
}

function closeSidebar() {
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.querySelector('.sidebar-overlay')?.classList.remove('active');
}

/* ─── Dashboard Stats ───────────────────────────────────── */
async function loadStats() {
  try {
    const data = await authFetch(`${API}/admin/stats`);
    if (!data.success) return;
    const stats = data.data;

    document.getElementById('stat-total').textContent = stats.totalBooks ?? 0;
    document.getElementById('stat-featured').textContent = stats.featuredBooks ?? 0;
    document.getElementById('stat-instock').textContent = stats.inStock ?? 0;
    document.getElementById('stat-outofstock').textContent = stats.outOfStock ?? 0;

    const onDemandEl = document.getElementById('stat-ondemand');
    if (onDemandEl) onDemandEl.textContent = stats.onDemandBooks ?? 0;

    const totalOrdersEl = document.getElementById('stat-total-orders');
    if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders ?? 0;

    const pendingOrdersEl = document.getElementById('stat-pending-orders');
    if (pendingOrdersEl) pendingOrdersEl.textContent = stats.pendingOrders ?? 0;

    const revenueEl = document.getElementById('stat-revenue');
    if (revenueEl) {
      revenueEl.textContent = `Rs. ${(stats.totalRevenue || 0).toLocaleString()}`;
    }

    const breakdownEl = document.getElementById('categories-breakdown');
    if (breakdownEl && stats.categories && stats.categories.length) {
      const maxCount = Math.max(...stats.categories.map((c) => c.count), 1);
      breakdownEl.innerHTML = stats.categories
        .map(
          (cat) => `
        <div class="breakdown-item">
          <span class="breakdown-label">${cat.name}</span>
          <div class="breakdown-bar-wrapper">
            <div class="breakdown-bar" style="width: ${(cat.count / maxCount) * 100}%"></div>
          </div>
          <span class="breakdown-count">${cat.count}</span>
        </div>
      `
        )
        .join('');
    }

    const pricingEl = document.getElementById('pricing-overview');
    if (pricingEl && stats.pricing) {
      const p = stats.pricing;
      pricingEl.innerHTML = `
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${(p.avgPrice || 0).toFixed(2)}</span>
          <span class="pricing-label">Average Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${(p.minPrice || 0).toFixed(2)}</span>
          <span class="pricing-label">Lowest Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${(p.maxPrice || 0).toFixed(2)}</span>
          <span class="pricing-label">Highest Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${(p.totalValue || 0).toFixed(2)}</span>
          <span class="pricing-label">Total Value</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

/* ─── Category Management ───────────────────────────────── */
async function loadCategories() {
  try {
    const data = await authFetch(`${API}/categories`);
    if (data.success) {
      adminCategories = data.data;
      populateCategoryDropdowns();
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

function populateCategoryDropdowns() {
  const filterEl = document.getElementById('admin-category-filter');
  const formEl = document.getElementById('form-book-category');

  if (filterEl) {
    filterEl.innerHTML =
      '<option value="">All Categories</option>' +
      adminCategories.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
  }
  if (formEl) {
    formEl.innerHTML =
      '<option value="">Select Category</option>' +
      adminCategories.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

function loadCategoriesUI() {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;

  if (adminCategories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="table-empty"><h3>No categories found</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = adminCategories
    .map(
      (cat) => `
    <tr>
      <td><strong>${cat.name}</strong></td>
      <td>${cat.description || '—'}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn table-btn-edit" data-action="edit-category" data-id="${cat._id}">✏️ Edit</button>
          <button class="table-btn table-btn-delete" data-action="delete-category" data-id="${cat._id}" data-name="${cat.name.replace(/"/g, '&quot;')}">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('category-form-error');
  errorEl.style.display = 'none';

  const categoryData = {
    name: document.getElementById('form-category-name').value.trim(),
    description: document.getElementById('form-category-desc').value.trim(),
  };

  try {
    const catId = document.getElementById('form-category-id').value;
    let data;

    if (catId) {
      data = await authFetch(`${API}/categories/${catId}`, { method: 'PUT', body: JSON.stringify(categoryData) });
    } else {
      data = await authFetch(`${API}/categories`, { method: 'POST', body: JSON.stringify(categoryData) });
    }

    if (!data.success) throw new Error(data.message || 'Operation failed');

    document.getElementById('category-modal').style.display = 'none';
    await loadCategories();
    if (currentSection === 'categories') loadCategoriesUI();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

window.editCategory = async (id) => {
  try {
    const data = await authFetch(`${API}/categories/${id}`);
    if (!data.success) throw new Error('Category not found');

    const cat = data.data;
    editingCategoryId = id;

    document.getElementById('form-category-id').value = id;
    document.getElementById('form-category-name').value = cat.name;
    document.getElementById('form-category-desc').value = cat.description || '';
    document.getElementById('category-form-title').textContent = 'Edit Category';

    document.getElementById('category-modal').style.display = 'flex';
  } catch (error) {
    console.error('Failed to load category:', error);
  }
};

function clearCategoryForm() {
  editingCategoryId = null;
  document.getElementById('form-category-id').value = '';
  document.getElementById('category-form').reset();
  document.getElementById('category-form-title').textContent = 'Add New Category';
  document.getElementById('category-form-error').style.display = 'none';
}

window.confirmDeleteCategory = (id, name) => {
  deleteCategoryTargetId = id;
  document.getElementById('delete-category-title').textContent = name;
  document.getElementById('delete-category-modal').style.display = 'flex';
};

function closeDeleteCategoryModal() {
  deleteCategoryTargetId = null;
  document.getElementById('delete-category-modal').style.display = 'none';
}

async function handleDeleteCategoryConfirm() {
  if (!deleteCategoryTargetId) return;

  try {
    const data = await authFetch(`${API}/categories/${deleteCategoryTargetId}`, { method: 'DELETE' });
    if (!data.success) throw new Error(data.message || 'Delete failed');

    closeDeleteCategoryModal();
    await loadCategories();
    if (currentSection === 'categories') loadCategoriesUI();
    loadBooks();
    loadStats();
  } catch (error) {
    alert('Failed to delete category: ' + error.message);
    closeDeleteCategoryModal();
  }
}

/* ─── Book Management ───────────────────────────────────── */
async function loadBooks() {
  const tbody = document.getElementById('books-tbody');
  if (!tbody) return;

  const params = new URLSearchParams();
  params.set('page', adminCurrentPage);
  params.set('limit', ADMIN_PER_PAGE);

  const search = document.getElementById('admin-search')?.value.trim();
  if (search) params.set('search', search);

  const category = document.getElementById('admin-category-filter')?.value;
  if (category) params.set('category', category);

  try {
    const data = await authFetch(`${API}/books?${params.toString()}`);
    if (!data.success) return;

    adminBooks = data.data;
    const pagination = data.pagination;

    if (adminBooks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty"><h3>No books or items found</h3></div></td></tr>`;
      document.getElementById('admin-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = adminBooks
      .map(
        (book) => `
      <tr>
        <td><span class="table-title">${book.title}</span></td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td><strong>Rs. ${parseFloat(book.price).toFixed(2)}</strong></td>
        <td>${book.featured ? '<span class="table-badge table-badge-featured">⭐ Yes</span>' : '—'}</td>
        <td>${book.inStock !== false ? '<span class="table-badge table-badge-in-stock">In Stock</span>' : '<span class="table-badge table-badge-out-of-stock">Out</span>'}</td>
        <td>${book.onDemand ? '<span class="table-badge" style="background:#F39C12;color:white;">📢 Yes</span>' : '—'}</td>
        <td>${book.sortOrder || 0}</td>
        <td>
          <div class="table-actions">
            <button class="table-btn table-btn-edit" data-action="edit-book" data-id="${book._id}">✏️ Edit</button>
            <button class="table-btn table-btn-delete" data-action="delete-book" data-id="${book._id}" data-title="${book.title.replace(/"/g, '&quot;')}">🗑️</button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');

    renderAdminPagination(pagination);
  } catch (error) {
    console.error('Failed to load books:', error);
  }
}

function renderAdminPagination(pagination) {
  const container = document.getElementById('admin-pagination');
  if (!container || pagination.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  const { currentPage, totalPages } = pagination;
  let html = `<button class="admin-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="admin-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="admin-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
  container.innerHTML = html;
}

window.adminChangePage = (page) => {
  adminCurrentPage = page;
  loadBooks();
};

async function handleBookSubmit(e) {
  e.preventDefault();

  const formError = document.getElementById('form-error');
  const formSuccess = document.getElementById('form-success');
  const btnText = document.getElementById('submit-btn-text');
  const spinner = document.getElementById('submit-spinner');

  formError.style.display = 'none';
  formSuccess.style.display = 'none';
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  let imageUrl = document.getElementById('form-book-imageurl').value.trim();
  const fileInput = document.getElementById('form-book-imagefile');

  // If a file is selected, try Cloudinary upload route first; fallback to Data URL if service not configured
  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('dar_admin_token');
      const uploadRes = await fetch(`${API}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok && uploadData.success && uploadData.data?.url) {
        imageUrl = uploadData.data.url;
      } else {
        // Fallback to DataURL reader
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(file);
        });
      }
    } catch {
      // Fallback to DataURL reader
      try {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(file);
        });
      } catch (err) {
        formError.textContent = err.message;
        formError.style.display = 'block';
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
        return;
      }
    }
  }

  const bookId = document.getElementById('form-book-id').value;
  const rawSizes = document.getElementById('form-book-sizes')?.value || '';
  const parsedSizes = rawSizes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const bookData = {
    title: document.getElementById('form-book-title').value.trim(),
    author: document.getElementById('form-book-author').value.trim(),
    price: parseFloat(document.getElementById('form-book-price').value),
    weight: parseFloat(document.getElementById('form-book-weight')?.value) || 500,
    category: document.getElementById('form-book-category').value,
    productType: document.getElementById('form-book-producttype')?.value || 'book',
    sizes: parsedSizes,
    language: document.getElementById('form-book-language').value.trim() || 'English',
    format: document.getElementById('form-book-format').value || 'Hardcover',
    description: document.getElementById('form-book-description').value.trim(),
    color: document.getElementById('form-book-color').value,
    featured: document.getElementById('form-book-featured').checked,
    inStock: document.getElementById('form-book-instock').checked,
    onDemand: document.getElementById('form-book-ondemand')?.checked || false,
    sortOrder: parseInt(document.getElementById('form-book-sortorder').value, 10) || 0,
  };

  if (imageUrl) {
    bookData.imageUrl = imageUrl;
  } else if (!bookId) {
    bookData.imageUrl = '';
  }

  try {
    let data;

    if (bookId) {
      data = await authFetch(`${API}/books/${bookId}`, { method: 'PUT', body: JSON.stringify(bookData) });
    } else {
      data = await authFetch(`${API}/books`, { method: 'POST', body: JSON.stringify(bookData) });
    }

    if (!data.success) throw new Error(data.message || 'Operation failed');

    formSuccess.textContent = bookId ? `"${bookData.title}" updated successfully!` : `"${bookData.title}" added successfully!`;
    formSuccess.style.display = 'block';

    if (!bookId) clearBookForm();

    loadStats();
    loadBooks();

    setTimeout(() => {
      document.getElementById('book-modal').style.display = 'none';
      formSuccess.style.display = 'none';
    }, 1500);
  } catch (error) {
    formError.textContent = error.message;
    formError.style.display = 'block';
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}

window.editBook = async (id) => {
  try {
    const data = await authFetch(`${API}/books/${id}`);
    if (!data.success) throw new Error('Book not found');

    const book = data.data;
    editingBookId = id;

    document.getElementById('form-book-id').value = id;
    document.getElementById('form-book-title').value = book.title;
    document.getElementById('form-book-author').value = book.author;
    document.getElementById('form-book-price').value = book.price;
    document.getElementById('form-book-weight').value = book.weight || 500;
    document.getElementById('form-book-category').value = book.category;
    document.getElementById('form-book-producttype').value = book.productType || 'book';
    document.getElementById('form-book-sizes').value = Array.isArray(book.sizes) ? book.sizes.join(', ') : '';
    document.getElementById('form-book-language').value = book.language || 'English';
    document.getElementById('form-book-format').value = book.format || 'Hardcover';
    document.getElementById('form-book-description').value = book.description;
    document.getElementById('form-book-color').value = book.color || '#1B6B3A';
    document.getElementById('color-value').textContent = book.color || '#1B6B3A';
    document.getElementById('form-book-imageurl').value = book.imageUrl || '';
    const fileInput = document.getElementById('form-book-imagefile');
    if (fileInput) fileInput.value = '';
    document.getElementById('form-book-featured').checked = !!book.featured;
    document.getElementById('form-book-instock').checked = book.inStock !== false;

    const onDemandEl = document.getElementById('form-book-ondemand');
    if (onDemandEl) onDemandEl.checked = !!book.onDemand;

    document.getElementById('form-book-sortorder').value = book.sortOrder || 0;

    document.getElementById('form-title').textContent = 'Edit Product / Book';
    document.getElementById('submit-btn-text').textContent = 'Update Product';
    document.getElementById('book-modal').style.display = 'flex';
  } catch (error) {
    console.error('Failed to load book for editing:', error);
  }
};

function clearBookForm() {
  editingBookId = null;
  document.getElementById('form-book-id').value = '';
  document.getElementById('book-form').reset();
  document.getElementById('form-book-weight').value = 500;
  document.getElementById('form-book-producttype').value = 'book';
  document.getElementById('form-book-sizes').value = '';
  document.getElementById('form-book-color').value = '#1B6B3A';
  document.getElementById('color-value').textContent = '#1B6B3A';
  document.getElementById('form-book-instock').checked = true;

  const onDemandEl = document.getElementById('form-book-ondemand');
  if (onDemandEl) onDemandEl.checked = false;

  document.getElementById('form-book-sortorder').value = 0;
  document.getElementById('form-title').textContent = 'Add New Product / Book';
  document.getElementById('submit-btn-text').textContent = 'Add Product';
  document.getElementById('form-error').style.display = 'none';
  document.getElementById('form-success').style.display = 'none';
}

/* ─── Delete Book ───────────────────────────────────────── */
window.confirmDelete = (id, title) => {
  deleteTargetId = id;
  document.getElementById('delete-book-title').textContent = title;
  document.getElementById('delete-modal').style.display = 'flex';
};

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal').style.display = 'none';
}

async function handleDeleteConfirm() {
  if (!deleteTargetId) return;
  try {
    const data = await authFetch(`${API}/books/${deleteTargetId}`, { method: 'DELETE' });
    if (!data.success) throw new Error(data.message || 'Delete failed');
    closeDeleteModal();
    loadBooks();
    loadStats();
  } catch (error) {
    alert('Failed to delete: ' + error.message);
    closeDeleteModal();
  }
}

/* ─── Orders Management ─────────────────────────────────── */
async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  const params = new URLSearchParams();
  params.set('page', adminOrdersCurrentPage);
  params.set('limit', ADMIN_ORDERS_PER_PAGE);

  const search = document.getElementById('orders-search')?.value.trim();
  if (search) params.set('search', search);

  const status = document.getElementById('orders-status-filter')?.value;
  if (status) params.set('orderStatus', status);

  const paymentStatus = document.getElementById('orders-payment-filter')?.value;
  if (paymentStatus) params.set('paymentStatus', paymentStatus);

  try {
    const data = await authFetch(`${API}/admin/orders?${params.toString()}`);
    if (!data.success) return;

    adminOrders = data.data.orders || [];
    const pagination = data.data.pagination;

    if (adminOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><h3>No orders found</h3></div></td></tr>`;
      document.getElementById('orders-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = adminOrders
      .map((order) => {
        const dateStr = new Date(order.createdAt).toLocaleDateString('en-PK', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        const statusColors = {
          pending: '#F39C12',
          confirmed: '#3498DB',
          processing: '#9B59B6',
          shipped: '#1ABC9C',
          delivered: '#2ECC71',
          cancelled: '#E74C3C',
        };

        const paymentColors = {
          paid: '#2ECC71',
          pending: '#F39C12',
          failed: '#E74C3C',
          refunded: '#95A5A6',
        };

        const statusColor = statusColors[order.orderStatus] || '#888';
        const paymentColor = paymentColors[order.paymentStatus] || '#888';

        const itemsCount = (order.items || []).reduce((acc, item) => acc + (item.quantity || 1), 0);
        const customerName = order.customer?.name || 'Guest';

        return `
        <tr>
          <td><strong style="color: var(--gold); font-family: monospace;">${order.orderId}</strong></td>
          <td>
            <div><strong>${customerName}</strong></div>
            <small style="color: var(--text-secondary);">${order.customer?.email || ''}</small>
          </td>
          <td>${itemsCount} item${itemsCount !== 1 ? 's' : ''}</td>
          <td><strong>Rs. ${(order.totalAmount || 0).toLocaleString()}</strong></td>
          <td>
            <span class="table-badge" style="background: ${paymentColor}; color: #fff; font-size: 0.75rem; text-transform: uppercase;">
              ${order.paymentStatus || 'pending'}
            </span>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
              ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'COD'}
            </div>
          </td>
          <td>
            <span class="table-badge" style="background: ${statusColor}; color: #fff; font-size: 0.75rem; text-transform: uppercase;">
              ${order.orderStatus || 'pending'}
            </span>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${dateStr}</td>
          <td>
            <div class="table-actions">
              <button class="table-btn table-btn-edit" data-action="view-order" data-id="${order._id}">👁️ View / Edit</button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    renderOrdersPagination(pagination);
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

function renderOrdersPagination(pagination) {
  const container = document.getElementById('orders-pagination');
  if (!container || !pagination || pagination.pages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  const { page, pages } = pagination;
  let html = `<button class="admin-page-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="admin-page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="admin-page-btn" ${page === pages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;
  container.innerHTML = html;
}

window.viewOrder = async (id) => {
  viewingOrderId = id;
  const modal = document.getElementById('order-modal');
  const errorEl = document.getElementById('order-update-error');
  const successEl = document.getElementById('order-update-success');
  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';

  try {
    const data = await authFetch(`${API}/admin/orders/${id}`);
    if (!data.success || !data.data) throw new Error('Order not found');

    const order = data.data;

    // Header info
    document.getElementById('order-modal-id').textContent = `Order #${order.orderId}`;
    const dateFormatted = new Date(order.createdAt).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    document.getElementById('order-modal-date').textContent = `Placed on ${dateFormatted}`;

    // Customer
    document.getElementById('order-cust-name').textContent = order.customer?.name || '—';
    document.getElementById('order-cust-email').textContent = order.customer?.email || '—';
    document.getElementById('order-cust-phone').textContent = order.customer?.phone || '—';

    // Shipping
    const addr = order.shippingAddress || {};
    const streetLine = [addr.street, addr.apartment].filter(Boolean).join(', ');
    const cityLine = [addr.city, addr.state, addr.postalCode, addr.country || 'Pakistan'].filter(Boolean).join(', ');
    document.getElementById('order-ship-address').textContent = streetLine || '—';
    document.getElementById('order-ship-city-country').textContent = cityLine || '—';
    document.getElementById('order-ship-weight').textContent = `${order.totalWeight || 500} grams`;

    // Financials
    document.getElementById('order-pay-method').textContent = (order.paymentMethod || 'cod').toUpperCase();
    document.getElementById('order-subtotal').textContent = `Rs. ${(order.subtotal || 0).toLocaleString()}`;
    document.getElementById('order-shipping-fee').textContent = `Rs. ${(order.shippingCost || 0).toLocaleString()}`;
    document.getElementById('order-grand-total').textContent = `Rs. ${(order.totalAmount || 0).toLocaleString()}`;

    // Items table
    const itemsTbody = document.getElementById('order-items-tbody');
    if (itemsTbody) {
      itemsTbody.innerHTML = (order.items || [])
        .map((item) => {
          const itemTotal = (item.price || 0) * (item.quantity || 1);
          const sizeBadge = item.selectedSize ? `<span class="table-badge" style="background:#4A5568;color:#fff;font-size:0.75rem;">Size: ${item.selectedSize}</span>` : '';
          return `
          <tr>
            <td><strong>${item.title || 'Product'}</strong></td>
            <td>${sizeBadge || '<span style="color:var(--text-secondary);">Standard</span>'}</td>
            <td>Rs. ${(item.price || 0).toLocaleString()}</td>
            <td>${item.quantity || 1}</td>
            <td><strong>Rs. ${itemTotal.toLocaleString()}</strong></td>
          </tr>
        `;
        })
        .join('');
    }

    // Status update form pre-fill
    document.getElementById('order-update-id').value = order._id;
    document.getElementById('order-update-status').value = order.orderStatus || 'pending';
    document.getElementById('order-update-payment-status').value = order.paymentStatus || 'pending';
    document.getElementById('order-update-carrier').value = order.shippingDetails?.carrier || '';
    document.getElementById('order-update-tracking').value = order.shippingDetails?.trackingNumber || '';
    document.getElementById('order-update-notes').value = order.notes || '';

    if (modal) modal.style.display = 'flex';
  } catch (err) {
    alert('Failed to load order: ' + err.message);
  }
};

function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  if (modal) modal.style.display = 'none';
  viewingOrderId = null;
}

async function handleOrderUpdateSubmit(e) {
  e.preventDefault();

  const orderId = document.getElementById('order-update-id').value;
  if (!orderId) return;

  const errorEl = document.getElementById('order-update-error');
  const successEl = document.getElementById('order-update-success');
  const btnText = document.getElementById('order-save-text');
  const spinner = document.getElementById('order-save-spinner');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';

  const payload = {
    orderStatus: document.getElementById('order-update-status').value,
    paymentStatus: document.getElementById('order-update-payment-status').value,
    carrier: document.getElementById('order-update-carrier').value.trim(),
    trackingNumber: document.getElementById('order-update-tracking').value.trim(),
    notes: document.getElementById('order-update-notes').value.trim(),
  };

  try {
    const data = await authFetch(`${API}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!data.success) throw new Error(data.message || 'Update failed');

    successEl.textContent = 'Order status updated successfully!';
    successEl.style.display = 'block';

    loadOrders();
    loadStats();

    setTimeout(() => {
      closeOrderModal();
    }, 1200);
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  } finally {
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
  }
}
