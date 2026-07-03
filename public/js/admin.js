/* ============================================================
   Dar-ul-Ilm Books — Admin Dashboard Client Logic
   ============================================================
   Handles: Authentication, CRUD operations, dashboard stats,
   navigation, and all admin UI interactions.
   ============================================================ */

const API = '/api';

/* ─── State ─────────────────────────────────────────────── */
let currentSection = 'overview';
let adminBooks = [];
let adminCategories = [];
let adminCurrentPage = 1;
const ADMIN_PER_PAGE = 15;
let deleteTargetId = null;
let deleteCategoryTargetId = null;
let editingBookId = null;
let editingCategoryId = null;

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

  // Event listeners
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

  // Add float animation
  if (!document.getElementById('particle-styles')) {
    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
        25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
        50% { transform: translateY(-15px) translateX(-10px); opacity: 0.4; }
        75% { transform: translateY(-40px) translateX(15px); opacity: 0.5; }
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
  document.querySelectorAll('.sidebar-link[data-section]').forEach(btn => {
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

  // Table event delegation
  document.getElementById('books-tbody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-book"]');
    if (editBtn) editBook(editBtn.dataset.id);

    const deleteBtn = e.target.closest('[data-action="delete-book"]');
    if (deleteBtn) confirmDelete(deleteBtn.dataset.id, deleteBtn.dataset.title);
  });

  document.getElementById('categories-tbody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-action="edit-category"]');
    if (editBtn) editCategory(editBtn.dataset.id);

    const deleteBtn = e.target.closest('[data-action="delete-category"]');
    if (deleteBtn) confirmDeleteCategory(deleteBtn.dataset.id, deleteBtn.dataset.name);
  });

  document.getElementById('admin-pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.disabled) adminChangePage(parseInt(btn.dataset.page, 10));
  });

  // Admin search & filter
  let searchTimeout;
  document.getElementById('admin-search')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { adminCurrentPage = 1; loadBooks(); }, 300);
  });

  document.getElementById('admin-category-filter')?.addEventListener('change', () => {
    adminCurrentPage = 1;
    loadBooks();
  });
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
      headers: { 'Authorization': `Bearer ${token}` },
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
  loadCategories(); // Populates categories in dropdowns & UI
  loadBooks();
}

function logout() {
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
    'Authorization': `Bearer ${token}`,
  };
}

async function authFetch(url, options = {}) {
  options.headers = { ...getAuthHeaders(), ...options.headers };
  const res = await fetch(url, options);

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  return res.json();
}

