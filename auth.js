'use strict';
// ═══════════════════════════════════════════════════════
//  CANDIDATE AUTH
// ═══════════════════════════════════════════════════════
function showCandidateView(view) {
  ['c-auth-login','c-auth-signup','c-auth-forgot','c-subscription','c-dashboard-setup','c-live-dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = {
    login: 'c-auth-login', signup: 'c-auth-signup', forgot: 'c-auth-forgot',
    subscription: 'c-subscription', setup: 'c-dashboard-setup', dashboard: 'c-live-dashboard'
  }[view];
  if (target) {
    const el = document.getElementById(target);
    if (el) el.style.display = '';
  }
  if (view === 'setup') {
    loadCandidateDetailsFromDB(authState.candidate.user?.id);
  }
}

async function candidateLogin() {
  const email = document.getElementById('c-login-email').value.trim();
  const pass  = document.getElementById('c-login-pass').value.trim();
  const msg   = document.getElementById('c-login-msg');
  if (!email || !pass) { showMsg(msg, 'Please enter email and password.', 'err'); return; }
  setBtnLoading('c-login-btn', true, 'Signing in…');
  showMsg(msg, 'Signing in…', 'info');
  try {
    const res  = await apiPost('/api/auth/candidate/login', { email, password: pass });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, '❌ ' + (data.error || 'Login failed'), 'err'); return; }
    await _initCsrfToken();
    authState.candidate.loggedIn = true;
    authState.candidate.user     = data.user;
    _applyCandidateDashboard(data.user);
    renderSidebar('candidate');
    sidebarUpdateProfile(data.user.name || data.user.email);
    lockToRole('candidate');
    const sd = data.user?.saved_details;
    if (sd) {
      if (sd.dice_email) { document.getElementById('s-email').value = sd.dice_email; _updateLockedEmailDisplay(sd.dice_email); }
      if (sd.dice_password) { _selfDicePassword = sd.dice_password; const hint = document.getElementById('s-pass-hint'); if (hint) hint.style.display = ''; }
      if (sd.searches && sd.searches.length)  { selfTags = sd.searches; renderSelfTags(); }
      if (sd.max_pages)   document.getElementById('s-pages').value = sd.max_pages;
      if (sd.max_jobs)    document.getElementById('s-jobs').value  = sd.max_jobs;
      if (sd.date_filter) document.getElementById('s-date').value  = sd.date_filter;
      if (sd.employment)  document.getElementById('s-etype').value = sd.employment;
      if (sd.easy_apply !== undefined) document.getElementById('s-easy').value = sd.easy_apply ? 'true' : 'false';
    }
    if (data.user.subscription && data.user.subscription.days_left > 0) {
      _applyCandidateSubscription(data.user.subscription);
      showCandidateView('setup');
      sidebarSetActive('dashboard', false);
    } else if (data.user.subscription && data.user.subscription.days_left <= 0) {
      _applyCandidateSubscription({ plan: data.user.subscription.plan, days_left: 0, status: 'expired' });
      showCandidateView('setup');
    } else {
      showCandidateView('subscription');
    }
  } catch(e) {
    showMsg(msg, '❌ Network error. Please try again.', 'err');
  } finally {
    setBtnLoading('c-login-btn', false, 'Sign In');
  }
}

function _applyCandidateDashboard(user) {
  const name = user.name || user.email || 'User';
  document.getElementById('c-dash-name').textContent   = name;
  document.getElementById('c-dash-avatar').textContent = name[0].toUpperCase();
  document.getElementById('c-live-name').textContent   = name;
  document.getElementById('c-live-avatar').textContent = name[0].toUpperCase();
}

