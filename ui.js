'use strict';
// ═══════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════

function escHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  } catch(e) { return iso; }
}

function initials(name, email) {
  if (name && name.trim()) {
    const p = name.trim().split(' ');
    return p.length > 1 ? (p[0][0]+p[1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
}

// ── Toast Notifications ──
function toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons = { ok: '✅', err: '❌', info: '💬' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || '💬'}</span><span class="toast-msg">${escHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── Auth message helper ──
function showMsg(el, text, type) {
  if (!el) return;
  el.style.display = 'block';
  el.className = 'auth-msg ' + type;
  el.textContent = text;
}

// ── Password show/hide toggle ──
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const eyeOpen = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 4.5C5.5 4.5 2 10 2 10s3.5 5.5 8 5.5 8-5.5 8-5.5-3.5-5.5-8-5.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const eyeOff = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l14 14M10 4.5C5.5 4.5 2 10 2 10s1.4 2.2 3.7 3.8M16.3 6.2C18.6 7.8 18 10 18 10s-3.5 5.5-8 5.5c-1.4 0-2.7-.3-3.8-.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;
  if (inp.type === 'password') {
    inp.type = 'text'; btn.innerHTML = eyeOff; btn.title = 'Hide password';
  } else {
    inp.type = 'password'; btn.innerHTML = eyeOpen; btn.title = 'Show password';
  }
}

// ── Animate stat number ──
function setStatNum(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.remove('stat-pop');
    void el.offsetWidth;
    el.classList.add('stat-pop');
  }
}

// ── Button loading state ──
function setBtnLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.innerHTML = `<div class="spin"></div> ${originalText || 'Loading…'}`;
  } else {
    btn.textContent = btn.dataset.origText || originalText || 'Submit';
  }
}

// ── Status indicator ──
function setStatus(s, label) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  dot.className = 'status-dot ' + (s || '');
  txt.textContent = label;
}

