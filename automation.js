'use strict';
// ═══════════════════════════════════════════════════════
//  START / STOP JOB
// ═══════════════════════════════════════════════════════
async function startJob(jobMode) {
  let cfg = {};
  if (jobMode === 'self') {
    const email = document.getElementById('s-email').value.trim();
    const pass  = document.getElementById('s-pass').value.trim() || _selfDicePassword;
    if (!email || !pass) { toast('Enter your email and password to start.', 'err'); return; }
    if (selfTags.length === 0) { toast('Add at least one job title before starting.', 'err'); return; }
    cfg = {
      mode: 'self', email, password: pass, searches: selfTags,
      max_pages:   parseInt(document.getElementById('s-pages').value),
      max_jobs:    parseInt(document.getElementById('s-jobs').value),
      date_filter: document.getElementById('s-date').value,
      easy_apply:  document.getElementById('s-easy').value === 'true',
      employment:  document.getElementById('s-etype').value,
    };
    setStatNum('cd-applied', 0); setStatNum('cd-skipped', 0); setStatNum('cd-failed', 0);
    const cdRun = document.getElementById('cd-running');
    if (cdRun) { cdRun.textContent = 'Running'; cdRun.style.color = 'var(--green)'; }
    document.getElementById('cd-remarks-wrap').innerHTML = '<div style="color:var(--text3);font-size:12px;font-family:\'DM Mono\',monospace;">No errors yet. Running smoothly ✅</div>';
    showCandidateView('dashboard');
  } else {
    if (candidates.length === 0) { toast('Add at least one candidate before starting.', 'err'); return; }
    if (rcSelectedIds.size === 0) {
      const warn = document.getElementById('rc-no-selection-warn');
      if (warn) warn.style.display = '';
      toast('Please select at least one candidate to run automation.', 'err');
      return;
    }
    const warn = document.getElementById('rc-no-selection-warn');
    if (warn) warn.style.display = 'none';
    const selectedCandidates = candidates.filter(c => rcSelectedIds.has(c.id));
    for (const c of selectedCandidates) {
      if (!c.email) { toast(`Fill email for: ${c.name || 'a candidate'}`, 'err'); return; }
      const hasPassword = c.password_set || c._sessionPassword || !!c.password;
      if (!hasPassword) { toast(`No password saved for: ${c.name || c.email}. Click ✏️ Edit and enter their password.`, 'err'); return; }
      if (c.searches.length === 0) { toast(`Add job titles for: ${c.name || 'a candidate'}`, 'err'); return; }
    }
    cfg = {
      mode: 'recruiter',
      selected_candidate_ids: [...rcSelectedIds],
      accounts: selectedCandidates.map(c => {
        const acc = { name: c.name, email: c.email, searches: c.searches, max_pages: parseInt(document.getElementById('r-pages').value), max_jobs: parseInt(document.getElementById('r-jobs').value) };
        const sp = c._sessionPassword || _rcGetSessionPass(c.id);
        if (sp) acc.password = sp;
        return acc;
      }),
      date_filter: document.getElementById('r-date').value,
      easy_apply:  document.getElementById('r-easy').value === 'true',
      employment:  document.getElementById('r-etype').value,
    };
    setStatNum('rd-total-candidates', selectedCandidates.length);
    setStatNum('rd-total-applied', 0); setStatNum('rd-total-skipped', 0); setStatNum('rd-total-failed', 0);
    const rdStatus = document.getElementById('rd-running-status');
    const rdDot    = document.getElementById('rd-status-dot');
    if (rdStatus) { rdStatus.textContent = 'Running'; rdStatus.style.color = 'var(--green)'; }
    if (rdDot)    rdDot.style.display = '';
    renderRecruiterReport();
    showRecruiterView('dashboard');
  }

  stats = { applied: 0, skipped: 0, errors: 0 };
  setStatNum('stat-applied', 0); setStatNum('stat-skipped', 0); setStatNum('stat-errors', 0);
  clearLogs();
  setStatus('running', 'Running');

  const runBtn  = document.getElementById(jobMode === 'self' ? 'btn-run-c' : 'btn-run-r');
  const stopBtn = document.getElementById(jobMode === 'self' ? 'btn-stop-c' : 'btn-stop-r');
  if (runBtn)  runBtn.disabled = true;
  if (stopBtn) stopBtn.classList.add('visible');

  let res;
  try {
    res = await apiPost('/api/start', cfg);
  } catch(e) {
    appendLog('Failed to connect to server: ' + e, 'error');
    setStatus('error', 'Error');
    if (runBtn)  runBtn.disabled = false;
    if (stopBtn) stopBtn.classList.remove('visible');
    return;
  }

  const data = await res.json();
  if (!res.ok || data.error) {
    setStatus('error', 'Error');
    if (runBtn)  runBtn.disabled = false;
    if (stopBtn) stopBtn.classList.remove('visible');
    if (res.status === 403) {
      toast('⛔ ' + data.error, 'err', 6000);
      if (jobMode === 'self') showCandidateView('subscription');
      return;
    }
    toast('❌ ' + (data.error || 'Start failed'), 'err');
    return;
  }

  if (jobMode === 'self' && authState.candidate.user?.id) {
    apiPost('/api/candidate/details', { dice_email: cfg.email, searches: selfTags, max_pages: cfg.max_pages, max_jobs: cfg.max_jobs, date_filter: cfg.date_filter, employment: cfg.employment, easy_apply: cfg.easy_apply }).catch(() => {});
  }

  currentJobId = data.job_id;
  appendLog(`Job started — ID: ${currentJobId}`, 'info');
  if (jobMode === 'recruiter') startRecruiterPolling(currentJobId);

  if (evtSource) evtSource.close();
  let sseToken = '';
  try {
    const tokenRes  = await apiFetch('/api/auth/token');
    const tokenData = await tokenRes.json();
    if (tokenData.ok) sseToken = tokenData.token;
  } catch(e) {}
  evtSource = new EventSource(`${API_BASE}/api/logs/${currentJobId}${sseToken ? '?token=' + encodeURIComponent(sseToken) : ''}`);
  evtSource.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch(_) { return; }
    if (msg.type === 'end')  { evtSource.close(); evtSource = null; return; }
    if (msg.type === 'done') {
      appendLog(msg.text, 'done');
      setStatus('done', 'Done');
      _setRunStatus(jobMode, 'Done', 'var(--accent2)');
      stopRecruiterPolling();
      _setRunButtonState(jobMode, false);
    } else if (msg.type === 'error') {
      appendLog(msg.text, 'error');
      setStatus('error', 'Error');
    } else {
      appendLog(msg.text, 'log');
      if (jobMode === 'recruiter') updateRecruiterReport(msg.text);
    }
  };
  evtSource.onerror = () => {
    appendLog('Connection to log stream lost.', 'error');
    if (evtSource) { evtSource.close(); evtSource = null; }
    setStatus('error', 'Disconnected');
  };
}

