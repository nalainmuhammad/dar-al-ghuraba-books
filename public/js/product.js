/* ============================================================
   Dar Al Ghuraba Books — Product Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav('catalog');
  loadProduct();
});

async function loadProduct() {
  const container = document.getElementById('product-container');
  if (!container) return;

  // The server injects __INITIAL_BOOK_SLUG__ into the HTML
  const slug = window.__INITIAL_BOOK_SLUG__;

  if (!slug) {
    window.location.href = '/catalog.html';
    return;
  }

  try {
    const res = await fetch(`/api/books/slug/${slug}`);
    const data = await res.json();

    if (!data.success || !data.data) {
      container.innerHTML = '<div class="no-results"><div class="no-results-icon">😕</div><h3>Book not found</h3><a href="/catalog.html" class="btn btn-primary mt-3">Back to Catalog</a></div>';
      return;
    }

    renderProduct(data.data);
  } catch (err) {
    console.error('Error loading product:', err);
    container.innerHTML = '<div class="no-results"><h3>Error loading book details</h3></div>';
  }
}

function renderProduct(book) {
  const container = document.getElementById('product-container');
  
  const coverContent = book.imageUrl
    ? `<img src="${book.imageUrl}" alt="${book.title}" class="product-image">`
    : `<div class="product-image-placeholder" style="background: linear-gradient(135deg, ${book.color || '#1B6B3A'}, ${adjustColor(book.color || '#1B6B3A', -30)});">
        <span style="font-size: 5rem; margin-bottom: 20px;">📖</span>
        <span style="font-size: 1.5rem; font-weight: bold; max-width: 80%;">${book.title}</span>
      </div>`;
      
  const stockBadge = book.inStock !== false 
    ? '<span class="product-badge badge-stock-in">In Stock</span>' 
    : '<span class="product-badge badge-stock-out">Out of Stock</span>';
    
  const cartBtnDisabled = book.inStock === false ? 'disabled' : '';
  const cartBtnText = book.inStock === false ? 'Out of Stock' : 'Add to Cart';

  container.innerHTML = `
    <div class="product-container reveal">
      <div class="product-image-col">
        <div class="product-image-wrapper">
          ${coverContent}
          <div class="product-badges">
            ${book.featured ? '<span class="product-badge badge-featured">Featured</span>' : ''}
            ${stockBadge}
          </div>
        </div>
      </div>
      
      <div class="product-details-col">
        <div class="product-breadcrumb">
          <a href="/">Home</a> <span>›</span>
          <a href="/catalog.html">Books</a> <span>›</span>
          <a href="/catalog.html?category=${encodeURIComponent(book.category)}">${book.category}</a> <span>›</span>
          <span>${book.title}</span>
        </div>
        
        <h1 class="product-title">${book.title}</h1>
        <div class="product-author">by ${book.author}</div>
        
        <div class="product-price-section">
          <div class="product-price"><span class="currency">Rs.</span>${parseFloat(book.price).toFixed(2)}</div>
          <div class="product-actions">
            <button class="btn-add-cart" id="product-add-to-cart" ${cartBtnDisabled}>
              🛒 ${cartBtnText}
            </button>
          </div>
        </div>
        
        <div class="product-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Category</span>
            <span class="meta-value">${book.category}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Language</span>
            <span class="meta-value">${book.language || 'English'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Pages</span>
            <span class="meta-value">${book.pages || 'N/A'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Format</span>
            <span class="meta-value">${book.format || 'Hardcover'}</span>
          </div>
        </div>
        
        <div class="product-description">
          <h3>Description</h3>
          ${formatDescription(book.description)}
        </div>
      </div>
    </div>
  `;
  
  // Attach Add to Cart listener
  document.getElementById('product-add-to-cart')?.addEventListener('click', () => {
    if (window.addToCart && book.inStock !== false) {
      window.addToCart({
        id: book._id,
        title: book.title,
        price: book.price,
        imageUrl: book.imageUrl,
        slug: book.slug
      });
    }
  });

  // Init scroll reveal
  if (typeof initScrollReveal === 'function') {
    setTimeout(initScrollReveal, 100);
  }
}

function formatDescription(desc) {
  if (!desc) return '<p>No description available.</p>';
  return desc.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
}
