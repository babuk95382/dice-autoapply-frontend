'use strict';
// ═══════════════════════════════════════════════════════
//  SIDEBAR SYSTEM
// ═══════════════════════════════════════════════════════
const SIDEBAR_MENUS = {
  candidate: {
    sections: [
      { label: 'Workspace', items: [
        { id: 'dashboard',  icon: '⊡', label: 'Dashboard',      action: () => { showCandidateView('setup'); scrollToId('c-dashboard-setup'); } },
        { id: 'autoapply',  icon: '⚡', label: 'Workflow',     action: () => { showCandidateView('setup'); setTimeout(() => scrollToId('btn-run-c'), 100); }, badge: 'AI' },
        { id: 'searchjobs', icon: '🔍', label: 'Search Jobs',    action: () => { showCandidateView('setup'); setTimeout(() => scrollToId('s-tags'), 100); } },
      ]},
      { label: 'Insights', items: [
        { id: 'analytics',  icon: '📊', label: 'Analytics',      action: () => showCandidateView('dashboard') },
        { id: 'logs',       icon: '📋', label: 'Live Logs',      action: () => showCandidateView('dashboard') },
      ]},
      { label: 'Account', items: [
        { id: 'resume',     icon: '📄', label: 'Resume Manager', action: () => { showCandidateView('setup'); setTimeout(() => scrollToId('c-dashboard-setup'), 100); } },
        { id: 'billing',    icon: '💳', label: 'Billing',        action: () => showCandidateView('subscription') },
        { id: 'settings',   icon: '⚙️', label: 'Settings',       action: () => { showCandidateView('setup'); setTimeout(() => scrollToId('s-date'), 100); } },
      ]}
    ],
    getUser: () => authState.candidate.user, roleLabel: 'Candidate', onLogout: () => candidateLogout()
  },
  recruiter: {
    sections: [
      { label: 'Workspace', items: [
        { id: 'dashboard',  icon: '⊡', label: 'Dashboard',         action: () => { showRecruiterView('setup'); scrollToId('r-dashboard-setup'); } },
        { id: 'candidates', icon: '👥', label: 'Candidates',        action: () => { showRecruiterView('setup'); setTimeout(() => scrollToId('r-cand-list'), 100); } },
        { id: 'automation', icon: '⚡', label: 'Bulk Automation',   action: () => { showRecruiterView('setup'); setTimeout(() => scrollToId('btn-run-r'), 100); }, badge: 'AI' },
      ]},
      { label: 'Insights', items: [
        { id: 'analytics',  icon: '📊', label: 'Analytics',         action: () => { showRecruiterView('setup'); setTimeout(() => scrollToId('r-date-report-wrap'), 100); } },
        { id: 'reports',    icon: '📋', label: 'Reports',           action: () => { showRecruiterView('setup'); setTimeout(() => scrollToId('r-date-report-wrap'), 100); } },
        { id: 'logs',       icon: '🖥️', label: 'Live Logs',         action: () => showRecruiterView('dashboard') },
      ]},
      { label: 'Account', items: [
        { id: 'billing',    icon: '💳', label: 'Billing',           action: () => showRecruiterView('subscription') },
        { id: 'settings',   icon: '⚙️', label: 'Settings',          action: () => { showRecruiterView('setup'); scrollToId('r-dashboard-setup'); } },
      ]}
    ],
    getUser: () => authState.recruiter.user, roleLabel: 'Recruiter', onLogout: () => recruiterLogout()
  },
  admin: {
    sections: [
      { label: 'Overview', items: [
        { id: 'overview',   icon: '⊡', label: 'Dashboard',          action: () => switchAdminTab('overview') },
        { id: 'users',      icon: '👤', label: 'Users',              action: () => switchAdminTab('users') },
        { id: 'subs',       icon: '💎', label: 'Subscriptions',      action: () => switchAdminTab('subs'), badge: 'New' },
        { id: 'revenue',    icon: '📈', label: 'Revenue',            action: () => switchAdminTab('overview') },
      ]},
      { label: 'Control', items: [
        { id: 'automation', icon: '⚡', label: 'Automation Control', action: () => switchAdminTab('settings') },
        { id: 'syslogs',    icon: '🖥️', label: 'System Logs',        action: () => switchAdminTab('live') },
        { id: 'platform',   icon: '⚙️', label: 'Platform Settings',  action: () => switchAdminTab('settings') },
        { id: 'security',   icon: '🛡️', label: 'Security',           action: () => switchAdminTab('security') },
      ]}
    ],
    getUser: () => ({ name: 'Admin', email: 'admin' }), roleLabel: 'Administrator', onLogout: () => adminLogout()
  }
};

function _sbIsCollapsed() { return localStorage.getItem('dice-sidebar-collapsed') === '1'; }
function _sbSetCollapsed(val) { localStorage.setItem('dice-sidebar-collapsed', val ? '1' : '0'); }

