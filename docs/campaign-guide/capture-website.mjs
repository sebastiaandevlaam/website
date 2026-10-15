// Captures the visitor-side screenshots for the campaign guide from the live
// test page (/duck-drop-test), plus the Stripe checkout page, the buyer email
// and an example sheet.
//
//   node docs/campaign-guide/capture-website.mjs
//
// States that are hard to reach for real (sold out, closed, a paid order, a
// ticket campaign) are produced by rewriting the Contentful and function
// responses in the browser only — nothing is changed in Contentful or
// Firestore. The Stripe step opens a real checkout session for the test
// campaign and then cancels it, which releases it straight away; no payment is
// made.
//
// Output: GUIDE_SCREENS (default: ./screens next to this file).

import { createRequire } from 'module';
import { highlight, clearHighlight, shoot, byText } from './annotate.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('../../node_modules/puppeteer-core');
const { renderCampaignEmail } = require('../../functions/campaignEmail.js');
const { priceOrder, normalizeCampaign } = require('../../functions/campaignOrder.js');
const { NUMBERED_HEADER, TICKETS_HEADER, buildCampaignRows } = require('../../functions/campaignRow.js');
const { formatDateEastern } = require('../../functions/donationRow.js');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SITE = 'https://hollistonpantryshelf.org/duck-drop-test';
const FUNCTIONS = 'us-east1-holliston-pantry-shelf.cloudfunctions.net';
const OUT = (process.env.GUIDE_SCREENS || new URL('./screens/', import.meta.url).pathname).replace(/\/?$/, '/');
const STRIPE = !process.argv.includes('--no-stripe');

const BUYER = { first: 'Jane', last: 'Example', email: 'jane@example.com', phone: '5085550123' };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let page = await browser.newPage();
await page.setViewport({ width: 1100, height: 860, deviceScaleFactor: 1 });

// ── Response rewriting ──────────────────────────────────────────────────────
let patchContent = null;   // (json) => void, mutates the Contentful page response
let mockFunctions = {};    // { getCampaignAvailability: obj, getCampaignOrder: obj }

// Installed after the Stripe step: intercepting Stripe's own requests stalls
// its checkout page.
async function startIntercepting() {
await page.setRequestInterception(true);
page.on('request', async req => {
  const url = new URL(req.url());
  try {
    if (url.hostname === 'cdn.contentful.com' && patchContent && url.searchParams.get('content_type') === 'page') {
      const upstream = await fetch(req.url(), { headers: req.headers() });
      const json = await upstream.json();
      patchContent(json);
      return req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(json) });
    }
    const fn = url.pathname.slice(1);
    if (url.hostname === FUNCTIONS && mockFunctions[fn]) {
      return req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(mockFunctions[fn]) });
    }
  } catch (err) {
    console.warn('intercept failed, passing through:', err.message);
  }
  req.continue();
});
}

const entriesOf = (json, type) => (json.includes?.Entry || []).filter(e => e.sys.contentType.sys.id === type);
const campaignOf = (json) => entriesOf(json, 'campaign')[0];

async function open(url = SITE) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  // The sticky header would cover the form in every scrolled screenshot.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if (pos === 'sticky' || pos === 'fixed') el.style.position = 'static';
    }
  });
  await new Promise(r => setTimeout(r, 400));
}

async function mark(handleOrSelector, file, opts) {
  const handle = typeof handleOrSelector === 'string' ? await page.$(handleOrSelector) : handleOrSelector;
  if (!handle) { console.warn('✗ not found for', file); return; }
  const box = await highlight(page, handle);
  await shoot(page, OUT + file, box, opts);
  await clearHighlight(page);
}

// ── 1. The order form ───────────────────────────────────────────────────────
await open();
await page.evaluate(() => window.scrollTo(0, 0));
await shoot(page, OUT + 'w01-page.jpg');

await page.click('[aria-label="One more Duck"]');
await mark('[aria-label="One more Duck"]', 'w02-quantity.jpg');