async function candidateSignup() {
  const fname = document.getElementById('c-su-fname').value.trim();
  const lname = document.getElementById('c-su-lname').value.trim();
  const email = document.getElementById('c-su-email').value.trim();
  const phone = document.getElementById('c-su-phone').value.trim();
  const pass  = document.getElementById('c-su-pass').value.trim();
  const msg   = document.getElementById('c-signup-msg');
  if (!fname||!lname||!email||!phone||!pass) { showMsg(msg, 'Please fill all fields.', 'err'); return; }
  if (pass.length < 6) { showMsg(msg, 'Password must be at least 6 characters.', 'err'); return; }
  setBtnLoading('c-signup-btn', true, 'Creating account…');
  showMsg(msg, 'Creating account…', 'info');
  try {
    const res  = await apiPost('/api/auth/candidate/signup', { first_name:fname, last_name:lname, email, phone, password:pass });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, '❌ ' + (data.error || 'Signup failed'), 'err'); return; }
    authState.candidate.loggedIn = true;
    authState.candidate.user     = data.user;
    _applyCandidateDashboard(data.user);
    renderSidebar('candidate');
    sidebarUpdateProfile(data.user.name || data.user.email);
    lockToRole('candidate');
    showCandidateView('subscription');
  } catch(e) {
    showMsg(msg, '❌ Network error. Please try again.', 'err');
  } finally {
    setBtnLoading('c-signup-btn', false, 'Create Account');
  }
}

async function candidateForgot() {
  const email = document.getElementById('c-fp-email').value.trim();
  const msg   = document.getElementById('c-forgot-msg');
  if (!email) { showMsg(msg, 'Please enter your email.', 'err'); return; }
  showMsg(msg, 'Sending…', 'info');
  try { await apiPost('/api/auth/candidate/forgot', { email }); } catch(e) {}
  showMsg(msg, '✅ Reset link sent! Check your email.', 'ok');
}

function _applyCandidateSubscription(sub) {
  authState.candidate.plan = sub.plan;
  const days    = sub.days_left ?? (sub.plan === 'trial' ? 3 : 30);
  const expired = days <= 0;
  const isTrial = sub.plan === 'trial';
  const planLabels = { trial: 'Free Trial', self_monthly: 'Self-Candidate Monthly', pro: 'Pro Plan' };
  const label = planLabels[sub.plan] || 'Pro Plan';
  const subCard    = document.getElementById('c-active-sub-card');
  const expiredBan = document.getElementById('c-expired-banner');
  const trialNudge = document.getElementById('c-trial-nudge');
  const ascIcon    = document.getElementById('c-asc-icon');
  const ascName    = document.getElementById('c-asc-plan-name');
  const ascExpiry  = document.getElementById('c-asc-expiry');
  const ascType    = document.getElementById('c-asc-plan-type');
  const daysEl     = document.getElementById('c-days-left');
  const badgeEl    = document.getElementById('c-plan-badge');
  if (expired) {
    if (expiredBan) expiredBan.style.display = '';
    if (subCard)    subCard.style.display    = 'none';
    if (trialNudge) trialNudge.style.display = 'none';
    const runBtn = document.getElementById('btn-run-c');
    if (runBtn) { runBtn.disabled = true; runBtn.title = 'Subscription expired — renew to continue'; }
  } else {
    if (expiredBan) expiredBan.style.display = 'none';
    if (subCard) { subCard.style.display = ''; subCard.className = 'active-sub-card' + (isTrial ? ' sub-trial' : ''); }
    if (ascIcon)   ascIcon.textContent   = isTrial ? '⏰' : '⚡';
    if (ascName)   ascName.textContent   = label;
    if (daysEl)    daysEl.textContent    = days;
    if (ascType)   ascType.textContent   = label;
    if (badgeEl) { badgeEl.textContent = isTrial ? 'Trial' : 'Active'; badgeEl.className = 'sub-badge ' + (isTrial ? 'trial' : 'active'); }
    if (ascExpiry) {
      if (sub.expires_at) {
        const d = new Date(sub.expires_at);
        ascExpiry.textContent = 'Expires ' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      } else {
        ascExpiry.textContent = `${days} day${days !== 1 ? 's' : ''} remaining`;
      }
    }
    if (trialNudge) trialNudge.style.display = isTrial ? '' : 'none';
    const runBtn = document.getElementById('btn-run-c');
    if (runBtn) { runBtn.disabled = false; runBtn.title = ''; }
  }
}

