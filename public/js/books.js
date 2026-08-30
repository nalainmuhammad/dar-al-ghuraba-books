/* ============================================================
   Dar Al Ghuraba Books — API Client (Replaces Hardcoded Data)
   ============================================================
   All book data now fetched from the Node.js API.
   Provides the same function interface used by components.js.
   ============================================================ */

const API_BASE = '/api';

/* ─── State ─────────────────────────────────────────────── */
let WHATSAPP_NUMBER = '923708998986'; // default fallback
let _filterOptionsCache = null;

/* ─── Fetch WhatsApp number from server config ──────────── */
async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    if (data.success) {
      WHATSAPP_NUMBER = data.data.whatsappNumber;
    }
  } catch (err) {
    console.warn('Could not load config, using defaults:', err.message);
  }
}

// Load config on page load
loadConfig();

/* ─── Helper: Build WhatsApp order URL ─────────────────── */
function getWhatsAppURL(bookTitle) {
  const message = encodeURIComponent(
    `Assalamu Alaikum, I would like to order the following book from Dar Al Ghuraba Books: ${bookTitle}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}

/* ─── Fetch Books from API ──────────────────────────────── */
async function fetchBooks(params = {}) {
  try {
    const query = new URLSearchParams();

    if (params.category) query.set('category', params.category);
    if (params.author) query.set('author', params.author);
    if (params.language) query.set('language', params.language);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.featured) query.set('featured', 'true');
    if (params.inStock !== undefined) query.set('inStock', params.inStock);
    if (params.onDemand !== undefined) query.set('onDemand', params.onDemand);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const url = `${API_BASE}/books${query.toString() ? '?' + query.toString() : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch books');
    }

    return data;
  } catch (error) {
    console.error('Error fetching books:', error);
    return { success: false, data: [], pagination: { totalBooks: 0, totalPages: 0, currentPage: 1 } };
  }
}

/* ─── Get Featured Books ────────────────────────────────── */
async function getFeaturedBooks() {
  const result = await fetchBooks({ featured: true, limit: 20 });
  return result.data || [];
}

/* ─── Get Filter Options (cached) ───────────────────────── */
async function getFilterOptions() {
  if (_filterOptionsCache) return _filterOptionsCache;

  try {
    const res = await fetch(`${API_BASE}/books/filters/options`);
    const data = await res.json();

    if (data.success) {
      _filterOptionsCache = data.data;
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching filter options:', error);
  }

  return { categories: [], authors: [], languages: [] };
}

/* ─── Convenience wrappers (match old function signatures) ─ */
async function getCategories() {
  const options = await getFilterOptions();
  return options.categories;
}

async function getAuthors() {
  const options = await getFilterOptions();
  return options.authors;
}

async function getLanguages() {
  const options = await getFilterOptions();
  return options.languages;
}