function renderSidebar(role) {
  const config  = SIDEBAR_MENUS[role];
  if (!config) return;
  _sbActiveRole = role;
  const appEl   = document.getElementById('app-root');
  const sidebar = document.getElementById('app-sidebar');
  const nav     = document.getElementById('sb-nav');
  const profile = document.getElementById('sb-profile');
  const burger  = document.getElementById('sb-hamburger-btn');
  if (!sidebar || !nav || !profile) return;
  sidebar.classList.add('visible');
  appEl.classList.remove('no-sidebar');
  appEl.classList.add('has-sidebar');
  if (burger) burger.style.display = 'flex';
  if (_sbIsCollapsed()) appEl.classList.add('sidebar-collapsed');
  let navHtml = '';
  config.sections.forEach(section => {
    navHtml += `<div class="sb-section-label">${escHtml(section.label)}</div>`;
    section.items.forEach(item => {
      const badge = item.badge ? `<span class="sb-badge">${escHtml(item.badge)}</span>` : '';
      navHtml += `<div class="sb-item" id="sb-item-${escHtml(item.id)}" data-id="${escHtml(item.id)}" data-tooltip="${escHtml(item.label)}" onclick="sidebarNavigate('${escHtml(item.id)}')"><span class="sb-icon">${item.icon}</span><span class="sb-label">${escHtml(item.label)}</span>${badge}</div>`;
    });
    navHtml += `<div class="sb-divider"></div>`;
  });
  nav.innerHTML = navHtml;
  const user = config.getUser();
  const name = (user?.name || user?.email || 'User');
  profile.innerHTML = `<div class="sb-profile-inner" data-tooltip="${escHtml(name)}">
    <div class="sb-avatar" id="sb-profile-avatar">${name[0].toUpperCase()}</div>
    <div class="sb-profile-text"><div class="sb-profile-name" id="sb-profile-name">${escHtml(name)}</div><div class="sb-profile-role">${escHtml(config.roleLabel)}</div></div>
    <button class="sb-logout-btn" onclick="sidebarLogout(event)" title="Sign out" aria-label="Sign out">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2.5A1 1 0 001.5 3v7a1 1 0 001 1H5M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>`;
  const firstId = config.sections[0]?.items[0]?.id;
  if (firstId) sidebarSetActive(firstId, false);
}

function sidebarUpdateProfile(name) {
  const el = document.getElementById('sb-profile-name');
  const av = document.getElementById('sb-profile-avatar');
  if (el) el.textContent = name || 'User';
  if (av) av.textContent = (name || 'U')[0].toUpperCase();
}

function hideSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const appEl   = document.getElementById('app-root');
  const burger  = document.getElementById('sb-hamburger-btn');
  if (sidebar) sidebar.classList.remove('visible');
  if (appEl)   { appEl.classList.add('no-sidebar'); appEl.classList.remove('has-sidebar'); }
  if (burger)  burger.style.display = 'none';
  _sbActiveRole = null; _sbActiveItem = null;
  sidebarCloseMobile();
}

function sidebarNavigate(id) {
  const config = SIDEBAR_MENUS[_sbActiveRole];
  if (!config) return;
  sidebarSetActive(id, true);
  sidebarCloseMobile();
}