function candidateLogout() {
  authState.candidate = { loggedIn: false, user: null, plan: null };
  selfTags = [];
  _selfDicePassword = '';
  currentJobId = null;
  if (evtSource) { evtSource.close(); evtSource = null; }
  stopRecruiterPolling();
  hideSidebar();
  unlockRole();
  showCandidateView('login');
  setStatus('', 'Idle');
}

function backToDashboardSetup() { showCandidateView('setup'); }

// ═══════════════════════════════════════════════════════
//  RECRUITER AUTH
// ═══════════════════════════════════════════════════════
function showRecruiterView(view) {
  ['r-auth-login','r-auth-signup','r-auth-forgot','r-subscription','r-dashboard-setup','r-live-dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = {
    login: 'r-auth-login', signup: 'r-auth-signup', forgot: 'r-auth-forgot',
    subscription: 'r-subscription', setup: 'r-dashboard-setup', dashboard: 'r-live-dashboard'
  }[view];
  if (target) { const el = document.getElementById(target); if (el) el.style.display = ''; }
  if (view === 'setup') { loadRecruiterCandidates(); setTimeout(() => loadRecruiterReport(), 500); }
}

async function recruiterLogin() {
  const email = document.getElementById('r-login-email').value.trim();
  const pass  = document.getElementById('r-login-pass').value.trim();
  const msg   = document.getElementById('r-login-msg');
  if (!email || !pass) { showMsg(msg, 'Please enter email and password.', 'err'); return; }
  setBtnLoading('r-login-btn', true, 'Signing in…');
  showMsg(msg, 'Signing in…', 'info');
  try {
    const res  = await apiPost('/api/auth/recruiter/login', { email, password: pass });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, '❌ ' + (data.error || 'Login failed'), 'err'); return; }
    await _initCsrfToken();
    authState.recruiter.loggedIn = true;
    authState.recruiter.user     = data.user;
    document.getElementById('r-dash-name').textContent   = data.user.name;
    document.getElementById('r-dash-avatar').textContent = data.user.name[0].toUpperCase();
    renderSidebar('recruiter');
    sidebarUpdateProfile(data.user.name || data.user.email);
    lockToRole('recruiter');
    if (data.user.subscription && data.user.subscription.days_left > 0) {
      _applyRecruiterSubscription(data.user.subscription);
      showRecruiterView('setup');
      sidebarSetActive('candidates', false);
    } else if (data.user.subscription && data.user.subscription.days_left <= 0) {
      _applyRecruiterSubscription({ plan: data.user.subscription.plan, days_left: 0, status: 'expired' });
      showRecruiterView('setup');
    } else {
      showRecruiterView('subscription');
    }
  } catch(e) {
    showMsg(msg, '❌ Network error. Please try again.', 'err');
  } finally {
    setBtnLoading('r-login-btn', false, 'Sign In');
  }
}

