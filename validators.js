'use strict';
// ═══════════════════════════════════════════════════════
//  VALIDATORS
// ═══════════════════════════════════════════════════════

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isStrongPassword(pw) {
  return pw.length >= 8;
}

function validateCandidateForm(data) {
  const errors = [];
  if (!data.dice_username || !data.dice_username.trim()) errors.push('Username is required.');
  if (!data.dice_password || !data.dice_password.trim()) errors.push('Password is required.');
  if (!data.job_titles || data.job_titles.length === 0) errors.push('At least one job title is required.');
  if (!data.location || !data.location.trim()) errors.push('Location is required.');
  if (!data.work_auth || !data.work_auth.trim()) errors.push('Work authorization is required.');
  return errors;
}

function validateRecruiterCandidate(data) {
  const errors = [];
  if (!data.email || !isValidEmail(data.email)) errors.push('Valid email is required.');
  if (!data.job_titles || data.job_titles.length === 0) errors.push('At least one job title is required.');
  if (!data.location || !data.location.trim()) errors.push('Location is required.');
  if (!data.work_auth || !data.work_auth.trim()) errors.push('Work authorization is required.');
  return errors;
}