function _setRunStatus(jobMode, label, color) {
  if (jobMode === 'self') {
    const cdRun = document.getElementById('cd-running');
    if (cdRun) { cdRun.textContent = label; cdRun.style.color = color; }
  } else {
    const rdStatus = document.getElementById('rd-running-status');
    const rdDot    = document.getElementById('rd-status-dot');
    if (rdStatus) { rdStatus.textContent = label; rdStatus.style.color = color; }
    if (rdDot && label !== 'Running') rdDot.style.display = 'none';
  }
}

function _setRunButtonState(jobMode, running) {
  const runBtn  = document.getElementById(jobMode === 'self' ? 'btn-run-c' : 'btn-run-r');
  const stopBtn = document.getElementById(jobMode === 'self' ? 'btn-stop-c' : 'btn-stop-r');
  if (runBtn)  runBtn.disabled = running;
  if (stopBtn) stopBtn.classList.toggle('visible', running);
}

async function stopJob() {
  if (!currentJobId) return;
  setStatus('error', 'Stopped');
  _setRunStatus('self', 'Stopped', 'var(--red)');
  _setRunStatus('recruiter', 'Stopped', 'var(--red)');
  _setRunButtonState('self', false);
  _setRunButtonState('recruiter', false);
  appendLog('Stop requested — automation stopping…', 'warn');
  const stopLive = document.getElementById('btn-stop-c-live');
  if (stopLive) stopLive.classList.remove('visible');
  if (evtSource) { evtSource.close(); evtSource = null; }
  stopRecruiterPolling();
  candidates.forEach(c => {
    const statusEl = document.getElementById(`rr-status-${c.id}`);
    if (statusEl && statusEl.textContent !== 'Done') { statusEl.textContent = 'Stopped'; statusEl.style.color = 'var(--red)'; }
    const remarksEl = document.getElementById(`rr-remarks-${c.id}`);
    if (remarksEl && (remarksEl.textContent === '—' || !remarksEl.textContent)) { remarksEl.textContent = 'Stopped by user'; remarksEl.style.color = 'var(--amber)'; }
  });
  try { await fetch(`${API_BASE}/api/stop/${currentJobId}`, { method: 'POST', headers: { 'X-CSRF-Token': getCsrfToken() }, credentials: 'include' }); } catch(e) {}
}