async function recruiterSignup() {
  const fname = document.getElementById('r-su-fname').value.trim();
  const lname = document.getElementById('r-su-lname').value.trim();
  const email = document.getElementById('r-su-email').value.trim();
  const phone = document.getElementById('r-su-phone').value.trim();
  const pass  = document.getElementById('r-su-pass').value.trim();
  const msg   = document.getElementById('r-signup-msg');
  if (!fname||!lname||!email||!phone||!pass) { showMsg(msg, 'Please fill all fields.', 'err'); return; }
  if (pass.length < 6) { showMsg(msg, 'Password must be at least 6 characters.', 'err'); return; }
  setBtnLoading('r-signup-btn', true, 'Creating account…');
  showMsg(msg, 'Creating account…', 'info');
  try {
    const res  = await apiPost('/api/auth/recruiter/signup', { first_name:fname, last_name:lname, email, phone, password:pass });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, '❌ ' + (data.error || 'Signup failed'), 'err'); return; }
    authState.recruiter.loggedIn = true;
    authState.recruiter.user     = data.user;
    document.getElementById('r-dash-name').textContent   = data.user.name;
    document.getElementById('r-dash-avatar').textContent = data.user.name[0].toUpperCase();
    renderSidebar('recruiter');
    sidebarUpdateProfile(data.user.name || data.user.email);
    lockToRole('recruiter');
    showRecruiterView('subscription');
  } catch(e) {
    showMsg(msg, '❌ Network error. Please try again.', 'err');
  } finally {
    setBtnLoading('r-signup-btn', false, 'Create Account');
  }
}

async function recruiterForgot() {
  const email = document.getElementById('r-fp-email').value.trim();
  const msg   = document.getElementById('r-forgot-msg');
  if (!email) { showMsg(msg, 'Please enter your email.', 'err'); return; }
  showMsg(msg, 'Sending…', 'info');
  try { await apiPost('/api/auth/recruiter/forgot', { email }); } catch(e) {}
  showMsg(msg, '✅ Reset link sent! Check your email.', 'ok');
}

function _applyRecruiterSubscription(sub) {
  const days    = sub.days_left ?? 30;
  const expired = days <= 0;
  const planLabels = { recruiter_monthly:'Recruiter Monthly', recruiter_yearly:'Recruiter Yearly', recruiter_trial:'Recruiter Free Trial', trial:'Free Trial', pro:'Recruiter Pro' };
  const label = planLabels[sub.plan] || 'Recruiter Plan';
  const subCard    = document.getElementById('r-active-sub-card');
  const expiredBan = document.getElementById('r-expired-banner');
  const daysEl     = document.getElementById('r-days-left');
  const nameEl     = document.getElementById('r-asc-plan-name');
  const badgeEl    = document.getElementById('r-plan-badge');
  const expiryEl   = document.getElementById('r-asc-expiry');
  if (expired) {
    if (expiredBan) expiredBan.style.display = '';
    if (subCard)    subCard.style.display    = 'none';
    const runBtn = document.getElementById('btn-run-r');
    if (runBtn) { runBtn.disabled = true; runBtn.title = 'Subscription expired — renew to continue'; }
  } else {
    if (expiredBan) expiredBan.style.display = 'none';
    if (subCard)    subCard.style.display    = '';
    if (nameEl)  nameEl.textContent  = label;
    if (daysEl)  daysEl.textContent  = days;
    const isTrial = sub.plan === 'recruiter_trial' || sub.plan === 'trial';
    if (badgeEl) { badgeEl.textContent = isTrial ? 'Trial' : 'Active'; badgeEl.className = isTrial ? 'sub-badge trial' : 'sub-badge active'; }
    const trialCard = document.getElementById('r-trial-card');
    if (trialCard) trialCard.style.display = 'none';
    if (expiryEl) {
      if (sub.expires_at) {
        const d = new Date(sub.expires_at);
        expiryEl.textContent = 'Expires ' + d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      } else {
        expiryEl.textContent = `${days} day${days !== 1 ? 's' : ''} remaining`;
      }
    }
    const runBtn = document.getElementById('btn-run-r');
    if (runBtn) { runBtn.disabled = false; runBtn.title = ''; }
  }
}

