'use strict';
// ═══════════════════════════════════════════════════════
//  STATE — Global application state
// ═══════════════════════════════════════════════════════

const API_BASE = "https://api.futurehiretech.com";

let currentTab = 'candidate';
let selfTags = [];
let candidates = [];      // legacy — synced from rcCandidates
let cId = 0;
let currentJobId = null;
let evtSource = null;
let stats = { applied: 0, skipped: 0, errors: 0 };
let logCount = 0;
let _candidateEditMode = false;

const authState = {
  candidate: { loggedIn: false, user: null, plan: null },
  recruiter:  { loggedIn: false, user: null },
  admin:      { loggedIn: false }
};

// In-memory platform password — restored from DB on login
let _selfDicePassword = '';

// Token refresh state
let _refreshing = false;
let _refreshQueue = [];

// CSRF token
let _csrfToken = "";

// Polling timers
let _recruiterPollTimer = null;
let _livePollTimer = null;
let _adminDashPollTimer = null;
let _bgPollTimer = null;

// Report period
let _reportPeriod = 'today';

// Email templates cache
let _emailTemplates = [];

// Sidebar state
let _sbActiveRole = null;
let _sbActiveItem = null;
let _sbMobileOpen = false;