await page.type('#campaign-first-name', BUYER.first);
await page.type('#campaign-last-name', BUYER.last);
await page.type('#campaign-email', BUYER.email);
await page.type('#campaign-phone', BUYER.phone);
await page.click('#campaign-email');
const details = await page.evaluateHandle(() => document.querySelector('#campaign-first-name').closest('fieldset'));
await mark(details.asElement(), 'w03-details.jpg', { band: 640 });

const fee = await page.evaluateHandle(() => document.querySelector('.campaign-form .form-checkbox').closest('label'));
await mark(fee.asElement(), 'w04-fee.jpg');
await mark('.campaign-form .form-submit', 'w05-continue.jpg');

// ── 2. Stripe checkout (real session, cancelled straight after) ──────────────
if (STRIPE) {
  // The server refuses forms filled in under 3 seconds.
  await new Promise(r => setTimeout(r, 3500));
  // The page navigates to Stripe from inside the click handler, which can
  // detach the frame before click() returns; wait on the URL instead.
  await page.$eval('.campaign-form .form-submit', b => b.click()).catch(() => {});
  await page.waitForFunction(() => location.hostname === 'checkout.stripe.com', { timeout: 45000 }).catch(() => {});
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  if (page.url().includes('checkout.stripe.com')) {
    await page.screenshot({ path: OUT + 'w06-stripe.jpg', type: 'jpeg', quality: 82, captureBeyondViewport: false });
    console.log('✓ w06-stripe.jpg');
    const back = await page.$('a[href*="order=cancelled"]');
    if (back) {
      await mark(back, 'w07-stripe-back.jpg', { band: 400 });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 }), back.click()]);
      await new Promise(r => setTimeout(r, 1500));
      console.log('  returned to', new URL(page.url()).pathname, '(checkout cancelled)');
    } else {
      console.warn('✗ Stripe back link not found; the session will expire by itself in 30 minutes');
    }
  } else {
    console.warn('✗ did not reach Stripe:', page.url());
  }
}

await startIntercepting();

// ── 3. Live stock: "Only 7 left" ────────────────────────────────────────────
const itemId = await fetch(`https://${FUNCTIONS}/getCampaignAvailability?campaign=duck-drop-test`)
  .then(r => r.json()).then(d => Object.keys(d.items || {})[0]);

mockFunctions = { getCampaignAvailability: { open: true, remainingUnits: 7, items: { [itemId]: 7 } } };
await open();
await mark(await byText(page, '· Only 7 left'), 'w08-low-stock.jpg', { band: 420 });

// ── 4. Sold out and closed ──────────────────────────────────────────────────
mockFunctions = { getCampaignAvailability: { open: true, remainingUnits: 0, items: { [itemId]: 0 } } };
patchContent = json => {
  campaignOf(json).fields.soldOutMessage = 'All our ducks have been adopted — thank you! See you at **Lake Winthrop on Sunday, May 2** for the big drop.';
};
await open();
await mark('.campaign-section .form-callout', 'w09-sold-out.jpg', { band: 420 });

mockFunctions = {};
patchContent = json => {
  Object.assign(campaignOf(json).fields, {
    closeDate: '2020-01-01T00:00:00Z',
    closedMessage: 'Duck adoptions are closed for this year. Thank you to everyone who took part!',
  });
};
await open();
await mark('.campaign-section .form-callout', 'w10-closed.jpg', { band: 420 });

// ── 5. Thank-you page after payment ─────────────────────────────────────────
patchContent = json => {
  Object.assign(campaignOf(json).fields, {
    successBody: 'The ducks drop on **Sunday, May 2** at Lake Winthrop. Winners are called the same day. Good luck!',
  });
};
mockFunctions = {
  getCampaignOrder: {
    status: 'paid', orderId: 'HPS-MVZLG280-1A2B', firstName: 'Jane', email: BUYER.email,
    numbers: [101, 102], lines: [{ name: 'Duck', quantity: 2 }], totalCents: 2091,
  },
};
await open(`${SITE}?order=success&session_id=cs_live_guideexample0000000`);
await page.evaluate(() => window.scrollTo(0, 0));
await mark('.campaign-confirmation', 'w11-thank-you.jpg', { band: 700 });