async function activateRecruiterPlan(plan) {
  const user = authState.recruiter.user;
  if (!user) return;
  const btnMap = { recruiter_monthly: 'r-monthly-btn', recruiter_yearly: 'r-yearly-btn', recruiter_trial: 'r-trial-btn' };
  const btnId  = btnMap[plan];
  const btn    = btnId ? document.getElementById(btnId) : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div> Processing…'; }
  if (plan === 'trial' || plan === 'recruiter_trial') {
    try {
      const res  = await apiPost('/api/subscription/create-order', { plan });
      const data = await res.json();
      if (!res.ok) { toast('❌ ' + (data.error || 'Could not activate trial'), 'err'); return; }
      toast('✅ Free trial activated!', 'ok');
      showRecruiterView('setup');
    } catch(e) { toast('Network error', 'err'); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 2l7 4.5-7 4.5V2z" fill="currentColor"/></svg> Start Free Trial'; }
  } else {
    await openRazorpay('recruiter', plan, user);
    if (btn) { btn.disabled = false; }
  }
}

function recruiterLogout() {
  authState.recruiter = { loggedIn: false, user: null };
  rcCandidates = [];
  candidates   = [];
  currentJobId = null;
  if (evtSource) { evtSource.close(); evtSource = null; }
  stopRecruiterPolling();
  _rcClearSessionPasses();
  hideSidebar();
  unlockRole();
  showRecruiterView('login');
  setStatus('', 'Idle');
}

function backToRecruiterSetup() { showRecruiterView('setup'); }

// ═══════════════════════════════════════════════════════
//  ADMIN AUTH
// ═══════════════════════════════════════════════════════
async function adminLogin() {
  const email = document.getElementById('a-login-email').value.trim();
  const pass  = document.getElementById('a-login-pass').value.trim();
  const msg   = document.getElementById('a-login-msg');
  if (!email || !pass) { showMsg(msg, 'Please enter credentials.', 'err'); return; }
  setBtnLoading('a-login-btn', true, 'Verifying…');
  showMsg(msg, 'Verifying…', 'info');
  try {
    const res  = await apiPost('/api/auth/admin/login', { email, password: pass });
    const data = await res.json();
    if (!res.ok) { showMsg(msg, '❌ ' + (data.error || 'Invalid credentials'), 'err'); return; }
    await _initCsrfToken();
    authState.admin.loggedIn = true;
    document.getElementById('a-auth-login').style.display = 'none';
    document.getElementById('a-dashboard').style.display  = '';
    document.getElementById('panel-right-logs').style.display = '';
    document.getElementById('app-root').classList.remove('no-sidebar');
    renderSidebar('admin');
    sidebarSetActive('overview', false);
    lockToRole('admin');
    loadAdminSettings();
    loadRazorpaySettings();
    checkSupabaseStatus().then(() => { loadAdminDashboard(); startAdminDashboardPolling(); });
    startLiveDashboardPolling();
    const liveSection = document.getElementById('tab-content-live');
    if (liveSection) liveSection.style.display = '';
    setTimeout(async () => {
      const sbRes = await fetch(API_BASE + '/api/supabase/status', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
      const sbData = sbRes.ok ? await sbRes.json() : {};
      const resEl = document.getElementById('a-search-results');
      if (!sbData.configured) {
        if (resEl) resEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 0"><div style="font-size:28px">🔌</div><div style="color:var(--text3);font-size:13px;font-weight:600">Supabase Not Connected</div></div>`;
      } else { runAdminSearch(); }
    }, 800);
    checkSupabaseStatus();
  } catch(e) {
    showMsg(msg, '❌ Network error. Please try again.', 'err');
  } finally {
    setBtnLoading('a-login-btn', false, 'Access Admin Panel');
  }
}

function adminLogout() {
  authState.admin.loggedIn = false;
  document.getElementById('a-auth-login').style.display = '';
  document.getElementById('a-dashboard').style.display  = 'none';
  const liveSection = document.getElementById('tab-content-live');
  if (liveSection) liveSection.style.display = 'none';
  document.getElementById('panel-right-logs').style.display = 'none';
  document.getElementById('app-root').classList.add('no-sidebar');
  hideSidebar();
  unlockRole();
  stopLiveDashboardPolling();
  if (_adminDashPollTimer) { clearInterval(_adminDashPollTimer); _adminDashPollTimer = null; }
}
