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

    // Differentiate explicit HTTP error conditions
    if (res.status === 429) {
      return {
        success: false,
        status: 429,
        errorType: 'RATE_LIMITED',
        message: 'Server is busy. Please wait a moment and retry.',
        data: [],
        pagination: { totalBooks: 0, totalPages: 0, currentPage: 1 },
      };
    }

    if (!res.ok) {
      let errMsg = 'Failed to fetch books';
      try {
        const errJson = await res.json();
        if (errJson && errJson.message) errMsg = errJson.message;
      } catch {
        // May receive HTML error page from reverse proxy
      }
      return {
        success: false,
        status: res.status,
        errorType: res.status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR',
        message: errMsg,
        data: [],
        pagination: { totalBooks: 0, totalPages: 0, currentPage: 1 },
      };
    }

    const data = await res.json();

    if (!data.success) {
      return {
        success: false,
        status: res.status,
        errorType: 'API_ERROR',
        message: data.message || 'Failed to fetch books',
        data: [],
        pagination: { totalBooks: 0, totalPages: 0, currentPage: 1 },
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching books:', error);
    return {
      success: false,
      status: 0,
      errorType: 'NETWORK_ERROR',
      message: 'Network connection issue. Please check your connection and retry.',
      data: [],
      pagination: { totalBooks: 0, totalPages: 0, currentPage: 1 },
    };
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


