// Email helpers shared by the donation and volunteer notifications.

// Everything interpolated into a notification email comes from a public form,
// so it is attacker-controlled. Without escaping, a volunteer who types
// `<a href="https://evil.example">Approve</a>` into the name field gets that
// rendered as a live link in the coordinator's inbox — a phishing email that
// we send ourselves, from our own verified domain.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Subjects are plain text, but a newline lets an attacker inject extra headers.
function escapeSubject(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

// A two-column table row. Both halves are escaped; pass `html` only for markup
// this file builds itself, never for user input.
function row(label, value, { html = false } = {}) {
  if (!value) return '';
  const cell = html ? value : escapeHtml(value);
  return `<tr><td style="padding:6px 12px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0">${cell}</td></tr>`;
}

// mailto link with the address escaped in both the href and the text.
function mailtoCell(address) {
  if (!address) return '';
  const safe = escapeHtml(address);
  return `<a href="mailto:${encodeURIComponent(address)}">${safe}</a>`;
}

module.exports = { escapeHtml, escapeSubject, row, mailtoCell };
