'use strict';
// ═══════════════════════════════════════════════════════
//  CANDIDATE DETAILS — Save / Load / Modify
// ═══════════════════════════════════════════════════════
async function saveCandidateDetails() {
  const email = document.getElementById('s-email').value.trim();
  const pass  = document.getElementById('s-pass').value.trim();
  if (!email) { toast('Please enter your email before saving.', 'err'); return; }
  const payload = {
    dice_email:  email,
    searches:    selfTags,
    max_pages:   parseInt(document.getElementById('s-pages').value) || 5,
    max_jobs:    parseInt(document.getElementById('s-jobs').value)  || 100,
    date_filter: document.getElementById('s-date').value,
    employment:  document.getElementById('s-etype').value,
    easy_apply:  document.getElementById('s-easy').value === 'true',
  };
  if (pass) { payload.dice_password = pass; _selfDicePassword = pass; }
  try {
    const res = await apiPost('/api/candidate/details', payload);
    if (res.ok) {
      toast('✅ Details saved successfully.', 'ok');
      showSavedBar(true);
      toggleCandidateEditMode(false);
      _updateLockedEmailDisplay(email);
    } else {
      const d = await res.json();
      toast('❌ ' + (d.error || 'Save failed'), 'err');
    }
  } catch(e) { toast('Network error while saving.', 'err'); }
}

function showSavedBar(show) {
  const bar = document.getElementById('c-saved-bar');
  if (bar) bar.style.display = show ? 'flex' : 'none';
}

function toggleCandidateEditMode(editing) {
  _candidateEditMode = editing;
  const modBtn  = document.getElementById('c-btn-modify');
  const saveBtn = document.getElementById('c-btn-save');
  if (modBtn)  modBtn.style.display  = editing ? 'none' : '';
  if (saveBtn) saveBtn.style.display = editing ? ''    : 'none';
}

function _updateLockedEmailDisplay(lockedEmail) {
  const badge = document.getElementById('c-locked-email-info');
  const val   = document.getElementById('c-locked-email-value');
  if (lockedEmail) {
    badge.style.display = '';
    val.textContent = lockedEmail;
    const emailEl = document.getElementById('s-email');
    if (emailEl) { emailEl.style.color = 'var(--accent2)'; emailEl.title = 'Email locked to subscription — cannot change'; }
  } else {
    badge.style.display = 'none';
  }
}