// ═══════════════════════════════════════════════════════
//  RECRUITER POLLING
// ═══════════════════════════════════════════════════════
function startRecruiterPolling(jobId) {
  stopRecruiterPolling();
  _recruiterPollTimer = setInterval(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/job/stats/${jobId}`, { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
      if (!res.ok) {
        if (res.status === 404) {
          stopRecruiterPolling();
          const rdStatus = document.getElementById('rd-running-status');
          const rdDot    = document.getElementById('rd-status-dot');
          if (rdStatus) { rdStatus.textContent = 'Session Ended'; rdStatus.style.color = 'var(--amber)'; }
          if (rdDot) rdDot.style.display = 'none';
        }
        return;
      }
      const data = await res.json();
      setStatNum('rd-total-applied', data.totals?.applied ?? 0);
      setStatNum('rd-total-skipped', data.totals?.already ?? 0);
      setStatNum('rd-total-failed',  data.totals?.failed  ?? 0);
      const rdStatus = document.getElementById('rd-running-status');
      const rdDot    = document.getElementById('rd-status-dot');
      if (rdStatus) {
        rdStatus.textContent = data.status;
        rdStatus.style.color = data.status === 'Running' ? 'var(--green)' : data.status === 'Done' ? 'var(--accent2)' : data.status === 'Stopped' ? 'var(--red)' : 'var(--text2)';
      }
      if (rdDot) rdDot.style.display = data.status === 'Running' ? '' : 'none';
      const candStats = data.candidates || {};
      candidates.forEach(c => {
        const stat = candStats[c.email] || null;
        if (!stat) return;
        setStatNum(`rr-applied-${c.id}`, stat.applied || 0);
        setStatNum(`rr-skipped-${c.id}`, stat.already || 0);
        setStatNum(`rr-failed-${c.id}`,  stat.failed  || 0);
        const statusEl  = document.getElementById(`rr-status-${c.id}`);
        const remarksEl = document.getElementById(`rr-remarks-${c.id}`);
        if (statusEl) {
          statusEl.textContent = stat.status || 'Queued';
          statusEl.style.color = stat.status === 'Running' ? 'var(--green)' : stat.status === 'Done' ? 'var(--accent2)' : stat.status === 'Stopped' ? 'var(--red)' : 'var(--text3)';
        }
        if (remarksEl && stat.remarks) { remarksEl.textContent = stat.remarks; remarksEl.style.color = 'var(--red)'; }
      });
      if (data.status === 'Stopped' || data.status === 'Done') stopRecruiterPolling();
    } catch(e) {}
  }, 2000);
}

function stopRecruiterPolling() {
  if (_recruiterPollTimer) { clearInterval(_recruiterPollTimer); _recruiterPollTimer = null; }
}

// ═══════════════════════════════════════════════════════
//  LIVE DASHBOARD
// ═══════════════════════════════════════════════════════
function startLiveDashboardPolling() {
  stopLiveDashboardPolling();
  pollLiveDashboard();
  _livePollTimer = setInterval(pollLiveDashboard, 3000);
}
function stopLiveDashboardPolling() {
  if (_livePollTimer) { clearInterval(_livePollTimer); _livePollTimer = null; }
}

async function pollLiveDashboard() {
  try {
    let url = `/api/live/dashboard`;
    const uid   = authState.candidate?.user?.id || authState.recruiter?.user?.id || '';
    const utype = authState.candidate?.loggedIn ? 'candidate' : authState.recruiter?.loggedIn ? 'recruiter' : '';
    if (uid && utype) url += `?user_id=${encodeURIComponent(uid)}&user_type=${utype}`;
    const res  = await apiFetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const db = data.db_summary || {};
    setStatNum('live-total-applied', db.applied || 0);
    setStatNum('live-total-already', db.already || 0);
    setStatNum('live-total-failed',  db.failed  || 0);
    const activeCount = (data.active_jobs || []).filter(j => j.is_alive).length;
    setStatNum('live-active-jobs', activeCount);
    const ts = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const lrEl = document.getElementById('live-last-refresh');
    if (lrEl) lrEl.textContent = `Last updated: ${ts}`;
    const jobsEl = document.getElementById('live-jobs-list');
    const jobs   = data.active_jobs || [];
    if (jobsEl) {
      if (jobs.length === 0) {
        jobsEl.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px 0">No jobs currently running.</div>';
      } else {
        jobsEl.innerHTML = jobs.map(j => {
          const statusCls = j.status === 'Running' ? 'running' : j.status === 'Done' ? 'done' : 'stopped';
          const candRows = Object.entries(j.candidates || {}).map(([email, cd]) => {
            const stColor = cd.status === 'Running' ? 'var(--green)' : cd.status === 'Done' ? 'var(--accent2)' : 'var(--red)';
            return `<div class="live-cand-row"><div class="live-cand-email">${escHtml(email)}</div><div class="live-cand-nums"><span style="color:var(--green)">${cd.applied||0}</span><span style="color:var(--amber)">${cd.already||0}</span><span style="color:var(--red)">${cd.failed||0}</span><span style="color:${stColor};font-size:10px">${cd.status||''}</span></div></div>`;
          }).join('');
          return `<div class="live-job-card"><div class="live-job-header"><span class="live-job-id">Job #${escHtml(j.job_id)} · ${escHtml(j.mode || '')}</span><span class="live-job-status ${statusCls}">${escHtml(j.status)}</span></div><div style="display:flex;gap:18px;margin-bottom:8px;font-family:'Syne',sans-serif;font-size:12px;font-weight:700"><span style="color:var(--green)">✅ ${j.totals?.applied||0} Applied</span><span style="color:var(--amber)">⏭ ${j.totals?.already||0} Already</span><span style="color:var(--red)">❌ ${j.totals?.failed||0} Failed</span></div>${candRows}</div>`;
        }).join('');
      }
    }
    if (authState.recruiter?.loggedIn) {
      const recruiterJob = jobs.find(j => j.mode === 'recruiter');
      const rtWrap = document.getElementById('live-recruiter-table-wrap');
      if (rtWrap) rtWrap.style.display = recruiterJob ? '' : 'none';
      if (recruiterJob) {
        const tbody = document.getElementById('live-recruiter-tbody');
        if (tbody) {
          const cdata = recruiterJob.candidates || {};
          if (Object.keys(cdata).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:16px;font-size:12px">No candidates running.</td></tr>';
          } else {
            tbody.innerHTML = Object.entries(cdata).map(([email, stat]) => {
              const stColor = stat.status === 'Running' ? 'var(--green)' : stat.status === 'Done' ? 'var(--accent2)' : 'var(--red)';
              return `<tr><td style="color:var(--text2);font-size:12px">${escHtml(email)}</td><td style="color:var(--green);font-weight:700">${stat.applied||0}</td><td style="color:var(--amber)">${stat.already||0}</td><td style="color:var(--red)">${stat.failed||0}</td><td style="color:${stColor};font-size:11px;font-weight:600">${escHtml(stat.status||'Idle')}</td><td class="remarks-cell">${escHtml(stat.remarks||'—')}</td></tr>`;
            }).join('');
          }
        }
      }
    }
    if (authState.admin.loggedIn) setStatNum('a-active', activeCount);
    if (authState.candidate.loggedIn && currentJobId) {
      const candJob = jobs.find(x => x.job_id === currentJobId);
      if (candJob) {
        setStatNum('cd-applied', candJob.totals?.applied || 0);
        setStatNum('cd-skipped', candJob.totals?.already || 0);
        setStatNum('cd-failed',  candJob.totals?.failed  || 0);
        const cdRun = document.getElementById('cd-running');
        if (cdRun) { cdRun.textContent = candJob.status; cdRun.style.color = candJob.status === 'Running' ? 'var(--green)' : candJob.status === 'Done' ? 'var(--accent2)' : 'var(--red)'; }
      }
    }
  } catch(e) {}
}

