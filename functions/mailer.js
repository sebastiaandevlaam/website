// Outgoing email, sent through our own Google Workspace via the Gmail API.
//
// Every message is sent by one mailbox (EMAIL_SENDER_MAILBOX, default
// website@), so everything the website sends is recognisable as such, replies
// land in a real inbox, and copies show up in that mailbox's Sent folder.
//
// A message may ask for a different From address — a campaign's own alias —
// but only one listed in EMAIL_ALLOWED_SENDERS. The service account is
// authorised domain-wide, so without that list anyone able to edit the value
// could send as president@ from our own domain. The alias must also be set up
// as a "Send mail as" address on the mailbox, or Gmail rewrites the From back
// to the mailbox itself.
//
// Callers still escape their own content (see email.js); this file only makes
// sure nothing can break out of a header.

const DEFAULT_SENDER_MAILBOX = 'website@hollistonpantryshelf.org';
const DEFAULT_FROM_NAME = 'Holliston Pantry Shelf';

const EMAIL_PATTERN = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;

// A newline in any header value would let the value start a new header.
function stripLineBreaks(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function isEmailAddress(value) {
  return EMAIL_PATTERN.test(value);
}

// Accepts an array or a comma-separated string (env vars such as
// VOLUNTEER_EMAIL_TO may hold several addresses) and drops anything invalid.
function parseAddressList(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',');
  return parts.map(stripLineBreaks).filter(isEmailAddress);
}

// RFC 2047: headers are ASCII, so non-ASCII text (the em dash in our subjects,
// an accented donor name) travels as base64 "encoded words". Each word is kept
// under the 75-character limit by splitting between characters, never inside
// one, so a multi-byte character is not cut in half.
function encodeHeaderText(text) {
  const clean = stripLineBreaks(text);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;

  const MAX_BYTES_PER_WORD = 45; // 45 bytes -> 60 base64 chars + 12 of wrapper
  const words = [];
  let current = '';
  for (const char of clean) {
    if (Buffer.byteLength(current + char) > MAX_BYTES_PER_WORD) {
      words.push(current);
      current = '';
    }
    current += char;
  }
  if (current) words.push(current);

  return words
    .map(word => `=?UTF-8?B?${Buffer.from(word, 'utf8').toString('base64')}?=`)
    .join('\r\n ');
}

// "Name" <address>. ASCII names are quoted so a comma in them cannot be read
// as a second address.
function formatMailbox(address, name) {
  if (!name) return address;
  const clean = stripLineBreaks(name);
  const display = /^[\x20-\x7E]*$/.test(clean)
    ? `"${clean.replace(/["\\]/g, '\\$&')}"`
    : encodeHeaderText(clean);
  return `${display} <${address}>`;
}

// The From address a message may use: the requested one when it is allowed,
// otherwise the sending mailbox.
function resolveSender(requested, mailbox, allowedSenders) {
  if (!requested) return mailbox;
  const wanted = stripLineBreaks(requested).toLowerCase();
  const allowed = new Set([mailbox, ...parseAddressList(allowedSenders)].map(a => a.toLowerCase()));
  if (allowed.has(wanted)) return wanted;
  console.warn(`Sender ${wanted} is not in EMAIL_ALLOWED_SENDERS; sending as ${mailbox} instead.`);
  return mailbox;
}

// A complete RFC 5322 message with an HTML body, ready for base64url encoding.
function buildMimeMessage({ from, fromName, to, replyTo, subject, html }) {
  const recipients = parseAddressList(to);
  if (recipients.length === 0) throw new Error('Email has no valid recipient.');

  const replyToList = parseAddressList(replyTo);

  // Base64 body lines are wrapped at 76 characters, as MIME requires.
  const body = Buffer.from(String(html ?? ''), 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n');

  const headers = [
    `From: ${formatMailbox(from, fromName)}`,
    `To: ${recipients.join(', ')}`,
    replyToList.length ? `Reply-To: ${replyToList.join(', ')}` : '',
    `Subject: ${encodeHeaderText(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);

  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

// One authorised client per mailbox, reused across a warm instance.
const gmailClients = new Map();
function getGmailClient(mailbox) {
  if (gmailClients.has(mailbox)) return gmailClients.get(mailbox);

  if (!process.env.GMAIL_SERVICE_ACCOUNT_JSON) {
    throw new Error('GMAIL_SERVICE_ACCOUNT_JSON is not set.');
  }
  const credentials = JSON.parse(process.env.GMAIL_SERVICE_ACCOUNT_JSON);

  const { google } = require('googleapis');
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    // Domain-wide delegation: act as this mailbox.
    subject: mailbox,
  });
  const client = google.gmail({ version: 'v1', auth });

  gmailClients.set(mailbox, client);
  return client;
}

// Sends one HTML email. `from` is optional; see resolveSender.
async function sendEmail({ to, subject, html, replyTo, from }) {
  const mailbox = (process.env.EMAIL_SENDER_MAILBOX || DEFAULT_SENDER_MAILBOX).toLowerCase();
  const sender = resolveSender(from, mailbox, process.env.EMAIL_ALLOWED_SENDERS);

  const message = buildMimeMessage({
    from: sender,
    fromName: process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME,
    to,
    replyTo,
    subject,
    html,
  });

  await getGmailClient(mailbox).users.messages.send({
    userId: 'me',
    requestBody: { raw: Buffer.from(message, 'utf8').toString('base64url') },
  });
}

module.exports = {
  sendEmail,
  _internal: { buildMimeMessage, encodeHeaderText, formatMailbox, parseAddressList, resolveSender },
};