async function loadCandidateDetailsFromDB(userId) {
  if (!userId) return;
  try {
    const res  = await fetch(`${API_BASE}/api/candidate/details`, { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (res.ok && data.found && data.details) {
      const d = data.details;
      if (d.dice_email) { document.getElementById('s-email').value = d.dice_email; _updateLockedEmailDisplay(d.dice_email); }
      if (d.dice_password) { _selfDicePassword = d.dice_password; const hint = document.getElementById('s-pass-hint'); if (hint) hint.style.display = ''; }
      else if (d.has_password) { const hint = document.getElementById('s-pass-hint'); if (hint) hint.style.display = ''; }
      if (d.searches && d.searches.length) { selfTags = d.searches; renderSelfTags(); }
      if (d.max_pages)   document.getElementById('s-pages').value = d.max_pages;
      if (d.max_jobs)    document.getElementById('s-jobs').value  = d.max_jobs;
      if (d.date_filter) document.getElementById('s-date').value  = d.date_filter;
      if (d.employment)  document.getElementById('s-etype').value = d.employment;
      if (d.easy_apply !== undefined) document.getElementById('s-easy').value = d.easy_apply ? 'true' : 'false';
      showSavedBar(true);
      toggleCandidateEditMode(false);
    }
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════
//  SELF TAGS
// ═══════════════════════════════════════════════════════
function addSelfTag() {
  const inp = document.getElementById('s-tag-inp');
  const v = inp.value.trim();
  if (!v || selfTags.includes(v)) { inp.value = ''; return; }
  selfTags.push(v);
  inp.value = '';
  closeAutocomplete('s-ac-list');
  renderSelfTags();
}
function removeSelfTag(i) { selfTags.splice(i, 1); renderSelfTags(); }
function renderSelfTags() {
  document.getElementById('s-tags').innerHTML = selfTags.map((t, i) =>
    `<span class="tag">${escHtml(t)}<button class="tag-x" onclick="removeSelfTag(${i})" aria-label="Remove ${escHtml(t)}">×</button></span>`
  ).join('');
}

// ═══════════════════════════════════════════════════════
//  SUBSCRIPTION / RAZORPAY
// ═══════════════════════════════════════════════════════
async function activatePlan(plan) {
  const user = authState.candidate.user;
  if (!user) return;
  const btnMap = { trial: 'c-trial-btn', self_monthly: 'c-monthly-btn', pro: 'c-monthly-btn' };
  const btnId  = btnMap[plan] || 'c-monthly-btn';
  const btn    = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div> Processing…'; }
  if (plan === 'trial') {
    try {
      const res  = await apiPost('/api/subscription/create-order', { plan:'trial' });
      const data = await res.json();
      if (!res.ok) { toast('❌ ' + (data.error || 'Could not activate trial'), 'err'); if (btn) { btn.disabled = false; btn.innerHTML = 'Start Free Trial'; } return; }
      _applyCandidateSubscription({ plan:'trial', days_left: data.days || 3, status:'active' });
      toast('✅ Free trial activated! 3 days of full access.', 'ok', 5000);
      showCandidateView('setup');
    } catch(e) {
      toast('Network error activating trial.', 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Start Free Trial'; }
    }
  } else {
    await openRazorpay('candidate', plan, user);
    if (btn) { btn.disabled = false; }
  }
}

async function openRazorpay(userType, planKey, user) {
  const loadingEl = document.getElementById('rzp-loading');
  if (loadingEl) loadingEl.style.display = '';
  try {
    const res  = await apiPost('/api/subscription/create-order', { plan:planKey });
    const data = await res.json();
    if (!res.ok) { if (loadingEl) loadingEl.style.display = 'none'; toast('❌ ' + (data.error || 'Could not create order'), 'err'); return; }
    const options = {
      key:         data.key_id,
      amount:      data.amount,
      currency:    data.currency,
      order_id:    data.order_id,
      name:        'HireFlow Automation',
      description: data.plan_label || planKey,
      handler: async function(response) {
        if (loadingEl) loadingEl.style.display = '';
        const vRes  = await apiPost('/api/subscription/verify', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          plan: planKey,
        });
        const vData = await vRes.json();
        if (loadingEl) loadingEl.style.display = 'none';
        if (!vRes.ok) { toast('❌ Payment verification failed: ' + (vData.error||''), 'err'); return; }
        toast('✅ ' + (vData.message || 'Subscription activated!'), 'ok', 5000);
        if (userType === 'candidate') { _applyCandidateSubscription({ plan:planKey, days_left:vData.days, status:'active', expires_at: vData.expires_at }); showCandidateView('setup'); }
        else { _applyRecruiterSubscription({ plan:planKey, days_left:vData.days, status:'active', expires_at: vData.expires_at }); showRecruiterView('setup'); }
      },
      modal: { ondismiss: function() { if (loadingEl) loadingEl.style.display = 'none'; toast('Payment cancelled.', 'info'); } },
      prefill: { email: user.email },
      theme:   { color: '#25d366' },
    };
    if (typeof Razorpay === 'undefined') { if (loadingEl) loadingEl.style.display = 'none'; toast('❌ Payment gateway not loaded. Please refresh and try again.', 'err'); return; }
    if (loadingEl) loadingEl.style.display = 'none';
    const rzp = new Razorpay(options);
    rzp.open();
  } catch(e) {
    if (loadingEl) loadingEl.style.display = 'none';
    toast('Network error: ' + e, 'err');
  }
}
