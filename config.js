/**
 * Frontend config: backend API URL.
 *
 * Production: frontend on GitHub Pages (malus.sh), backend at api.malus.sh.
 * Local dev: set window.BACKEND_API_URL = "http://localhost:8000" before this script.
 */
(function() {
  window.BACKEND_API_URL = window.BACKEND_API_URL || 'https://api.malus.sh';
  window.STATUS_BUCKET_URL = window.STATUS_BUCKET_URL || 'https://api.malus.sh';
})();
