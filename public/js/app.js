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

/* ─── Hero Particles / Bubbles ─────────────────────────── */
function initHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  container.innerHTML = '';

  const isMobile = window.innerWidth < 768;

  // Refined smaller bubble coordinates & mobility preserving animations
  const bubbleConfigs = [
    { left: '6%', top: '22%', size: 18, type: 'gold', anim: 'bubble-float-1', dur: 9, delay: -2 },
    { left: '12%', top: '65%', size: 15, type: 'emerald', anim: 'bubble-float-2', dur: 12, delay: -5 },
    { left: '19%', top: '35%', size: 22, type: 'gold', anim: 'bubble-float-3', dur: 10, delay: -3 },
    { left: '25%', top: '80%', size: 14, type: 'emerald', anim: 'bubble-float-1', dur: 14, delay: -7 },
    { left: '32%', top: '15%', size: 20, type: 'gold', anim: 'bubble-float-2', dur: 11, delay: -1 },
    { left: '38%', top: '55%', size: 16, type: 'gold', anim: 'bubble-float-3', dur: 13, delay: -8 },
    { left: '45%', top: '10%', size: 19, type: 'emerald', anim: 'bubble-float-1', dur: 15, delay: -4 },
    { left: '52%', top: '72%', size: 15, type: 'gold', anim: 'bubble-float-2', dur: 10, delay: -6 },
    { left: '60%', top: '28%', size: 24, type: 'emerald', anim: 'bubble-float-3', dur: 12, delay: -9 },
    { left: '67%', top: '68%', size: 26, type: 'gold', anim: 'bubble-float-2', dur: 11, delay: -2 },
    { left: '72%', top: '18%', size: 16, type: 'gold', anim: 'bubble-float-1', dur: 13, delay: -4 },
    { left: '77%', top: '48%', size: 22, type: 'emerald', anim: 'bubble-float-3', dur: 10, delay: -5 },
    { left: '83%', top: '82%', size: 18, type: 'gold', anim: 'bubble-float-2', dur: 14, delay: -3 },
    { left: '88%', top: '25%', size: 20, type: 'emerald', anim: 'bubble-float-1', dur: 12, delay: -6 },
    { left: '92%', top: '62%', size: 17, type: 'gold', anim: 'bubble-float-3', dur: 11, delay: -7 },
    { left: '96%', top: '15%', size: 15, type: 'gold', anim: 'bubble-float-2', dur: 9, delay: -2 },
    { left: '15%', top: '88%', size: 21, type: 'gold', anim: 'bubble-float-1', dur: 15, delay: -5 },
    { left: '28%', top: '42%', size: 16, type: 'emerald', anim: 'bubble-float-2', dur: 10, delay: -4 },
    { left: '55%', top: '40%', size: 18, type: 'gold', anim: 'bubble-float-3', dur: 13, delay: -8 },
    { left: '74%', top: '86%', size: 25, type: 'gold', anim: 'bubble-float-1', dur: 12, delay: -1 },
    { left: '42%', top: '85%', size: 17, type: 'emerald', anim: 'bubble-float-2', dur: 14, delay: -6 },
    { left: '86%', top: '45%', size: 19, type: 'gold', anim: 'bubble-float-3', dur: 11, delay: -3 }
  ];

  const activeConfigs = isMobile ? bubbleConfigs.slice(0, 12) : bubbleConfigs;
  const fragment = document.createDocumentFragment();

  activeConfigs.forEach((cfg) => {
    const bubble = document.createElement('div');
    bubble.className = `hero-bubble hero-bubble-${cfg.type}`;
    const scale = isMobile ? 0.8 : 1.0;
    const finalSize = Math.round(cfg.size * scale);

    bubble.style.left = cfg.left;
    bubble.style.top = cfg.top;
    bubble.style.width = finalSize + 'px';
    bubble.style.height = finalSize + 'px';
    bubble.style.animation = `${cfg.anim} ${cfg.dur}s ease-in-out ${cfg.delay}s infinite alternate`;

    fragment.appendChild(bubble);
  });

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
