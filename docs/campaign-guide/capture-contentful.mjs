// Captures the Contentful editor screenshots for the campaign guide.
//
//   node docs/campaign-guide/capture-contentful.mjs
//
// Opens a visible Chrome window with its own profile (kept in
// ~/.cache/hps-guide-chrome, so you only log in the first time). Log in to
// Contentful in that window; the script waits, then visits the Duck Drop TEST
// entries and outlines one field per screenshot. It only looks: nothing is
// edited, created or published. A field it cannot find is skipped and listed
// at the end.
//
// Output: GUIDE_SCREENS (default: ./screens next to this file).

import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { highlight, clearHighlight, shoot, byText } from './annotate.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('../../node_modules/puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SPACE = 'sm8a9cvs0gzu';
const APP = `https://app.contentful.com/spaces/${SPACE}`;
const OUT = (process.env.GUIDE_SCREENS || new URL('./screens/', import.meta.url).pathname).replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });

// The Duck Drop TEST entries created for the walkthrough.
const ENTRY = {
  item: '7d5Mt24OkRvZ6rZmT4zfsF',
  campaign: '6IWTnAcsBE1b2UArdDYy7y',
  section: '6zTmPl3NIxngj001ci34DB',
  page: '2JXirDjPw3udbjBLgAxmc2',
  nav: '5FQJwKR1nRWIPmPFt8ijt2',
  supportPage: '38q9GjCRunqjqphbuXeXvY',
};

// [file, entry, field label(s) to outline]. Alternatives are tried in order,
// because Contentful's wording for some controls changes now and then.
const FIELD_SHOTS = [
  ['c03-item-name.jpg', ENTRY.item, ['Name']],
  ['c04-item-price.jpg', ENTRY.item, ['Price (USD)']],
  ['c05-item-units.jpg', ENTRY.item, ['Units per Item']],
  ['c06-item-caps.jpg', ENTRY.item, ['Max per Order']],
  ['c07-item-fmv.jpg', ENTRY.item, ['Fair Market Value (USD)']],
  ['c08-campaign-name.jpg', ENTRY.campaign, ['Name']],
  ['c09-campaign-id.jpg', ENTRY.campaign, ['Campaign ID']],
  ['c10-campaign-type.jpg', ENTRY.campaign, ['Campaign Type']],
  ['c11-start-number.jpg', ENTRY.campaign, ['Start Number']],
  ['c12-items.jpg', ENTRY.campaign, ['Items']],
  ['c13-dates.jpg', ENTRY.campaign, ['Open Date']],
  ['c14-capacity.jpg', ENTRY.campaign, ['Total Capacity']],
  ['c15-reserved.jpg', ENTRY.campaign, ['Reserved Spots']],
  ['c16-cover-fees.jpg', ENTRY.campaign, ['Offer to Cover Fees']],
  ['c17-spreadsheet.jpg', ENTRY.campaign, ['Spreadsheet ID']],
  ['c18-email-subject.jpg', ENTRY.campaign, ['Confirmation Email Subject']],
  ['c19-email-body.jpg', ENTRY.campaign, ['Confirmation Email Body']],
  ['c20-email-from.jpg', ENTRY.campaign, ['Confirmation Email From']],
  ['c21-success.jpg', ENTRY.campaign, ['Success Headline']],
  ['c22-closed.jpg', ENTRY.campaign, ['Closed Message']],
  ['c23-section-title.jpg', ENTRY.section, ['Title']],
  ['c24-section-campaign.jpg', ENTRY.section, ['Campaign']],
  ['c25-page-slug.jpg', ENTRY.page, ['Slug']],
  ['c26-page-sections.jpg', ENTRY.page, ['Sections']],
  ['c28-nav-items.jpg', ENTRY.nav, ['Menu Items']],
  ['c29-existing-page-sections.jpg', ENTRY.supportPage, ['Sections']],
];

const missed = [];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  userDataDir: path.join(os.homedir(), '.cache', 'hps-guide-chrome'),
  defaultViewport: { width: 1280, height: 860 },
  args: ['--window-size=1300,960'],
});
const [page] = await browser.pages();

