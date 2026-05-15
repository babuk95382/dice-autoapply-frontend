'use strict';
// ═══════════════════════════════════════════════════════
//  RECRUITER CANDIDATE PERSISTENCE (DB-backed)
// ═══════════════════════════════════════════════════════
let rcSelectedIds = new Set();
let rcCandidates  = [];
let rcEditingId   = null;
let _rcModalTags  = [];

function toggleCandidateSelect(id, checked) {
  if (checked) rcSelectedIds.add(id);
  else rcSelectedIds.delete(id);
  const row = document.getElementById('rc-row-' + id);
  if (row) row.classList.toggle('rc-row-selected', checked);
  updateSelectAllCheckbox();
  updateSelectionBar();
}

function toggleSelectAll(checked) {
  rcCandidates.forEach(c => {
    if (checked) rcSelectedIds.add(c.id);
    else rcSelectedIds.delete(c.id);
    const row = document.getElementById('rc-row-' + c.id);
    if (row) {
      row.classList.toggle('rc-row-selected', checked);
      const cb = row.querySelector('.rc-row-checkbox');
      if (cb) cb.checked = checked;
    }
  });
  updateSelectionBar();
}

function clearAllSelections() {
  rcSelectedIds.clear();
  document.querySelectorAll('.rc-row-checkbox').forEach(cb => cb.checked = false);
  document.querySelectorAll('tr.rc-row-selected').forEach(r => r.classList.remove('rc-row-selected'));
  updateSelectAllCheckbox();
  updateSelectionBar();
}

function updateSelectAllCheckbox() {
  const cb = document.getElementById('rc-select-all');
  if (!cb) return;
  if (rcCandidates.length === 0) { cb.checked = false; cb.indeterminate = false; return; }
  const selCount = rcCandidates.filter(c => rcSelectedIds.has(c.id)).length;
  if (selCount === 0)                      { cb.checked = false; cb.indeterminate = false; }
  else if (selCount === rcCandidates.length) { cb.checked = true;  cb.indeterminate = false; }
  else                                     { cb.checked = false; cb.indeterminate = true; }
}

function updateSelectionBar() {
  const bar    = document.getElementById('rc-selection-bar');
  const label  = document.getElementById('rc-selected-count-label');
  const warn   = document.getElementById('rc-no-selection-warn');
  const runBtn = document.getElementById('btn-run-r');
  const count  = rcSelectedIds.size;
  if (bar)   bar.style.display   = count > 0 ? 'flex' : 'none';
  if (label) label.textContent   = `${count} Candidate${count !== 1 ? 's' : ''} Selected`;
  if (warn)  warn.style.display  = 'none';
  if (runBtn) runBtn.disabled    = count === 0 && rcCandidates.length > 0;
}

function syncCandidatesFromRc() {
  candidates = rcCandidates.map(c => {
    const pw = c._sessionPassword || _rcGetSessionPass(c.id) || '';
    return {
      id: c.id, name: c.name, email: c.dice_email,
      password: pw, password_set: c.password_set || !!pw,
      searches: Array.isArray(c.searches) ? c.searches : [],
      open: false, applied: c.applied_count || 0, skipped: 0,
      failed: c.failed_count || 0, errors: [],
    };
  });
}

