/* ============================================================
   Dar Al Ghuraba Books — Core Application Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavbar();
  initMobileMenu();
  initScrollReveal();
  initBackToTop();
  initPageTransition();
});

/* ─── Theme Toggle ──────────────────────────────────────── */
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const saved = localStorage.getItem('dar-al-ghuraba-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(toggle, saved);
  } else {
    /* Default to light */
    document.documentElement.setAttribute('data-theme', 'light');
    updateThemeIcon(toggle, 'light');
  }

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dar-al-ghuraba-theme', next);
    updateThemeIcon(toggle, next);
  });
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

/* ─── Navbar Scroll Behaviour ───────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─── Mobile Menu (Slide-out + Backdrop + Scroll Lock) ──── */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  // Create backdrop element
  let backdrop = document.querySelector('.mobile-nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'mobile-nav-backdrop';
    document.body.appendChild(backdrop);
  }

  function openMenu() {
    toggle.classList.add('active');
    links.classList.add('open');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    toggle.classList.remove('active');
    links.classList.remove('open');
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
  }

  toggle.addEventListener('click', () => {
    if (links.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close when backdrop is tapped
  backdrop.addEventListener('click', closeMenu);

  // NUCLEAR FIX: Force programmatic navigation on mobile.
  // On some mobile browsers, the default <a> click is silently swallowed
  // by CSS pointer-events transitions or z-index stacking issues.
  // We bypass all of that by reading the href and navigating manually.
  links.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        window.location.href = href;
      }
    });

    // Also handle touchend as a fallback for stubborn mobile browsers
    link.addEventListener('touchend', (e) => {
      const href = link.getAttribute('href');
      if (href) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        window.location.href = href;
      }
    });
  });
}

/* ─── Scroll Reveal ─────────────────────────────────────── */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

/* ─── Back to Top ───────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ─── Page Enter Animation ──────────────────────────────── */
function initPageTransition() {
  const main = document.querySelector('main');
  if (main) {
    main.classList.add('page-enter');
  }
}

/* ─── Hero Particles ────────────────────────────────────── */
function initHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  // Skip on mobile devices or reduced motion to guarantee 60fps buttery smooth performance
  if (window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animationDelay = (Math.random() * -15) + 's'; // Negative delay so they are already moving
    particle.style.animationDuration = (15 + Math.random() * 15) + 's';
    
    // Random sizes from 10px to 80px to look like bokeh bubbles
    const size = (10 + Math.random() * 70) + 'px';
    particle.style.width = size;
    particle.style.height = size;
    fragment.appendChild(particle);
  }
  container.appendChild(fragment);
}

/* ─── Active Nav Link Highlight ─────────────────────────── */
function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
    }
  });
}