await page.goto(`${APP}/entries/${ENTRY.campaign}`, { waitUntil: 'domcontentloaded' });
if (!page.url().startsWith(APP)) {
  console.log('\n→ Log in to Contentful in the Chrome window that just opened.');
  console.log('  The script continues by itself once the Duck Drop TEST entry shows (up to 10 minutes).\n');
}
await page.waitForFunction(
  (app) => location.href.startsWith(app) && document.body.innerText.includes('Campaign ID'),
  { timeout: 10 * 60 * 1000, polling: 1000 }, APP,
);

async function openEntry(id) {
  await page.goto(`${APP}/entries/${id}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
}

// From a field's label, climb to the box that holds both the label and its
// input, so the outline frames the whole field.
async function fieldFor(label) {
  const handle = await byText(page, label);
  if (!handle) return null;
  const field = await handle.evaluateHandle(el => {
    let node = el;
    for (let i = 0; i < 8 && node.parentElement; i += 1) {
      node = node.parentElement;
      const hasControl = node.querySelector('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="switch"], [role="radiogroup"], [data-test-id*="link"], [data-test-id*="entry-card"], button');
      if (hasControl && node.getBoundingClientRect().height > 60 && node.contains(el)) return node;
    }
    return el;
  });
  return field.asElement();
}

async function capture(file, labels, opts = {}) {
  for (const label of labels) {
    const target = opts.button ? await byText(page, label, 'button, a, [role="menuitem"], [role="option"], li') : await fieldFor(label);
    if (!target) continue;
    const box = await highlight(page, target, { pad: 4 });
    await shoot(page, OUT + file, box, { band: opts.band ?? 560 });
    await clearHighlight(page);
    return true;
  }
  missed.push(`${file} (${labels.join(' / ')})`);
  console.warn('✗', file, '— not found');
  return false;
}

// ── Adding an entry ─────────────────────────────────────────────────────────
await page.goto(`${APP}/entries`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
if (await capture('c01-add-entry.jpg', ['Add entry', 'Create entry'], { button: true, band: 500 })) {
  const add = await byText(page, 'Add entry', 'button') || await byText(page, 'Create entry', 'button');
  await add.click();
  await new Promise(r => setTimeout(r, 1200));
  // Only opens the menu to show it; nothing is chosen. Typing filters the
  // menu so the item is visible; the outline must land inside the menu, not
  // on the "Campaign Item" type label in the entry list behind it.
  await page.keyboard.type('Campaign');
  await new Promise(r => setTimeout(r, 800));
  const inMenu = await page.evaluateHandle(() => {
    const popup = '[role="menu"], [role="listbox"], [role="dialog"], [data-test-id*="menu" i], [data-test-id*="popover" i], [class*="popover" i]';
    return [...document.querySelectorAll('body *')].find(el =>
      el.closest(popup) && el.offsetParent !== null &&
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim() === 'Campaign Item')) || null;
  });
  if (inMenu.asElement()) {
    const box = await highlight(page, inMenu.asElement(), { pad: 4 });
    await shoot(page, OUT + 'c02-choose-type.jpg', box, { band: 640 });
    await clearHighlight(page);
  } else {
    missed.push('c02-choose-type.jpg (Campaign Item in the menu)');
  }
  await page.keyboard.press('Escape');
}

// ── Fields, entry by entry ──────────────────────────────────────────────────
let current = null;
for (const [file, entry, labels] of FIELD_SHOTS) {
  if (entry !== current) { await openEntry(entry); current = entry; }
  await capture(file, labels);
}

// The publish control on an entry, and the whole campaign entry at a glance.
await openEntry(ENTRY.campaign);
await page.evaluate(() => window.scrollTo(0, 0));
await shoot(page, OUT + 'c00-campaign-overview.jpg');
await capture('c27-publish.jpg', ['Publish', 'Publish changes', 'Change status', 'Published'], { button: true, band: 480 });

await browser.close();
console.log(`\nDone. Screenshots in ${OUT}`);
if (missed.length) console.log('Not captured (the guide shows a placeholder):\n  ' + missed.join('\n  '));