// ── 6. A ticket campaign (same page, ticket items swapped in) ───────────────
const ticketItems = [
  { id: 'example-adult', name: 'Adult ticket', description: 'Dinner and dessert included', price: 40 },
  { id: 'example-family', name: 'Family ticket', description: 'Admits 2 adults and 2 children', price: 100, unitsPerItem: 4 },
  { id: 'example-child', name: 'Child (under 12)', description: '', price: 15 },
];
patchContent = json => {
  const campaign = campaignOf(json);
  campaign.fields.campaignType = 'Tickets';
  campaign.fields.items = ticketItems.map(i => ({ sys: { type: 'Link', linkType: 'Entry', id: i.id } }));
  json.includes.Entry.push(...ticketItems.map(({ id, ...fields }) => ({
    sys: { id, type: 'Entry', contentType: { sys: { id: 'campaignItem' } } }, fields,
  })));
  Object.assign(entriesOf(json, 'sectionCampaign')[0].fields, {
    title: 'Spring Gala Tickets',
    introText: 'Join us for dinner and music on **Saturday, February 20** at Holliston Town Hall.',
  });
};
mockFunctions = {
  getCampaignAvailability: { open: true, remainingUnits: 40, items: { 'example-adult': 40, 'example-family': 6, 'example-child': 0 } },
};
await open();
await page.evaluate(() => window.scrollTo(0, 0));
await shoot(page, OUT + 'w12-tickets.jpg');

// ── 7. The buyer email and the sheet, rendered from the real code ───────────
const ducks = normalizeCampaign({ fields: { campaignId: 'duck-drop-2027', name: 'Duck Drop 2027', campaignType: 'Numbered',
  items: [{ sys: { id: 'duck' }, fields: { name: 'Duck', price: 10 } }, { sys: { id: 'pack' }, fields: { name: '5-pack', price: 40, unitsPerItem: 5 } }] } });
const record = (quantities, numbers, buyer, minutes) => {
  const { order } = priceOrder(ducks, quantities, true);
  return {
    orderId: `HPS-MVZLG${280 + minutes}-${(1000 + minutes * 7).toString(16).toUpperCase()}`,
    campaign: { name: ducks.name, numbered: true, email: {
      subject: 'Your ducks for {campaignName}',
      body: 'Hi {firstName},\n\nThank you for adopting {count} duck(s) in the **{campaignName}**!\n\n{orderSummary}\n\nYour duck numbers: **{numbers}**\n\nThe ducks drop on **Sunday, May 2** at Lake Winthrop. Your order number is {orderId}. Questions? Just reply to this email.',
    } },
    buyer, order, numbers, amountPaidCents: order.totalCents,
    paidAt: Date.parse('2027-04-02T14:00:00Z') + minutes * 60000, stripeSessionId: `cs_live_a1B2c3D4e5${minutes}`,
  };
};
const jane = { firstName: 'Jane', lastName: 'Example', email: 'jane@example.com', phone: '(508) 555-0123' };
const email = renderCampaignEmail(record({ duck: 2 }, { first: 101, count: 2 }, jane, 0));

