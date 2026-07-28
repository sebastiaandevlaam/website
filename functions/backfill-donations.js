/**
 * One-time historical backfill of Stripe donations into the donations Google Sheet.
 *
 * Pulls every PAID Checkout Session created on/after the cutoff date and appends
 * a row (same columns as the live webhook). It reads the Stripe Session IDs
 * already in the sheet and skips them, so running it more than once will not
 * create duplicates.
 *
 * Run from the functions/ directory:
 *     node backfill-donations.js
 *     node backfill-donations.js --dry-run     # show what would be added, write nothing
 *
 * Requires these to be set (already loaded from .env / .env.holliston-pantry-shelf):
 *     STRIPE_SECRET_KEY
 *     GOOGLE_SERVICE_ACCOUNT_JSON
 *     DONATION_SHEET_ID
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { DONATION_HEADER, buildDonationRow } = require('./donationRow');

// --- Config -----------------------------------------------------------------

// Only donations created on/after this moment are imported.
// Midnight, May 25 2026, US Eastern (EDT / UTC-4).
const CUTOFF = new Date('2026-05-25T00:00:00-04:00');

const DRY_RUN = process.argv.includes('--dry-run');

// --- Minimal .env loader ----------------------------------------------------
// Firebase auto-loads these inside the deployed function, but a plain `node`
// script does not, so we load them here. Project-specific file wins.
function loadEnvFile(file) {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) return;
  for (const rawLine of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip a single matching pair of surrounding quotes (kept literal — no escape expansion).
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile('.env');
loadEnvFile('.env.holliston-pantry-shelf'); // overrides .env

// --- Helpers ----------------------------------------------------------------

function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}. Add it to functions/.env.holliston-pantry-shelf`);
    process.exit(1);
  }
  return process.env[name];
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureHeader(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!A1:R1' });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [DONATION_HEADER] },
    });
    console.log('• Wrote header row (sheet was empty).');
  }
}

async function existingSessionIds(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!B2:B' });
  return new Set((res.data.values || []).flat().filter(Boolean));
}

// --- Main -------------------------------------------------------------------

async function main() {
  const stripe = require('stripe')(requireEnv('STRIPE_SECRET_KEY'));
  const spreadsheetId = requireEnv('DONATION_SHEET_ID');
  const sheets = await getSheetsClient();

  const cutoffUnix = Math.floor(CUTOFF.getTime() / 1000);
  console.log(`Backfilling paid donations created on/after ${CUTOFF.toISOString()} (${DRY_RUN ? 'DRY RUN' : 'LIVE'})…`);

  // Preflight: confirm the spreadsheet is reachable and has a "Sheet1" tab,
  // so a bad ID or missing share fails with a clear message instead of a 404.
  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId });
  } catch (err) {
    const email = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email;
    console.error(`\nCould not open spreadsheet id: ${JSON.stringify(spreadsheetId)}`);
    console.error(`Service account: ${email}`);
    console.error('Check that:');
    console.error('  • DONATION_SHEET_ID is ONLY the id from the URL (the part between /d/ and /edit)');
    console.error('    — no https://, no /edit, no #gid=…, no quotes, no spaces');
    console.error(`  • the sheet is shared with ${email} as Editor`);
    throw err;
  }
  const tabs = meta.data.sheets.map((s) => s.properties.title);
  console.log(`Opened "${meta.data.properties.title}" · tabs: ${tabs.join(', ')}`);
  if (!tabs.includes('Sheet1')) {
    throw new Error(`No tab named "Sheet1" (found: ${tabs.join(', ')}). Rename your tab to Sheet1.`);
  }

  if (!DRY_RUN) await ensureHeader(sheets, spreadsheetId);
  const already = await existingSessionIds(sheets, spreadsheetId);

  const collected = [];
  let scanned = 0;
  const pager = stripe.checkout.sessions.list({ created: { gte: cutoffUnix }, limit: 100 });
  for await (const session of pager) {
    scanned++;
    if (session.payment_status !== 'paid') continue;
    if (already.has(session.id)) continue;
    collected.push({ created: session.created, row: buildDonationRow(session, session.metadata) });
  }

  // Oldest first, so the sheet reads chronologically.
  collected.sort((a, b) => a.created - b.created);
  const rows = collected.map((c) => c.row);

  console.log(`Scanned ${scanned} sessions · ${rows.length} new paid donation(s) to add · ${already.size} already in sheet.`);

  if (rows.length === 0) {
    console.log('Nothing to add. Done.');
    return;
  }

  if (DRY_RUN) {
    for (const c of collected) {
      console.log(`  [dry-run] ${c.row[0]}  ${c.row[2] || '(no name)'}  $${c.row[4]}  ${c.row[1]}`);
    }
    console.log('Dry run complete — no rows written.');
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  console.log(`✓ Added ${rows.length} donation(s) to the sheet.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
