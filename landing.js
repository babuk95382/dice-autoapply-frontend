'use strict';
// ═══════════════════════════════════════════════════════
//  HIREFLOW LANDING PAGE JAVASCRIPT
// ═══════════════════════════════════════════════════════

// ── Enter App (hide landing, show dashboard) ──
function enterApp() {
  const landing = document.getElementById('landing-page');
  const appRoot = document.getElementById('app-root');
  if (landing) {
    landing.style.opacity = '0';
    landing.style.transition = 'opacity 0.35s ease';
    setTimeout(() => {
      landing.style.display = 'none';
      if (appRoot) {
        appRoot.style.display = '';
        // Restore grid display
        appRoot.style.opacity = '0';
        appRoot.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => { appRoot.style.opacity = '1'; });
      }
    }, 350);
  }
}

// ── Show landing (e.g. on logout) ──
function showLanding() {
  const landing = document.getElementById('landing-page');
  const appRoot = document.getElementById('app-root');
  if (landing) {
    landing.style.display = '';
    landing.style.opacity = '0';
    setTimeout(() => {
      landing.style.opacity = '1';
      landing.style.transition = 'opacity 0.35s ease';
    }, 10);
  }
  if (appRoot) appRoot.style.display = 'none';
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Navbar scroll effect ──
window.addEventListener('scroll', () => {
  const nav = document.getElementById('lp-nav');
  if (!nav) return;
  if (window.scrollY > 40) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}, { passive: true });

// ── Smooth scroll for anchor links ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lp-nav-links a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        // Close mobile nav if open
        document.getElementById('lp-nav-links')?.classList.remove('open');
        document.getElementById('lp-burger')?.classList.remove('open');
      }
    });
  });
});

// ── Mobile nav toggle ──
function toggleLpNav() {
  const links  = document.getElementById('lp-nav-links');
  const burger = document.getElementById('lp-burger');
  if (!links) return;
  links.classList.toggle('open');
  burger?.classList.toggle('open');
}

// ── FAQ toggle ──
function toggleLpFaq(item) {
  const isOpen = item.getAttribute('aria-expanded') === 'true';
  // Close all
  document.querySelectorAll('.lp-faq-item').forEach(el => el.setAttribute('aria-expanded', 'false'));
  // Open clicked if it was closed
  if (!isOpen) item.setAttribute('aria-expanded', 'true');
}

// ── Scroll-reveal animation ──
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll(
      '#landing-page .lp-feat-card, #landing-page .lp-step, #landing-page .lp-price-card, #landing-page .lp-about-card, #landing-page .lp-faq-item'
    );
    targets.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      observer.observe(el);
    });
  });
})();

// ── Hook: Show landing when all roles log out ──
// Patch candidateLogout, recruiterLogout, adminLogout to show landing
window.addEventListener('DOMContentLoaded', () => {
  // Wait for main JS to define logout functions, then wrap them
  const patchLogouts = () => {
    if (typeof candidateLogout === 'function' && !candidateLogout._lpPatched) {
      const orig = candidateLogout;
      window.candidateLogout = function() {
        orig.apply(this, arguments);
        // Only show landing if no other role is logged in
        setTimeout(() => {
          const anyLoggedIn = (
            (typeof authState !== 'undefined') &&
            (authState.candidate?.loggedIn || authState.recruiter?.loggedIn || authState.admin?.loggedIn)
          );
          if (!anyLoggedIn) showLanding();
        }, 100);
      };
      window.candidateLogout._lpPatched = true;
    }
    if (typeof recruiterLogout === 'function' && !recruiterLogout._lpPatched) {
      const orig = recruiterLogout;
      window.recruiterLogout = function() {
        orig.apply(this, arguments);
        setTimeout(() => {
          const anyLoggedIn = (
            (typeof authState !== 'undefined') &&
            (authState.candidate?.loggedIn || authState.recruiter?.loggedIn || authState.admin?.loggedIn)
          );
          if (!anyLoggedIn) showLanding();
        }, 100);
      };
      window.recruiterLogout._lpPatched = true;
    }
    if (typeof adminLogout === 'function' && !adminLogout._lpPatched) {
      const orig = adminLogout;
      window.adminLogout = function() {
        orig.apply(this, arguments);
        setTimeout(() => {
          const anyLoggedIn = (
            (typeof authState !== 'undefined') &&
            (authState.candidate?.loggedIn || authState.recruiter?.loggedIn || authState.admin?.loggedIn)
          );
          if (!anyLoggedIn) showLanding();
        }, 100);
      };
      window.adminLogout._lpPatched = true;
    }
  };

  // Try immediately, retry after short delay to ensure main JS loaded
  patchLogouts();
  setTimeout(patchLogouts, 500);
});