// A fresh tab: the live page keeps connections open, which stalls setContent.
await page.close();
page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;background:#eef0f3;font-family:Arial,sans-serif">
  <div style="max-width:720px;margin:24px auto;background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.12);overflow:hidden">
    <div style="padding:18px 28px;border-bottom:1px solid #e3e5e8;font-size:14px;color:#444;line-height:1.7">
      <div style="font-size:20px;color:#202124;margin-bottom:6px">${email.subject}</div>
      <div><b>Holliston Pantry Shelf</b> &lt;website@hollistonpantryshelf.org&gt;</div>
      <div>to jane@example.com</div>
    </div>
    <div style="padding:20px 28px 28px">${email.html}</div>
  </div></body></html>`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const emailHeight = await page.evaluate(() => document.querySelector('body > div').offsetHeight + 24);
await page.setViewport({ width: 900, height: emailHeight + 24, deviceScaleFactor: 1 });
await page.screenshot({ path: OUT + 'w13-email.jpg', type: 'jpeg', quality: 85 });
console.log('✓ w13-email.jpg');

const sheetRows = [
  ...buildCampaignRows(record({ duck: 2 }, { first: 101, count: 2 }, jane, 0), formatDateEastern),
  ...buildCampaignRows(record({ pack: 1 }, { first: 103, count: 5 }, { firstName: 'Sam', lastName: 'Rivera', email: 'sam.rivera@example.com', phone: '(508) 555-0177' }, 9), formatDateEastern),
  ...buildCampaignRows(record({ duck: 1 }, { first: 108, count: 1 }, { firstName: 'Lee', lastName: 'Chen', email: 'lee.chen@example.com', phone: '(774) 555-0142' }, 23), formatDateEastern),
];
await renderSheet(NUMBERED_HEADER, sheetRows, 'w14-sheet-ducks.jpg');

function letters(n) { let s = ''; while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); } return s; }
async function renderSheet(header, rows, file) {
  const cell = 'border:1px solid #e1e3e6;padding:4px 8px;white-space:nowrap;font-size:13px';
  const head = `<tr><th style="${cell};background:#f8f9fa;color:#5f6368;width:28px"></th>${header.map((_, i) => `<th style="${cell};background:#f8f9fa;color:#5f6368;font-weight:400">${letters(i + 1)}</th>`).join('')}</tr>`;
  const body = [header, ...rows].map((r, i) => `<tr><td style="${cell};background:#f8f9fa;color:#5f6368;text-align:center">${i + 1}</td>${r.map(v => `<td style="${cell};${i === 0 ? 'font-weight:700;border-bottom:2px solid #9aa0a6' : ''};${typeof v === 'number' ? 'text-align:right' : ''}">${v}</td>`).join('')}</tr>`).join('');
  await page.setViewport({ width: 1600, height: 400, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;padding:12px;background:#fff;font-family:Arial,sans-serif"><table style="border-collapse:collapse">${head}${body}</table></body></html>`);
  const size = await page.evaluate(() => { const t = document.querySelector('table'); return { w: t.offsetWidth + 24, h: t.offsetHeight + 24 }; });
  await page.setViewport({ width: Math.min(size.w, 1600), height: size.h, deviceScaleFactor: 1 });
  await page.screenshot({ path: OUT + file, type: 'jpeg', quality: 88 });
  console.log('✓', file);
}

// Ticket sheet: one row per order.
const gala = normalizeCampaign({ fields: { campaignId: 'gala', name: 'Spring Gala', campaignType: 'Tickets', items: [
  { sys: { id: 'a' }, fields: { name: 'Adult ticket', price: 40, fairMarketValue: 25 } },
  { sys: { id: 'f' }, fields: { name: 'Family ticket', price: 100, unitsPerItem: 4, fairMarketValue: 60 } }] } });
const ticket = (q, buyer, minutes) => {
  const { order } = priceOrder(gala, q, true);
  return { orderId: `HPS-MW01K${100 + minutes}-${(2000 + minutes).toString(16).toUpperCase()}`, campaign: { numbered: false }, buyer, order,
    amountPaidCents: order.totalCents, paidAt: Date.parse('2027-01-12T15:00:00Z') + minutes * 60000, stripeSessionId: `cs_live_Z9y8X7w6${minutes}` };
};
await renderSheet(TICKETS_HEADER, [
  ...buildCampaignRows(ticket({ a: 2 }, jane, 0), formatDateEastern),
  ...buildCampaignRows(ticket({ f: 1, a: 1 }, { firstName: 'Sam', lastName: 'Rivera', email: 'sam.rivera@example.com', phone: '(508) 555-0177' }, 14), formatDateEastern),
], 'w15-sheet-tickets.jpg');

await browser.close();
console.log('\nScreenshots in', OUT);