// ── Theme ──
function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  if (current === 'light') {
    root.removeAttribute('data-theme');
    localStorage.setItem('dice-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('dice-theme', 'light');
  }
}
function initTheme() {
  const saved = localStorage.getItem('dice-theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
}

// ── Tab switching ──
function switchTab(tab) {
  if (document.getElementById('app-root').classList.contains('role-locked')) return;
  currentTab = tab;
  ['candidate','recruiter','admin'].forEach(t => {
    const c = document.getElementById(`tab-content-${t}`);
    const b = document.getElementById(`tab-${t}`);
    if (c) c.style.display = t === tab ? '' : 'none';
    if (b) b.classList.toggle('active', t === tab);
  });
  const logPanel = document.getElementById('panel-right-logs');
  if (tab === 'admin' && authState.admin.loggedIn) {
    logPanel.style.display = '';
    const liveSection = document.getElementById('tab-content-live');
    if (liveSection) liveSection.style.display = '';
    startLiveDashboardPolling();
  } else {
    logPanel.style.display = 'none';
  }
  if (tab === 'candidate' && authState.candidate.loggedIn) {
    renderSidebar('candidate');
  } else if (tab === 'recruiter' && authState.recruiter.loggedIn) {
    renderSidebar('recruiter');
  } else if (tab === 'admin' && authState.admin.loggedIn) {
    renderSidebar('admin');
  } else {
    hideSidebar();
  }
}

// ── Role lock ──
function lockToRole(role) {
  const appEl = document.getElementById('app-root');
  appEl.classList.add('role-locked');
  ['candidate', 'recruiter', 'admin'].forEach(r => {
    const panel = document.getElementById(`tab-content-${r}`);
    if (panel) panel.style.display = r === role ? 'block' : 'none';
  });
}
function unlockRole() {
  const appEl = document.getElementById('app-root');
  appEl.classList.remove('role-locked');
  ['candidate', 'recruiter', 'admin'].forEach((r, i) => {
    const panel = document.getElementById(`tab-content-${r}`);
    if (panel) panel.style.display = i === 0 ? '' : 'none';
  });
  const tabNav = document.getElementById('main-tabs');
  if (tabNav) tabNav.style.display = '';
  ['candidate','recruiter','admin'].forEach((r,i) => {
    const btn = document.getElementById(`tab-${r}`);
    if (btn) btn.classList.toggle('active', i === 0);
  });
  currentTab = 'candidate';
}

// ── Scroll to section ──
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── FAQ toggle ──
function toggleFaq(item) {
  item.classList.toggle('open');
}

// ── Logs ──
function getLogClass(text) {
  if (text.includes('✅') || text.includes('Applied!') || text.includes('Done')) return 'ok';
  if (text.includes('⚠️') || text.includes('Skipped') || text.includes('WARNING')) return 'warn';
  if (text.includes('❌') || text.includes('ERROR') || text.includes('error')) return 'err';
  if (text.includes('🔍') || text.includes('📄') || text.includes('🎯') || text.includes('Page') || text.includes('Keyword')) return 'info';
  return '';
}
function appendLog(text, type) {
  const body = document.getElementById('log-body');
  const empty = document.getElementById('log-empty');
  if (empty) empty.remove();
  const now  = new Date();
  const time = now.toTimeString().slice(0,8);
  const cls  = type === 'error' ? 'err' : type === 'done' ? 'ok' : getLogClass(text);
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="log-time">${time}</span><span class="log-text ${cls}">${escHtml(text)}</span>`;
  body.appendChild(line);
  const lines = body.querySelectorAll('.log-line');
  if (lines.length > 600) lines[0].remove();
  logCount++;
  if (text.includes('✅ Applied')) {
    stats.applied++;
    setStatNum('stat-applied', stats.applied);
    setStatNum('cd-applied',   stats.applied);
  }
  if (text.includes('Already applied') || text.includes('Skipped')) {
    stats.skipped++;
    setStatNum('stat-skipped', stats.skipped);
    setStatNum('cd-skipped',   stats.skipped);
  }
  if (text.includes('❌')) {
    stats.errors++;
    setStatNum('stat-errors', stats.errors);
    setStatNum('cd-failed',   stats.errors);
    addRemark(text);
  }
  body.scrollTop = body.scrollHeight;
}
function addRemark(text) {
  const wrap = document.getElementById('cd-remarks-wrap');
  if (!wrap) return;
  const noErr = wrap.querySelector('div');
  if (noErr && noErr.textContent.includes('No errors')) wrap.innerHTML = '';
  const el = document.createElement('div');
  el.style.cssText = 'color:var(--red);font-size:11px;font-family:"DM Mono",monospace;padding:4px 0;border-bottom:1px solid rgba(255,118,117,0.1)';
  el.textContent = new Date().toLocaleTimeString() + ' — ' + text;
  wrap.appendChild(el);
}
function clearLogs() {
  const body = document.getElementById('log-body');
  body.innerHTML = '<div class="log-empty" id="log-empty"><div class="log-empty-icon">⚡</div><div>Waiting to start</div></div>';
  logCount = 0;
}
function scrollLogsBottom() {
  document.getElementById('log-body').scrollTop = 99999;
}

// ── Autocomplete ──
const JOB_SUGGESTIONS = [
  'Python Developer','Java Developer','Informatica Developer','Snowflake Developer',
  'Data Analyst','DevOps Engineer','React Developer','Node.js Developer',
  'Full Stack Developer','Data Engineer','ML Engineer','Cloud Engineer',
  'AWS Engineer','Azure DevOps Engineer','Salesforce Developer','Angular Developer',
  'iOS Developer','Android Developer','QA Engineer','Business Analyst',
  'ETL Developer','Spark Developer','Hadoop Developer','SQL Developer',
  '.NET Developer','C++ Developer','Go Developer','Kotlin Developer',
  'Flutter Developer','Vue.js Developer','TypeScript Developer','Ruby Developer',
  'PHP Developer','Cybersecurity Engineer','Site Reliability Engineer',
  'Machine Learning Engineer','NLP Engineer','Computer Vision Engineer',
  'Blockchain Developer','Smart Contract Developer','Terraform Engineer',
  'GCP Engineer','Kubernetes Engineer','Microservices Developer',
  'Data Scientist','BI Developer','Tableau Developer','Power BI Developer',
];
let acActiveIndex = -1;

function showAutocomplete(inputId, listId, existingTags) {
  const inp = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!inp || !list) return;
  const val = inp.value.trim().toLowerCase();
  if (!val || val.length < 2) { list.style.display = 'none'; return; }
  const matches = JOB_SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(val) && !existingTags.includes(s)
  ).slice(0, 7);
  if (matches.length === 0) { list.style.display = 'none'; return; }
  acActiveIndex = -1;
  const escaped = inp.value.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  list.innerHTML = matches.map(m =>
    `<div class="autocomplete-item" role="option" data-val="${escHtml(m)}" onmousedown="selectAutocomplete('${inputId}','${listId}','${m.replace(/'/g,"\\'")}')">
      ${m.replace(new RegExp(escaped, 'gi'), match => `<strong>${match}</strong>`)}
    </div>`
  ).join('');
  list.style.display = '';
}
function selectAutocomplete(inputId, listId, val, addFn) {
  const inp = document.getElementById(inputId);
  if (inp) inp.value = val;
  closeAutocomplete(listId);
  if (addFn) addFn();
}
function closeAutocomplete(listId) {
  const el = document.getElementById(listId);
  if (el) el.style.display = 'none';
  acActiveIndex = -1;
}

document.addEventListener('click', () => {
  document.querySelectorAll('.autocomplete-list').forEach(el => el.style.display = 'none');
});
document.addEventListener('DOMContentLoaded', () => {
  const sTagInp = document.getElementById('s-tag-inp');
  if (sTagInp) {
    sTagInp.addEventListener('keydown', e => {
      const list = document.getElementById('s-ac-list');
      const items = list?.querySelectorAll('.autocomplete-item') || [];
      if (e.key === 'Enter') { closeAutocomplete('s-ac-list'); addSelfTag(); }
      else if (e.key === 'Escape') closeAutocomplete('s-ac-list');
      else if (e.key === 'ArrowDown') { acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1); items.forEach((item, i) => item.classList.toggle('active', i === acActiveIndex)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { acActiveIndex = Math.max(acActiveIndex - 1, -1); items.forEach((item, i) => item.classList.toggle('active', i === acActiveIndex)); e.preventDefault(); }
    });
    sTagInp.addEventListener('input', () => { showAutocomplete('s-tag-inp', 's-ac-list', selfTags); });
  }
  const rcInp = document.getElementById('rc-modal-tag-inp');
  if (rcInp) {
    rcInp.addEventListener('input', () => { showAutocomplete('rc-modal-tag-inp', 'rc-modal-ac-list', _rcModalTags); });
    rcInp.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault(); });
  }
});