function sidebarSetActive(id, runAction) {
  const config = SIDEBAR_MENUS[_sbActiveRole];
  if (!config) return;
  _sbActiveItem = id;
  document.querySelectorAll('.sb-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  if (runAction) config.sections.forEach(s => s.items.forEach(item => { if (item.id === id && typeof item.action === 'function') item.action(); }));
}

function sidebarToggleCollapse() {
  const appEl = document.getElementById('app-root');
  const isNowCollapsed = appEl.classList.toggle('sidebar-collapsed');
  _sbSetCollapsed(isNowCollapsed);
}

function sidebarToggleMobile() { _sbMobileOpen ? sidebarCloseMobile() : sidebarOpenMobile(); }
function sidebarOpenMobile() {
  _sbMobileOpen = true;
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sb-overlay');
  const burger  = document.getElementById('sb-hamburger-btn');
  if (sidebar) sidebar.classList.add('mobile-open');
  if (overlay) overlay.classList.add('active');
  if (burger)  burger.classList.add('open');
}
function sidebarCloseMobile() {
  _sbMobileOpen = false;
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sb-overlay');
  const burger  = document.getElementById('sb-hamburger-btn');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
  if (burger)  burger.classList.remove('open');
}

function sidebarLogout(e) {
  if (e) e.stopPropagation();
  const config = SIDEBAR_MENUS[_sbActiveRole];
  if (config && typeof config.onLogout === 'function') config.onLogout();
  hideSidebar();
}

function switchAdminTab(tabId) {
  const sectionMap = { 'overview':'a-dashboard', 'users':'admin-section-users', 'subs':'admin-section-subs', 'settings':'admin-section-settings', 'payment':'admin-section-payment', 'security':'admin-section-security', 'live':'tab-content-live' };
  const targetId = sectionMap[tabId];
  if (!targetId) return;
  if (tabId === 'live') { const liveSection = document.getElementById('tab-content-live'); if (liveSection) liveSection.style.display = ''; startLiveDashboardPolling(); }
  const el = document.getElementById(targetId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════════════════
//  ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════
async function saveAutomationSettings() {
  const batch    = parseInt(document.getElementById('a-cand-batch').value) || 10;
  const headless = document.getElementById('a-cand-headless').value === 'true';
  const parallel = parseInt(document.getElementById('a-rec-parallel').value) || 3;
  const msg = document.getElementById('a-settings-msg');
  try {
    const res = await apiPost('/api/admin/settings', { batch_size: batch, headless, max_parallel: parallel });
    const data = await res.json();
    msg.style.display = 'block';
    if (res.ok) { msg.style.color = 'var(--green)'; msg.textContent = '✅ Settings saved.'; }
    else { msg.style.color = 'var(--red)'; msg.textContent = '❌ ' + (data.error || 'Save failed'); }
  } catch(e) { msg.style.display = 'block'; msg.style.color = 'var(--red)'; msg.textContent = '❌ Network error'; }
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

async function loadAdminSettings() {
  try {
    const res = await fetch(API_BASE + '/api/admin/settings', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('a-cand-batch').value    = data.batch_size   || 10;
      document.getElementById('a-cand-headless').value = data.headless ? 'true' : 'false';
      document.getElementById('a-rec-parallel').value  = data.max_parallel || 5;
    }
  } catch(e) {}
}

async function loadAdminDashboard() {
  try {
    const res = await fetch(API_BASE + '/api/admin/dashboard', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    if (!res.ok) return;
    const data = await res.json();
    setStatNum('a-active',        data.active_runners ?? 0);
    setStatNum('a-queue',         0);
    setStatNum('a-total-users',   data.total_users    ?? 0);
    setStatNum('a-total-applied', data.jobs_today     ?? 0);
    const users = data.users || [];
    const tbody = document.getElementById('a-users-tbody');
    if (tbody) {
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px;font-size:12px;">No users found.</td></tr>';
      } else {
        tbody.innerHTML = users.map(u => {
          const cls = u.status === 'active' ? (u.plan === 'trial' ? 'trial' : 'active') : 'expired';
          const started = u.started_at ? formatDate(u.started_at) : '—';
          return `<tr><td><strong>${escHtml(u.name)}</strong><br><span style="font-size:10.5px;color:var(--text3)">${escHtml(u.email)}</span></td><td style="color:var(--text3);font-size:12px">${escHtml(u.type)}</td><td><span class="pill purple">${escHtml(u.plan_label||'—')}</span></td><td style="color:var(--text3);font-size:11px">${started}</td><td style="font-family:'Syne',sans-serif;font-weight:700;color:var(--accent2)">${u.days_left ?? 0}d</td><td><span class="sub-badge ${cls}">${escHtml(u.status)}</span></td></tr>`;
        }).join('');
      }
    }
    const liveEl = document.getElementById('a-live-candidates');
    if (liveEl) {
      const running = users.filter(u => u.live_status === 'Running');
      liveEl.innerHTML = running.length === 0
        ? '<div style="color:var(--text3);font-size:12px;padding:8px 0">No candidates currently running.</div>'
        : running.map(u => `<div class="user-row"><div class="user-row-left"><div class="avatar" style="width:28px;height:28px;font-size:11px">${initials(u.name, u.email)}</div><div><div class="user-row-name">${escHtml(u.name)}</div><div class="user-row-meta">${escHtml(u.email)}</div></div></div><span style="color:var(--green);font-size:11px;font-weight:700">● Running</span></div>`).join('');
    }
  } catch(e) {}
  loadEmailSettings();
  loadEmailTemplates();
}

// ── Admin Search ──
let _adminSubFilter = '';
let _adminSearchDebounce = null;

function debounceAdminSearch() { clearTimeout(_adminSearchDebounce); _adminSearchDebounce = setTimeout(runAdminSearch, 500); }
function setAdminSubFilter(val) {
  _adminSubFilter = val;
  ['all','active','expired'].forEach(k => { document.getElementById(`afl-${k}`)?.classList.toggle('active', val === '' ? k === 'all' : k === val); });
  runAdminSearch();
}
function clearAdminSearch() {
  document.getElementById('a-search-input').value = '';
  document.getElementById('afl-date-from').value  = '';
  document.getElementById('afl-date-to').value    = '';
  _adminSubFilter = '';
  setAdminSubFilter('');
}

async function runAdminSearch() {
  const q = (document.getElementById('a-search-input')?.value || '').trim();
  const dateFrom = document.getElementById('afl-date-from')?.value || '';
  const dateTo   = document.getElementById('afl-date-to')?.value   || '';
  const resEl = document.getElementById('a-search-results');
  if (!resEl) return;
  resEl.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px 0">Searching…</div>';
  try {
    let url = `/api/admin/search?q=${encodeURIComponent(q)}&sub_status=${encodeURIComponent(_adminSubFilter)}`;
    if (dateFrom) url += `&date_from=${encodeURIComponent(dateFrom)}`;
    if (dateTo)   url += `&date_to=${encodeURIComponent(dateTo)}`;
    const res  = await apiFetch(url, { credentials: 'include' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      const errMsg = d.error || 'Search failed';
      if (errMsg.toLowerCase().includes('supabase') || res.status === 503) {
        resEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 0"><div style="font-size:28px">🔌</div><div style="color:var(--text3);font-size:13px;font-weight:600">Supabase Not Connected</div></div>`;
      } else {
        resEl.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px">${escHtml(errMsg)}</div>`;
      }
      return;
    }
    const data    = await res.json();
    const results = data.results || [];
    if (results.length === 0) { resEl.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:12px 0;text-align:center">No results found.</div>'; return; }
    resEl.innerHTML = `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">${results.length} result${results.length !== 1 ? 's' : ''} found</div>` +
      results.map(r => {
        const subCls   = r.sub_status === 'active' ? (r.plan === 'trial' ? 'trial' : 'active') : 'expired';
        const subLabel = r.sub_status === 'active' ? (r.plan === 'trial' ? 'Trial' : 'Pro') : 'Expired';
        const liveCls  = r.live_status === 'Running' ? 'var(--green)' : r.live_status === 'Done' ? 'var(--accent2)' : r.live_status === 'Stopped' ? 'var(--red)' : 'var(--text3)';
        return `<div class="search-result-card"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px"><div><div class="src-name">${escHtml(r.name || '—')}</div><div class="src-meta">${escHtml(r.type)}</div>${r.email ? `<div class="src-meta">📧 ${escHtml(r.email)}</div>` : ''}${r.dice_email ? `<div class="src-meta">📧 Email: ${escHtml(r.dice_email)}</div>` : ''}<div class="src-meta">🕐 Last active: ${formatDate(r.last_active) || '—'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0"><span class="sub-badge ${subCls}">${subLabel}</span>${r.days_left > 0 ? `<span style="font-size:10px;color:var(--text3)">${r.days_left}d left</span>` : ''}<span style="font-size:11px;font-weight:700;color:${liveCls}">${r.live_status||'Idle'}</span></div></div></div>`;
      }).join('');
  } catch(e) {
    resEl.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px">Error: ${escHtml(String(e))}</div>`;
  }
}

function exportAdminReport() { window.open('/api/admin/export/users', '_blank'); }

// ── Subscription Override ──
async function _resolveUserId(email, userType) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/search?q=${encodeURIComponent(email)}`, { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok || !data.ok) return null;
    const match = (data.results || []).find(u => u.email.toLowerCase() === email.toLowerCase() && u.type.toLowerCase() === userType.toLowerCase());
    return match ? match.id : null;
  } catch(e) { return null; }
}

function _showSubOverrideMsg(text, type) {
  const el = document.getElementById('sub-override-msg');
  if (!el) return;
  el.style.display = 'block';
  el.style.color   = type === 'ok' ? 'var(--green)' : type === 'err' ? 'var(--red)' : 'var(--amber)';
  el.style.background = type === 'ok' ? 'rgba(37,211,102,0.07)' : type === 'err' ? 'rgba(255,107,107,0.07)' : 'rgba(251,191,36,0.07)';
  el.style.border  = `1px solid ${type === 'ok' ? 'rgba(37,211,102,0.2)' : type === 'err' ? 'rgba(255,107,107,0.2)' : 'rgba(251,191,36,0.2)'}`;
  el.textContent   = text;
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function adminSubGrant() {
  const email = document.getElementById('so-user-email').value.trim();
  const userType = document.getElementById('so-user-type').value;
  const plan     = document.getElementById('so-plan').value;
  const days     = parseInt(document.getElementById('so-days').value) || 0;
  if (!email) { _showSubOverrideMsg('Please enter a user email.', 'err'); return; }
  _showSubOverrideMsg('Looking up user…', 'info');
  const userId = await _resolveUserId(email, userType);
  if (!userId) { _showSubOverrideMsg('User not found. Check email and type.', 'err'); return; }
  try {
    const res  = await apiPost('/api/admin/subscription/grant', { user_id: userId, user_type: userType, plan, days });
    const data = await res.json();
    if (res.ok && data.ok) { _showSubOverrideMsg('✅ ' + data.message, 'ok'); loadAdminDashboard(); }
    else { _showSubOverrideMsg('❌ ' + (data.error || 'Failed'), 'err'); }
  } catch(e) { _showSubOverrideMsg('❌ Network error', 'err'); }
}

async function adminSubExtend() {
  const email = document.getElementById('so-user-email').value.trim();
  const userType = document.getElementById('so-user-type').value;
  const days     = parseInt(document.getElementById('so-days').value) || 0;
  if (!email) { _showSubOverrideMsg('Please enter a user email.', 'err'); return; }
  if (days <= 0) { _showSubOverrideMsg('Enter days > 0 to extend.', 'err'); return; }
  _showSubOverrideMsg('Looking up user…', 'info');
  const userId = await _resolveUserId(email, userType);
  if (!userId) { _showSubOverrideMsg('User not found.', 'err'); return; }
  try {
    const res  = await apiPost('/api/admin/subscription/extend', { user_id: userId, user_type: userType, days });
    const data = await res.json();
    if (res.ok && data.ok) { _showSubOverrideMsg('✅ ' + data.message, 'ok'); loadAdminDashboard(); }
    else { _showSubOverrideMsg('❌ ' + (data.error || 'Failed'), 'err'); }
  } catch(e) { _showSubOverrideMsg('❌ Network error', 'err'); }
}

async function adminSubRevoke() {
  const email = document.getElementById('so-user-email').value.trim();
  const userType = document.getElementById('so-user-type').value;
  if (!email) { _showSubOverrideMsg('Please enter a user email.', 'err'); return; }
  if (!confirm(`Revoke subscription for ${email}?`)) return;
  _showSubOverrideMsg('Revoking…', 'info');
  const userId = await _resolveUserId(email, userType);
  if (!userId) { _showSubOverrideMsg('User not found.', 'err'); return; }
  try {
    const res  = await apiPost('/api/admin/subscription/revoke', { user_id: userId, user_type: userType });
    const data = await res.json();
    if (res.ok && data.ok) { _showSubOverrideMsg('✅ Subscription revoked.', 'ok'); loadAdminDashboard(); }
    else { _showSubOverrideMsg('❌ ' + (data.error || 'Failed'), 'err'); }
  } catch(e) { _showSubOverrideMsg('❌ Network error', 'err'); }
}

// ── Razorpay settings ──
async function loadRazorpaySettings() {
  const icon = document.getElementById('rzp-status-icon');
  const text = document.getElementById('rzp-status-text');
  const sub  = document.getElementById('rzp-status-sub');
  const curRow = document.getElementById('rzp-current-row');
  const masked = document.getElementById('rzp-current-masked');
  const updAt  = document.getElementById('rzp-updated-at');
  if (icon) icon.textContent = '⏳';
  if (text) text.textContent = 'Checking Razorpay configuration…';
  try {
    const res  = await fetch(API_BASE + '/api/admin/payment-settings', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok) { if (icon) icon.textContent = '❌'; if (text) text.textContent = 'Failed to load'; return; }
    if (data.configured) {
      if (icon) icon.textContent = '✅';
      if (text) text.textContent = 'Razorpay is configured and active';
      if (sub)  sub.textContent  = data.source === 'env' ? 'Keys loaded from environment variables.' : 'Keys loaded from database.';
      const kidInput = document.getElementById('rzp-key-id');
      if (kidInput && data.razorpay_key_id) kidInput.value = data.razorpay_key_id;
      if (curRow) curRow.style.display  = '';
      if (masked) masked.textContent    = data.secret_masked || '';
      if (updAt && data.updated_at) updAt.textContent = '· Updated ' + new Date(data.updated_at).toLocaleString();
    } else {
      if (icon) icon.textContent = '⚠️';
      if (text) text.textContent = 'Razorpay not configured';
      if (sub)  sub.textContent  = 'Enter your API keys below to enable subscriptions.';
      if (curRow) curRow.style.display = 'none';
    }
  } catch(e) { if (icon) icon.textContent = '❌'; if (text) text.textContent = 'Network error'; }
}

async function saveRazorpaySettings() {
  const kid    = (document.getElementById('rzp-key-id')?.value     || '').trim();
  const secret = (document.getElementById('rzp-key-secret')?.value || '').trim();
  const msgEl  = document.getElementById('rzp-config-msg');
  const btnTxt = document.getElementById('rzp-save-btn-text');
  const btnSpin= document.getElementById('rzp-save-spinner');
  const kidErr = document.getElementById('rzp-key-id-err');
  const secErr = document.getElementById('rzp-key-secret-err');
  if (kidErr) { kidErr.style.display = 'none'; }
  if (secErr) { secErr.style.display = 'none'; }
  if (msgEl)  { msgEl.style.display  = 'none'; }
  let valid = true;
  if (!kid) { if (kidErr) { kidErr.textContent = 'Key ID is required'; kidErr.style.display = ''; } valid = false; }
  else if (!kid.startsWith('rzp_live_') && !kid.startsWith('rzp_test_')) { if (kidErr) { kidErr.textContent = 'Must start with rzp_live_ or rzp_test_'; kidErr.style.display = ''; } valid = false; }
  if (!secret) { if (secErr) { secErr.textContent = 'Key Secret is required'; secErr.style.display = ''; } valid = false; }
  if (!valid) return;
  if (btnTxt)  btnTxt.style.display  = 'none';
  if (btnSpin) btnSpin.style.display = '';
  try {
    const res  = await apiPost('/api/admin/payment-settings', { razorpay_key_id: kid, razorpay_key_secret: secret });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (msgEl) { msgEl.style.display=''; msgEl.style.color='var(--green)'; msgEl.textContent='✅ ' + data.message; }
      document.getElementById('rzp-key-secret').value = '';
      toast('✅ Razorpay keys saved successfully!', 'ok');
      await loadRazorpaySettings();
    } else {
      if (msgEl) { msgEl.style.display=''; msgEl.style.color='var(--red)'; msgEl.textContent='❌ ' + (data.error || 'Save failed'); }
      toast('❌ ' + (data.error || 'Save failed'), 'err');
    }
  } catch(e) { if (msgEl) { msgEl.style.display=''; msgEl.style.color='var(--red)'; msgEl.textContent='❌ Network error'; } } 
  finally { if (btnTxt) btnTxt.style.display=''; if (btnSpin) btnSpin.style.display='none'; setTimeout(() => { if (msgEl) msgEl.style.display='none'; }, 5000); }
}

function toggleRzpSecretVisibility() {
  const inp = document.getElementById('rzp-key-secret');
  const btn = document.getElementById('rzp-secret-toggle');
  if (!inp) return;
  const eyeOpen = `<svg viewBox="0 0 20 20" fill="none"><path d="M10 4.5C5.5 4.5 2 10 2 10s3.5 5.5 8 5.5 8-5.5 8-5.5-3.5-5.5-8-5.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const eyeOff  = `<svg viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14M10 4.5C5.5 4.5 2 10 2 10s1.4 2.2 3.7 3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  if (inp.type === 'password') { inp.type='text'; if (btn) { btn.innerHTML=eyeOff; btn.title='Hide secret'; } }
  else { inp.type='password'; if (btn) { btn.innerHTML=eyeOpen; btn.title='Show secret'; } }
}

// ── Supabase ──
async function checkSupabaseStatus() {
  try {
    const res = await fetch(API_BASE + '/api/supabase/status', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const d   = await res.json();
    const badge = document.getElementById('sb-badge');
    const icon  = document.getElementById('sb-status-icon');
    const text  = document.getElementById('sb-status-text');
    const sub   = document.getElementById('sb-status-sub');
    if (d.configured) {
      if (badge) { badge.textContent = '● Connected'; badge.style.cssText = 'margin-left:auto;font-size:10px;padding:2px 10px;border-radius:999px;background:rgba(0,206,201,0.1);color:var(--green);border:1px solid rgba(0,206,201,0.3)'; }
      if (icon)  icon.textContent = '🟢';
      if (text)  { text.textContent = 'Supabase Connected'; text.style.color = 'var(--green)'; }
      if (sub)   sub.textContent  = d.url ? 'Project: ' + d.url : 'Database is reachable and operational.';
      const urlInp = document.getElementById('sb-url-input');
      if (urlInp && d.url && !urlInp.value) urlInp.value = d.url;
    } else {
      if (badge) { badge.textContent = 'Not connected'; badge.style.cssText = 'margin-left:auto;font-size:10px;padding:2px 10px;border-radius:999px;background:var(--red-dim);color:var(--red);border:1px solid rgba(255,118,117,0.3)'; }
      if (icon)  icon.textContent = '🔴';
      if (text)  { text.textContent = 'Supabase Not Connected'; text.style.color = 'var(--red)'; }
      if (sub)   sub.textContent  = 'Enter your project URL and service role key below to connect.';
    }
  } catch(e) {}
}

async function saveSupabaseConfig() {
  const url = (document.getElementById('sb-url-input')?.value || '').trim();
  const key = (document.getElementById('sb-key-input')?.value  || '').trim();
  const msg = document.getElementById('sb-config-msg');
  const btn = document.getElementById('sb-connect-btn');
  if (!url || !key) { if (msg) { msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='⚠️ Both URL and Service Role Key are required.'; } return; }
  if (!url.startsWith('https://')) { if (msg) { msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='⚠️ URL must start with https://'; } return; }
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spin"></div> Connecting…'; }
  if (msg) msg.style.display = 'none';
  try {
    const res  = await apiPost('/api/config/supabase', { url, key });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (msg) { msg.style.display='block'; msg.style.color='var(--green)'; msg.textContent='✅ Supabase connected successfully!'; }
      const keyInp = document.getElementById('sb-key-input');
      if (keyInp) keyInp.value = '';
      toast('✅ Supabase connected!', 'ok');
      await checkSupabaseStatus();
      loadAdminDashboard();
      runAdminSearch();
    } else {
      if (msg) { msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='❌ ' + (data.error || 'Connection failed.'); }
      toast('❌ ' + (data.error || 'Supabase connection failed'), 'err');
    }
  } catch(e) { if (msg) { msg.style.display='block'; msg.style.color='var(--red)'; msg.textContent='❌ Network error: ' + e.message; } }
  finally { if (btn) { btn.disabled=false; btn.innerHTML='🔗 Connect Supabase'; } }
}

function toggleSbKeyVisibility() {
  const inp = document.getElementById('sb-key-input');
  const btn = document.getElementById('sb-key-toggle');
  if (!inp) return;
  if (inp.type === 'password') { inp.type='text'; if(btn) btn.textContent='🙈'; }
  else { inp.type='password'; if(btn) btn.textContent='👁'; }
}

// ── Email Settings ──
function toggleEmailProviderFields() {
  const prov = document.getElementById('email-provider')?.value;
  document.getElementById('email-resend-fields').style.display = prov === 'resend' ? '' : 'none';
  document.getElementById('email-smtp-fields').style.display   = prov === 'smtp'   ? '' : 'none';
}

function _showEmailMsg(text, type) {
  const el = document.getElementById('email-settings-msg');
  if (!el) return;
  el.style.display = 'block';
  el.style.color   = type === 'ok' ? 'var(--green)' : type === 'err' ? 'var(--red)' : 'var(--amber)';
  el.style.background = type === 'ok' ? 'rgba(37,211,102,0.07)' : type === 'err' ? 'rgba(255,107,107,0.07)' : 'rgba(251,191,36,0.07)';
  el.style.border  = `1px solid ${type === 'ok' ? 'rgba(37,211,102,0.2)' : type === 'err' ? 'rgba(255,107,107,0.2)' : 'rgba(251,191,36,0.2)'}`;
  el.textContent   = text;
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function loadEmailSettings() {
  const icon = document.getElementById('email-status-icon');
  const text = document.getElementById('email-status-text');
  const sub  = document.getElementById('email-status-sub');
  const badge  = document.getElementById('email-provider-badge');
  const lastUpd = document.getElementById('email-last-updated');
  if (icon) icon.textContent = '⏳';
  if (text) text.textContent = 'Checking email configuration…';
  try {
    const res  = await fetch(API_BASE + '/api/admin/email-settings', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok || !data.ok) { if (icon) icon.textContent = '❌'; if (text) text.textContent = 'Failed to load settings'; return; }
    const s = data.settings;
    if (!s) { if (icon) icon.textContent = '⚙️'; if (text) text.textContent = 'Not configured'; if (badge) badge.style.display = 'none'; return; }
    document.getElementById('email-provider').value     = s.provider || 'smtp';
    document.getElementById('email-sender-name').value  = s.sender_name || '';
    document.getElementById('email-sender-email').value = s.sender_email || '';
    document.getElementById('email-smtp-host').value    = s.smtp_host || '';
    document.getElementById('email-smtp-port').value    = s.smtp_port || 587;
    document.getElementById('email-smtp-user').value    = s.smtp_username || '';
    document.getElementById('email-smtp-pass').value    = s.smtp_password ? '••••••••' : '';
    document.getElementById('email-resend-key').value   = s.api_key || '';
    toggleEmailProviderFields();
    if (icon)  icon.textContent  = s.is_active ? '✅' : '⚠️';
    if (text)  text.textContent  = s.is_active ? `${(s.provider||'smtp').toUpperCase()} — Active` : 'Provider inactive';
    if (sub)   sub.textContent   = `Sending from: ${s.sender_email || 'not set'}`;
    if (badge) { badge.textContent = (s.provider||'smtp').toUpperCase(); badge.style.display = ''; }
    if (lastUpd && s.updated_at) { lastUpd.style.display = ''; lastUpd.textContent = `Last updated: ${formatDate(s.updated_at)}`; }
  } catch(e) { if (icon) icon.textContent = '❌'; if (text) text.textContent = 'Network error'; }
}

async function saveEmailSettings() {
  const btn     = document.getElementById('email-save-btn');
  const btnText = document.getElementById('email-save-btn-text');
  btnText.textContent = '⏳ Saving…';
  btn.disabled = true;
  try {
    const payload = {
      provider:      document.getElementById('email-provider').value,
      sender_name:   document.getElementById('email-sender-name').value.trim(),
      sender_email:  document.getElementById('email-sender-email').value.trim(),
      api_key:       document.getElementById('email-resend-key').value,
      smtp_host:     document.getElementById('email-smtp-host').value.trim(),
      smtp_port:     parseInt(document.getElementById('email-smtp-port').value) || 587,
      smtp_username: document.getElementById('email-smtp-user').value.trim(),
      smtp_password: document.getElementById('email-smtp-pass').value,
    };
    const res  = await apiPost('/api/admin/email-settings', payload);
    const data = await res.json();
    if (res.ok && data.ok) { _showEmailMsg('✅ Email settings saved.', 'ok'); loadEmailSettings(); }
    else { _showEmailMsg('❌ ' + (data.error || 'Save failed'), 'err'); }
  } catch(e) { _showEmailMsg('❌ Network error', 'err'); }
  finally { btnText.textContent = '💾 Save Settings'; btn.disabled = false; }
}

async function sendTestEmail() {
  const btn     = document.getElementById('email-test-btn');
  const btnText = document.getElementById('email-test-btn-text');
  const toEmail = prompt('Send test email to:', '');
  if (!toEmail) return;
  btnText.textContent = '⏳ Sending…';
  btn.disabled = true;
  try {
    const res  = await apiPost('/api/admin/test-email', { to_email: toEmail });
    const data = await res.json();
    if (res.ok && data.ok) _showEmailMsg('✅ ' + data.message, 'ok');
    else _showEmailMsg('❌ ' + (data.error || 'Failed to send'), 'err');
  } catch(e) { _showEmailMsg('❌ Network error', 'err'); }
  finally { btnText.textContent = '📧 Send Test Email'; btn.disabled = false; }
}

async function sendReminders() {
  const days  = document.getElementById('email-reminder-days').value;
  const msgEl = document.getElementById('email-reminder-msg');
  msgEl.style.color = 'var(--text3)'; msgEl.textContent = '⏳ Sending…';
  try {
    const res  = await apiPost('/api/admin/send-reminders', { days_before: parseInt(days) });
    const data = await res.json();
    msgEl.style.color = res.ok && data.ok ? 'var(--green)' : 'var(--red)';
    msgEl.textContent = res.ok && data.ok ? '✅ ' + data.message : '❌ ' + (data.error || 'Failed');
  } catch(e) { msgEl.style.color = 'var(--red)'; msgEl.textContent = '❌ Network error'; }
  setTimeout(() => { msgEl.textContent = ''; }, 4000);
}

// ── Email Templates ──
async function loadEmailTemplates() {
  try {
    const res  = await fetch(API_BASE + '/api/admin/email-templates', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok || !data.ok) return;
    _emailTemplates = data.templates || [];
    const sel = document.getElementById('tpl-select');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">— choose a template —</option>' +
      _emailTemplates.map(t => `<option value="${escHtml(t.template_name)}">${escHtml(t.template_name.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))}</option>`).join('');
    if (cur) sel.value = cur;
  } catch(e) {}
}

function _showTplMsg(text, type) {
  const el = document.getElementById('email-tpl-msg');
  if (!el) return;
  el.style.display = 'block';
  el.style.color   = type === 'ok' ? 'var(--green)' : type === 'err' ? 'var(--red)' : 'var(--amber)';
  el.style.background = type === 'ok' ? 'rgba(37,211,102,0.07)' : type === 'err' ? 'rgba(255,107,107,0.07)' : 'rgba(251,191,36,0.07)';
  el.style.border  = `1px solid ${type === 'ok' ? 'rgba(37,211,102,0.2)' : type === 'err' ? 'rgba(255,107,107,0.2)' : 'rgba(251,191,36,0.2)'}`;
  el.textContent   = text;
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function loadTemplateEditor() {
  const sel  = document.getElementById('tpl-select');
  const name = sel?.value;
  const edWrap = document.getElementById('tpl-editor-wrap');
  const empty  = document.getElementById('tpl-empty');
  if (!name) { if (edWrap) edWrap.style.display = 'none'; if (empty) empty.style.display = ''; return; }
  const tpl = _emailTemplates.find(t => t.template_name === name);
  if (!tpl) return;
  document.getElementById('tpl-subject').value = tpl.subject   || '';
  document.getElementById('tpl-body').value    = tpl.body_html || '';
  document.getElementById('tpl-active').value  = tpl.is_active ? 'true' : 'false';
  if (edWrap) edWrap.style.display = '';
  if (empty)  empty.style.display  = 'none';
}

async function saveTemplate() {
  const name     = document.getElementById('tpl-select')?.value;
  const subject  = document.getElementById('tpl-subject').value.trim();
  const bodyHtml = document.getElementById('tpl-body').value;
  const isActive = document.getElementById('tpl-active').value === 'true';
  if (!name) { _showTplMsg('Select a template first.', 'err'); return; }
  try {
    const res  = await apiPost('/api/admin/email-template', { template_name: name, subject, body_html: bodyHtml, is_active: isActive });
    const data = await res.json();
    if (res.ok && data.ok) { _showTplMsg('✅ Template saved.', 'ok'); loadEmailTemplates(); }
    else { _showTplMsg('❌ ' + (data.error || 'Save failed'), 'err'); }
  } catch(e) { _showTplMsg('❌ Network error', 'err'); }
}

async function testTemplate() {
  const name    = document.getElementById('tpl-select')?.value;
  if (!name) { _showTplMsg('Select a template first.', 'err'); return; }
  const toEmail = prompt('Send test to:', '');
  if (!toEmail) return;
  const btn = document.getElementById('tpl-test-btn');
  btn.textContent = '⏳ Sending…'; btn.disabled = true;
  try {
    const res  = await apiPost('/api/admin/test-template', { template_name: name, to_email: toEmail });
    const data = await res.json();
    if (res.ok && data.ok) _showTplMsg('✅ ' + data.message, 'ok');
    else _showTplMsg('❌ ' + (data.error || 'Failed'), 'err');
  } catch(e) { _showTplMsg('❌ Network error', 'err'); }
  finally { btn.textContent = '📧 Send Test'; btn.disabled = false; }
}

function previewTemplate() {
  const html  = document.getElementById('tpl-body')?.value || '';
  const modal = document.getElementById('tpl-preview-modal');
  const cont  = document.getElementById('tpl-preview-content');
  if (!modal || !cont) return;
  cont.innerHTML = `<iframe srcdoc="${escHtml(html)}" style="width:100%;height:500px;border:none;border-radius:8px;background:#fff"></iframe>`;
  modal.style.display = '';
}

function closeTplPreview() {
  const modal = document.getElementById('tpl-preview-modal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTplPreview(); });