function startAdminDashboardPolling() {
  if (_adminDashPollTimer) return;
  _adminDashPollTimer = setInterval(async () => {
    if (!authState.admin.loggedIn) return;
    try {
      const res = await fetch(API_BASE + '/api/admin/dashboard', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
      if (!res.ok) return;
      const data = await res.json();
      setStatNum('a-active',        data.active_runners ?? 0);
      setStatNum('a-total-users',   data.total_users    ?? 0);
      setStatNum('a-total-applied', data.jobs_today     ?? 0);
    } catch(e) {}
  }, 8000);
}

function startBackgroundPolling() {
  if (_bgPollTimer) return;
  _bgPollTimer = setInterval(async () => {
    const loggedIn = authState.admin.loggedIn || authState.candidate.loggedIn || authState.recruiter.loggedIn;
    if (!loggedIn) return;
    try {
      const res  = await fetch(API_BASE + '/api/live/dashboard', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
      if (!res.ok) return;
      const data = await res.json();
      if (authState.admin.loggedIn) setStatNum('a-active', (data.active_jobs||[]).filter(j => j.is_alive).length);
    } catch(e) {}
  }, 5000);
}

// ═══════════════════════════════════════════════════════
//  HISTORY MODAL
// ═══════════════════════════════════════════════════════
async function showHistory() {
  const modal = document.getElementById('history-modal');
  const body  = document.getElementById('history-body');
  modal.style.display = 'block';
  body.innerHTML = '<div style="color:var(--text3);font-family:\'DM Mono\',monospace;font-size:13px;padding:20px 0">Loading…</div>';
  try {
    const res = await fetch(API_BASE + '/api/runs', { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    if (!res.ok) { const d = await res.json(); body.innerHTML = `<div style="color:var(--red);padding:12px">${escHtml(d.error||'Failed')}</div>`; return; }
    const { runs } = await res.json();
    if (!runs || runs.length === 0) { body.innerHTML = '<div style="color:var(--text3);padding:20px;text-align:center">No runs recorded yet.</div>'; return; }
    body.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px;font-family:'DM Mono',monospace">
      <thead><tr style="background:var(--s2);border-bottom:1px solid var(--border2)"><th style="padding:10px 12px;text-align:left;color:var(--text3);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Date</th><th style="padding:10px 12px;text-align:left;color:var(--text3);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Email</th><th style="padding:10px 12px;text-align:left;color:var(--text3);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Technology</th><th style="padding:10px 12px;text-align:center;color:var(--green);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Applied</th><th style="padding:10px 12px;text-align:center;color:var(--amber);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Already</th><th style="padding:10px 12px;text-align:center;color:var(--red);font-size:10px;letter-spacing:0.08em;text-transform:uppercase">Failed</th></tr></thead>
      <tbody>${runs.map((r, i) => `<tr style="border-bottom:1px solid var(--border);background:${i%2===0?'transparent':'rgba(255,255,255,0.01)'}"><td style="padding:9px 12px;color:var(--text3)">${formatDate(r.run_date)}</td><td style="padding:9px 12px;color:var(--text2)">${escHtml(r.email||'')}</td><td style="padding:9px 12px;color:var(--accent2);max-width:220px;word-break:break-word">${escHtml(r.technology||'')}</td><td style="padding:9px 12px;text-align:center;color:var(--green);font-weight:700">${r.jobs_applied??0}</td><td style="padding:9px 12px;text-align:center;color:var(--amber)">${r.already_applied??0}</td><td style="padding:9px 12px;text-align:center;color:var(--red)">${r.failed??0}</td></tr>`).join('')}</tbody>
    </table></div>`;
  } catch(e) { body.innerHTML = `<div style="color:var(--red);padding:12px">Error: ${escHtml(String(e))}</div>`; }
}
function closeHistory() { document.getElementById('history-modal').style.display = 'none'; }