async function loadRecruiterCandidates() {
  const user = authState.recruiter.user;
  if (!user) return;
  const tbody = document.getElementById('rc-saved-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="rc-empty"><div class="skeleton-line skeleton" style="width:60%;margin:0 auto 8px"></div></td></tr>';
  try {
    const res  = await fetch(`${API_BASE}/api/recruiter/candidates`, { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok || !data.ok) { renderRcTable(); return; }
    rcCandidates = data.candidates || [];
    rcCandidates.forEach(c => {
      if (c.dice_password_decrypted) { c._sessionPassword = c.dice_password_decrypted; _rcSaveSessionPass(c.id, c.dice_password_decrypted); }
      else { const sp = _rcGetSessionPass(c.id); if (sp) c._sessionPassword = sp; }
      delete c.dice_password_decrypted;
    });
    renderRcTable();
    updateStats();
    syncCandidatesFromRc();
    updateSelectionBar();
  } catch(e) { renderRcTable(); }
}

function renderRcTable() {
  const tbody = document.getElementById('rc-saved-tbody');
  if (!tbody) return;
  if (rcCandidates.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="rc-empty">No candidates yet. Add your first candidate above.</td></tr>';
    return;
  }
  tbody.innerHTML = rcCandidates.map(c => {
    const hasPass  = !!c._sessionPassword || !!_rcGetSessionPass(c.id) || c.password_set;
    const passIcon = hasPass ? '<span title="Password saved" style="color:var(--green);font-size:12px">🔑</span>' : '<span title="No password" style="color:var(--amber);font-size:12px">⚠️</span>';
    const updated  = c.updated_at ? formatDate(c.updated_at) : '—';
    const statusCls = c.running_status === 'Running' ? 'live-job-status running' : c.running_status === 'Done' ? 'live-job-status done' : 'live-job-status stopped';
    const emailChanges = parseInt(c.email_changes || 0);
    const emailLeft    = 3 - emailChanges;
    const emailTag = emailLeft <= 0
      ? '<span title="Email change limit reached" style="color:var(--red);font-size:10px;margin-left:4px">🔒</span>'
      : emailLeft === 1 ? `<span style="color:var(--amber);font-size:10px;margin-left:4px">(${emailLeft} left)</span>` : '';
    const isSelected = rcSelectedIds.has(c.id);
    const selectedCls = isSelected ? ' rc-row-selected' : '';
    return `<tr class="${selectedCls}" id="rc-row-${escHtml(c.id)}">
      <td style="text-align:center"><input type="checkbox" class="rc-row-checkbox" data-id="${escHtml(c.id)}" ${isSelected ? 'checked' : ''} onchange="toggleCandidateSelect('${escHtml(c.id)}', this.checked)" title="Select candidate"></td>
      <td><strong>${escHtml(c.name || '—')}</strong> ${passIcon}</td>
      <td style="color:var(--text3);font-size:11.5px">${escHtml(c.dice_email)}${emailTag}</td>
      <td>${escHtml(c.job_role || '—')}</td>
      <td class="${statusCls}">${escHtml(c.running_status || 'Idle')}</td>
      <td style="color:var(--green);text-align:center">${c.applied_count || 0}</td>
      <td style="color:var(--red);text-align:center">${c.failed_count || 0}</td>
      <td style="color:var(--text3);font-size:11px;white-space:nowrap">${updated}</td>
      <td>
        <button class="edit-btn" onclick="openEditCandidateModal('${escHtml(c.id)}')">✏️ Edit</button>
        <button class="del-btn"  onclick="deleteRcCandidate('${escHtml(c.id)}')">✕</button>
      </td>
    </tr>`;
  }).join('');
  updateSelectAllCheckbox();
}

function updateStats() {
  setStatNum('st-count',   rcCandidates.length);
  const ready = rcCandidates.filter(c => c.dice_email && (c.password_set || c._sessionPassword || !!_rcGetSessionPass(c.id)) && c.searches?.length > 0).length;
  setStatNum('st-ready',   ready);
  setStatNum('st-searches', rcCandidates.reduce((a, c) => a + (c.searches?.length || 0), 0));
}

// ── Modal ──
function openAddCandidateModal() {
  if (rcCandidates.length >= 10) { toast('Maximum 10 candidates allowed. Delete one to add another.', 'err'); return; }
  rcEditingId = null; _rcModalTags = [];
  document.getElementById('rc-modal-title').textContent = 'Add Candidate';
  document.getElementById('rc-modal-name').value        = '';
  document.getElementById('rc-modal-email').value       = '';
  document.getElementById('rc-modal-email').disabled    = false;
  document.getElementById('rc-modal-pass').value        = '';
  document.getElementById('rc-modal-pass').placeholder  = 'Enter password (required)';
  document.getElementById('rc-modal-role').value        = '';
  const passHint = document.getElementById('rc-modal-pass-hint');
  passHint.textContent = 'Password is required when adding a new candidate.';
  passHint.style.display = ''; passHint.style.color = 'var(--text3)';
  const emailHint = document.getElementById('rc-modal-email-hint');
  if (emailHint) emailHint.style.display = 'none';
  _renderRcModalTags();
  const msgEl = document.getElementById('rc-modal-msg');
  msgEl.textContent = ''; msgEl.className = 'rc-modal-msg';
  document.getElementById('rc-modal-bg').style.display = 'flex';
  document.getElementById('rc-modal-save-label').textContent = 'Save Candidate';
}

function openEditCandidateModal(id) {
  const c = rcCandidates.find(x => x.id === id);
  if (!c) return;
  rcEditingId = id; _rcModalTags = Array.isArray(c.searches) ? [...c.searches] : [];
  const emailChanges = parseInt(c.email_changes || 0);
  const emailLeft    = 3 - emailChanges;
  document.getElementById('rc-modal-title').textContent = 'Edit Candidate';
  document.getElementById('rc-modal-name').value        = c.name       || '';
  document.getElementById('rc-modal-email').value       = c.dice_email || '';
  document.getElementById('rc-modal-role').value        = c.job_role   || '';
  const storedPass = c._sessionPassword || _rcGetSessionPass(c.id) || '';
  const hasPass    = !!storedPass || c.password_set;
  const passEl     = document.getElementById('rc-modal-pass');
  passEl.value       = storedPass;
  passEl.placeholder = hasPass ? 'Leave blank to keep saved password' : 'Enter password (required)';
  const passHint = document.getElementById('rc-modal-pass-hint');
  passHint.innerHTML = hasPass ? '✅ Password saved — leave blank to keep it.' : '⚠️ No password on file — please enter one.';
  passHint.style.display = ''; passHint.style.color = hasPass ? 'var(--green)' : 'var(--amber)';
  const emailHint = document.getElementById('rc-modal-email-hint');
  if (emailHint) {
    if (emailLeft <= 0) {
      emailHint.textContent = '🔒 Email change limit reached (3/3). Cannot change further.';
      emailHint.style.display = ''; emailHint.style.color = 'var(--red)';
      document.getElementById('rc-modal-email').disabled = true;
    } else {
      emailHint.textContent = `Email changes remaining: ${emailLeft}/3`;
      emailHint.style.display = ''; emailHint.style.color = emailLeft === 1 ? 'var(--amber)' : 'var(--text3)';
      document.getElementById('rc-modal-email').disabled = false;
    }
  }
  _renderRcModalTags();
  const msgEl = document.getElementById('rc-modal-msg');
  msgEl.textContent = ''; msgEl.className = 'rc-modal-msg';
  document.getElementById('rc-modal-bg').style.display = 'flex';
  document.getElementById('rc-modal-save-label').textContent = 'Save Changes';
}

function closeRcModal() { document.getElementById('rc-modal-bg').style.display = 'none'; }

function _renderRcModalTags() {
  const wrap = document.getElementById('rc-modal-tags');
  if (!wrap) return;
  wrap.innerHTML = _rcModalTags.map((t, i) =>
    `<span class="tag">${escHtml(t)}<button class="tag-x" onclick="_rcRemoveTag(${i})" aria-label="Remove ${escHtml(t)}">×</button></span>`
  ).join('');
}
function _rcRemoveTag(i) { _rcModalTags.splice(i, 1); _renderRcModalTags(); }
function _rcAddTag() {
  const inp = document.getElementById('rc-modal-tag-inp');
  const v = inp ? inp.value.trim() : '';
  if (!v) return;
  if (!_rcModalTags.includes(v)) { _rcModalTags.push(v); _renderRcModalTags(); }
  if (inp) inp.value = '';
  closeAutocomplete('rc-modal-ac-list');
}

async function saveRcCandidate() {
  const user  = authState.recruiter.user;
  if (!user) return;
  const name  = document.getElementById('rc-modal-name').value.trim();
  const email = document.getElementById('rc-modal-email').value.trim();
  const pass  = document.getElementById('rc-modal-pass').value.trim();
  const role  = document.getElementById('rc-modal-role').value.trim();
  const btn   = document.getElementById('rc-modal-save-btn');
  const label = document.getElementById('rc-modal-save-label');
  const showErr = (msg) => {
    const el = document.getElementById('rc-modal-msg');
    el.textContent = msg; el.className = 'rc-modal-msg err';
  };
  if (!email) { showErr('Email is required.'); return; }
  if (!rcEditingId && !pass) { showErr('Password is required for new candidates.'); return; }
  btn.disabled = true; if (label) label.textContent = 'Saving…';
  const body = { recruiter_id: user.id, name, dice_email: email, job_role: role, searches: _rcModalTags };
  if (pass) body.dice_password = pass;
  try {
    let res;
    if (rcEditingId) {
      res = await fetch(`${API_BASE}/api/recruiter/candidates/${rcEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } else {
      res = await apiPost('/api/recruiter/candidates', body);
    }
    const data = await res.json();
    if (!res.ok || !data.ok) {
      if (data.limit_reached) showErr('❌ Maximum 10 candidates reached.');
      else if (data.email_change_limit) showErr('❌ Email changed 3 times already. Cannot change further.');
      else showErr('❌ ' + (data.error || 'Save failed'));
      btn.disabled = false; if (label) label.textContent = rcEditingId ? 'Save Changes' : 'Save Candidate';
      return;
    }
    const savedId     = rcEditingId || data.candidate?.id;
    const returnedPass = data.candidate?.dice_password_decrypted || pass;
    if (returnedPass && savedId) _rcSaveSessionPass(savedId, returnedPass);
    await loadRecruiterCandidates();
    if (returnedPass && savedId) {
      const c = rcCandidates.find(x => x.id === savedId);
      if (c) { c._sessionPassword = returnedPass; c.password_set = true; }
    }
    syncCandidatesFromRc();
    closeRcModal();
    toast(rcEditingId ? '✅ Candidate updated.' : '✅ Candidate added.', 'ok');
  } catch(e) {
    showErr('❌ Network error: ' + e);
  }
  btn.disabled = false; if (label) label.textContent = rcEditingId ? 'Save Changes' : 'Save Candidate';
}

// ── Session password helpers ──
function _rcSaveSessionPass(id, pass) {
  try { const s = JSON.parse(localStorage.getItem('rc_pw') || '{}'); s[id] = pass; localStorage.setItem('rc_pw', JSON.stringify(s)); } catch(e) {}
}
function _rcGetSessionPass(id) {
  try { const s = JSON.parse(localStorage.getItem('rc_pw') || '{}'); return s[id] || ''; } catch(e) { return ''; }
}
function _rcClearSessionPasses() {
  try { localStorage.removeItem('rc_pw'); } catch(e) {}
}

async function deleteRcCandidate(id) {
  if (!confirm('Delete this candidate? This cannot be undone.')) return;
  const user = authState.recruiter.user;
  if (!user) return;
  try {
    const res = await fetch(`${API_BASE}/api/recruiter/candidates/${id}`, {
      method: 'DELETE', headers: { 'X-CSRF-Token': getCsrfToken() }, credentials: 'include',
    });
    if (res.ok) {
      rcSelectedIds.delete(id);
      rcCandidates = rcCandidates.filter(c => c.id !== id);
      renderRcTable(); updateStats(); syncCandidatesFromRc(); updateSelectionBar();
      toast('Candidate deleted.', 'info');
    } else {
      const d = await res.json();
      toast('Delete failed: ' + (d.error || 'Unknown error'), 'err');
    }
  } catch(e) { toast('Network error: ' + e, 'err'); }
}

// ═══════════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════════
function setReportPeriod(period) {
  _reportPeriod = period;
  ['today','yesterday','week','month','custom'].forEach(p => {
    document.getElementById(`rpt-${p}`)?.classList.toggle('active', p === period);
  });
  const customRow = document.getElementById('rpt-custom-row');
  if (customRow) customRow.style.display = period === 'custom' ? 'flex' : 'none';
  if (period !== 'custom') loadRecruiterReport();
}

async function loadRecruiterReport() {
  const user = authState.recruiter.user;
  if (!user) return;
  const wrap = document.getElementById('r-date-report-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px 0">Loading…</div>';
  let url = `${API_BASE}/api/recruiter/reports?period=${_reportPeriod}`;
  if (_reportPeriod === 'custom') {
    const df = document.getElementById('rpt-date-from')?.value;
    const dt = document.getElementById('rpt-date-to')?.value;
    if (!df || !dt) { wrap.innerHTML = '<div style="color:var(--amber);font-size:12px;padding:8px">Please select both From and To dates.</div>'; return; }
    url += `&date_from=${encodeURIComponent(df)}&date_to=${encodeURIComponent(dt)}`;
  }
  try {
    const res  = await fetch(url, { credentials: 'include', headers: { 'X-CSRF-Token': getCsrfToken() } });
    const data = await res.json();
    if (!res.ok || !data.ok) { wrap.innerHTML = `<div style="color:var(--red);font-size:12px">${escHtml(data.error||'Failed to load report')}</div>`; return; }
    const s = data.summary || {};
    setStatNum('rpt-applied', s.applied || 0);
    setStatNum('rpt-failed',  s.failed  || 0);
    setStatNum('rpt-already', s.already || 0);
    const cands = data.candidates || [];
    if (cands.length === 0) { wrap.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px">No data for this period.</div>'; return; }
    wrap.innerHTML = `<table><thead><tr><th>Candidate</th><th style="color:var(--green)">Applied</th><th style="color:var(--amber)">Already</th><th style="color:var(--red)">Failed</th><th>Runs</th><th>Status</th></tr></thead><tbody>
      ${cands.map(c => {
        const liveStat = c.live_status || c.status || 'Idle';
        const stColor  = liveStat === 'Running' ? 'var(--green)' : liveStat === 'Done' ? 'var(--accent2)' : liveStat === 'Stopped' ? 'var(--red)' : 'var(--text3)';
        return `<tr><td><strong>${escHtml(c.name||'—')}</strong><br><span style="font-size:10.5px;color:var(--text3)">${escHtml(c.dice_email)}</span></td><td style="color:var(--green);font-weight:700">${c.applied}</td><td style="color:var(--amber)">${c.already}</td><td style="color:var(--red)">${c.failed}</td><td style="color:var(--text3)">${c.runs}</td><td style="color:${stColor};font-size:11px;font-weight:600">${escHtml(liveStat)}</td></tr>`;
      }).join('')}
    </tbody></table>`;
  } catch(e) {
    wrap.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${escHtml(String(e))}</div>`;
  }
}

function exportRecruiterReport() {
  const user = authState.recruiter.user;
  if (!user) { toast('Please log in as a recruiter first.', 'err'); return; }
  const rows = [['Candidate','Platform Email','Applied','Already Applied','Failed','Runs','Status']];
  document.querySelectorAll('#r-date-report-wrap tbody tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td'));
    if (cells.length >= 6) {
      rows.push([
        cells[0].querySelector('strong')?.textContent?.trim() || '',
        cells[0].querySelector('span')?.textContent?.trim()   || '',
        cells[1].textContent.replace(/\(.*\)/,'').trim(),
        cells[2].textContent.trim(), cells[3].textContent.trim(),
        cells[4].textContent.trim(), cells[5].textContent.trim(),
      ]);
    }
  });
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `recruiter_report_${_reportPeriod}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderRecruiterReport() {
  const tbody = document.getElementById('r-report-body');
  if (!tbody) return;
  if (candidates.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px;font-size:12px;">No candidates loaded.</td></tr>'; return; }
  tbody.innerHTML = candidates.map(c => `
    <tr id="rr-${c.id}">
      <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:26px;height:26px;font-size:10px;">${initials(c.name,c.email)}</div><div><div style="font-size:12.5px;color:var(--text)">${escHtml(c.name || 'Candidate')}</div><div style="font-size:10.5px;color:var(--text3)">${escHtml(c.email)}</div></div></div></td>
      <td style="color:var(--green);font-weight:700;font-family:'Syne',sans-serif" id="rr-applied-${c.id}">0</td>
      <td style="color:var(--amber)" id="rr-skipped-${c.id}">0</td>
      <td style="color:var(--red)"   id="rr-failed-${c.id}">0</td>
      <td id="rr-status-${c.id}"  style="color:var(--accent2);font-size:11px;font-weight:600;">Queued</td>
      <td class="remarks-cell" id="rr-remarks-${c.id}">—</td>
    </tr>`).join('');
}

function updateRecruiterReport(text) {
  const rds = document.getElementById('rd-running-status');
  if (rds && rds.textContent !== 'Stopped') { rds.textContent = 'Running'; rds.style.color = 'var(--green)'; }
}