/* ─── Navigation ────────────────────────────────────────── */
function navigateTo(section) {
  currentSection = section;

  document.querySelectorAll('.sidebar-link[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.style.display = 'none';
  });
  const target = document.getElementById(`section-${section}`);
  if (target) target.style.display = 'block';

  if (section === 'overview') loadStats();
  if (section === 'books') loadBooks();
  if (section === 'categories') loadCategoriesUI();

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

    document.getElementById('stat-total').textContent = stats.totalBooks;
    document.getElementById('stat-featured').textContent = stats.featuredBooks;
    document.getElementById('stat-instock').textContent = stats.inStock;
    document.getElementById('stat-outofstock').textContent = stats.outOfStock;

    const breakdownEl = document.getElementById('categories-breakdown');
    if (breakdownEl && stats.categories.length) {
      const maxCount = Math.max(...stats.categories.map(c => c.count));
      breakdownEl.innerHTML = stats.categories.map(cat => `
        <div class="breakdown-item">
          <span class="breakdown-label">${cat.name}</span>
          <div class="breakdown-bar-wrapper">
            <div class="breakdown-bar" style="width: ${(cat.count / maxCount) * 100}%"></div>
          </div>
          <span class="breakdown-count">${cat.count}</span>
        </div>
      `).join('');
    }

    const pricingEl = document.getElementById('pricing-overview');
    if (pricingEl) {
      const p = stats.pricing;
      pricingEl.innerHTML = `
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${p.avgPrice?.toFixed(2) || '0.00'}</span>
          <span class="pricing-label">Average Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${p.minPrice?.toFixed(2) || '0.00'}</span>
          <span class="pricing-label">Lowest Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${p.maxPrice?.toFixed(2) || '0.00'}</span>
          <span class="pricing-label">Highest Price</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-value">Rs. ${p.totalValue?.toFixed(2) || '0.00'}</span>
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
    filterEl.innerHTML = '<option value="">All Categories</option>' +
      adminCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
  if (formEl) {
    formEl.innerHTML = '<option value="">Select Category</option>' +
      adminCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

function loadCategoriesUI() {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;

  if (adminCategories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="table-empty"><h3>No categories found</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = adminCategories.map(cat => `
    <tr>
      <td><strong>${cat.name}</strong></td>
      <td>${cat.description || '—'}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn table-btn-edit" data-action="edit-category" data-id="${cat._id}">✏️</button>
          <button class="table-btn table-btn-delete" data-action="delete-category" data-id="${cat._id}" data-name="${cat.name.replace(/"/g, '&quot;')}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById('category-form-error');
  errorEl.style.display = 'none';

  const categoryData = {
    name: document.getElementById('form-category-name').value.trim(),
    description: document.getElementById('form-category-desc').value.trim()
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
      tbody.innerHTML = `<tr><td colspan="7"><div class="table-empty"><h3>No books found</h3></div></td></tr>`;
      document.getElementById('admin-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = adminBooks.map(book => `
      <tr>
        <td><span class="table-title">${book.title}</span></td>
        <td>${book.author}</td>
        <td>${book.category}</td>
        <td><strong>Rs. ${parseFloat(book.price).toFixed(2)}</strong></td>
        <td>${book.featured ? '<span class="table-badge table-badge-featured">⭐ Yes</span>' : '—'}</td>
        <td>${book.inStock !== false ? '<span class="table-badge table-badge-in-stock">In Stock</span>' : '<span class="table-badge table-badge-out-of-stock">Out</span>'}</td>
        <td>
          <div class="table-actions">
            <button class="table-btn table-btn-edit" data-action="edit-book" data-id="${book._id}">✏️ Edit</button>
            <button class="table-btn table-btn-delete" data-action="delete-book" data-id="${book._id}" data-title="${book.title.replace(/"/g, '&quot;')}">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

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
  if (fileInput && fileInput.files.length > 0) {
    try {
      const file = fileInput.files[0];
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

  const bookData = {
    title: document.getElementById('form-book-title').value.trim(),
    author: document.getElementById('form-book-author').value.trim(),
    price: parseFloat(document.getElementById('form-book-price').value),
    category: document.getElementById('form-book-category').value,
    language: document.getElementById('form-book-language').value.trim() || 'English',
    description: document.getElementById('form-book-description').value.trim(),
    color: document.getElementById('form-book-color').value,
    imageUrl: imageUrl,
    featured: document.getElementById('form-book-featured').checked,
    inStock: document.getElementById('form-book-instock').checked,
  };

  try {
    const bookId = document.getElementById('form-book-id').value;
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

    // Optionally close modal after a brief delay
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
    document.getElementById('form-book-category').value = book.category;
    document.getElementById('form-book-language').value = book.language;
    document.getElementById('form-book-description').value = book.description;
    document.getElementById('form-book-color').value = book.color || '#1B6B3A';
    document.getElementById('color-value').textContent = book.color || '#1B6B3A';
    document.getElementById('form-book-imageurl').value = book.imageUrl || '';
    const fileInput = document.getElementById('form-book-imagefile');
    if (fileInput) fileInput.value = '';
    document.getElementById('form-book-featured').checked = book.featured;
    document.getElementById('form-book-instock').checked = book.inStock !== false;

    document.getElementById('form-title').textContent = 'Edit Book';
    document.getElementById('submit-btn-text').textContent = 'Update Book';
    document.getElementById('book-modal').style.display = 'flex';
  } catch (error) {
    console.error('Failed to load book for editing:', error);
  }
};

function clearBookForm() {
  editingBookId = null;
  document.getElementById('form-book-id').value = '';
  document.getElementById('book-form').reset();
  document.getElementById('form-book-color').value = '#1B6B3A';
  document.getElementById('color-value').textContent = '#1B6B3A';
  document.getElementById('form-book-instock').checked = true;
  document.getElementById('form-title').textContent = 'Add New Book';
  document.getElementById('submit-btn-text').textContent = 'Add Book';
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
