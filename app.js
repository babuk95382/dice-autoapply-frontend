'use strict';
// ═══════════════════════════════════════════════════════
//  APP BOOTSTRAP
// ═══════════════════════════════════════════════════════
window.addEventListener('load', () => {
  initTheme();
  _initCsrfToken();
  startBackgroundPolling();
});
