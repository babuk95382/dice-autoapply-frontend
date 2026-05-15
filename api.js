'use strict';
// ═══════════════════════════════════════════════════════
//  API LAYER — Centralized fetch wrapper
// ═══════════════════════════════════════════════════════

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return "";
}

async function _initCsrfToken() {
  try {
    const res = await fetch(API_BASE + '/api/csrf', { credentials: 'include' });
    const data = await res.json();
    if (data && data.csrf_token) _csrfToken = data.csrf_token;
  } catch(e) {
    console.warn('Could not fetch CSRF token', e);
  }
}

function getCsrfToken() {
  return _csrfToken || getCookie('csrf_token');
}

async function _tryRefreshToken() {
  if (_refreshing) {
    return new Promise(resolve => _refreshQueue.push(resolve));
  }
  _refreshing = true;
  try {
    const r = await fetch(API_BASE + '/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() }
    });
    const ok = r.ok;
    _refreshQueue.forEach(resolve => resolve(ok));
    _refreshQueue = [];
    return ok;
  } catch {
    _refreshQueue.forEach(resolve => resolve(false));
    _refreshQueue = [];
    return false;
  } finally {
    _refreshing = false;
  }
}

async function apiFetch(url, opts = {}, _retry = true) {
  const method = (opts.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await _initCsrfToken();
  }
  const res = await fetch(API_BASE + url, {
    credentials: 'include', ...opts,
    headers: { 'X-CSRF-Token': getCsrfToken(), ...(opts.headers || {}) }
  });
  if (res.status === 401 && _retry) {
    const refreshed = await _tryRefreshToken();
    if (refreshed) return apiFetch(url, opts, false);
    ['candidate','recruiter','admin'].forEach(role => {
      if (authState[role]?.loggedIn) {
        authState[role].loggedIn = false;
        authState[role].user = null;
      }
    });
    toast('Session expired — please log in again.', 'err', 5000);
  }
  return res;
}

async function apiPost(url, body) {
  return apiFetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}
