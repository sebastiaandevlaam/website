// The pure half of paid campaigns (Duck Drop, event tickets): reading a
// campaign out of Contentful, pricing an order, and the capacity bookkeeping.
// No I/O here, so every rule that decides what a buyer is charged or whether a
// ticket is still available is unit-tested. campaigns.js does the I/O.
//
// Capacity is counted in "units": a ticket item with unitsPerItem 4 (a family
// ticket) uses four places, a duck uses one. For a numbered campaign every unit
// also receives its own number.

// Prices and caps come from Contentful, never from the browser, so a crafted
// request cannot change what it costs. This only bounds a malformed payload.
const MAX_QUANTITY_PER_ITEM = 500;

// Stripe's minimum Checkout lifetime. The hold outlives it by a margin so a
// webhook arriving late for a session paid at the last second still finds it.
const CHECKOUT_LIFETIME_SECONDS = 31 * 60;
const HOLD_GRACE_MS = 5 * 60 * 1000;

const CAMPAIGN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

// Contentful "Integer"/"Number" fields arrive as numbers, but an editor can
// leave them empty; empty means "no cap".
function optionalCount(value) {
  const n = Number(value);
  return value === undefined || value === null || value === '' || !Number.isFinite(n) || n < 0
    ? null
    : Math.floor(n);
}

function optionalMoney(value) {
  const n = Number(value);
  return value === undefined || value === null || value === '' || !Number.isFinite(n) || n < 0
    ? null
    : Math.round(n * 100);
}

// Turns a Contentful `campaign` entry (with its items already resolved) into
// the shape the rest of this file uses. Items without a usable price are
// dropped rather than offered for free.
function normalizeCampaign(entry) {
  const f = entry?.fields || {};
  const items = (Array.isArray(f.items) ? f.items : [])
    .filter(item => item?.sys?.id && item.fields)
    .map(item => ({
      id: item.sys.id,
      name: String(item.fields.name || '').trim(),
      description: String(item.fields.description || '').trim(),
      priceCents: optionalMoney(item.fields.price),
      unitsPerItem: Math.max(1, optionalCount(item.fields.unitsPerItem) || 1),
      maxPerOrder: optionalCount(item.fields.maxPerOrder),
      totalCap: optionalCount(item.fields.totalCap),
      fairMarketValueCents: optionalMoney(item.fields.fairMarketValue),
    }))
    .filter(item => item.name && item.priceCents > 0);

  return {
    id: String(f.campaignId || '').trim(),
    name: String(f.name || '').trim(),
    numbered: /^number/i.test(String(f.campaignType || '')),
    openDate: f.openDate || null,
    closeDate: f.closeDate || null,
    totalCap: optionalCount(f.totalCap),
    reservedSpots: optionalCount(f.reservedSpots) || 0,
    maxPerOrder: optionalCount(f.maxPerOrder),
    coverFeesEnabled: f.coverFeesEnabled !== false,
    spreadsheetId: String(f.spreadsheetId || '').trim(),
    email: {
      subject: String(f.confirmationEmailSubject || '').trim(),
      body: String(f.confirmationEmailBody || ''),
      from: String(f.confirmationEmailFrom || '').trim(),
      replyTo: String(f.confirmationEmailReplyTo || '').trim(),
    },
    items,
  };
}

function isOpen(campaign, now = new Date()) {
  if (campaign.openDate && now < new Date(campaign.openDate)) return false;
  if (campaign.closeDate && now > new Date(campaign.closeDate)) return false;
  return true;
}

// Gross-up so the pantry receives the full subtotal after Stripe's 2.9% +
// $0.30, the same formula the donation form uses. Integer cents throughout,
// with the browser using the identical calculation (src/utils/campaign.js), so
// the fee a buyer sees is the fee they are charged.
function processingFeeCents(subtotalCents) {
  if (subtotalCents <= 0) return 0;
  const gross = Math.floor(((subtotalCents + 30) * 1000 + 970) / 971);
  return gross - subtotalCents;
}

// `quantities` is { [itemId]: count } straight from the request. Returns
// { order } or { error } with a message fit to show the buyer.
function priceOrder(campaign, quantities, coverFees) {
  if (!quantities || typeof quantities !== 'object') return { error: 'Please choose at least one item.' };

  const known = new Map(campaign.items.map(item => [item.id, item]));
  const lines = [];

  for (const [itemId, raw] of Object.entries(quantities)) {
    const quantity = Number(raw);
    if (raw === '' || raw === null || quantity === 0) continue;
    const item = known.get(itemId);
    if (!item) return { error: 'One of the items is no longer available. Please reload the page.' };
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY_PER_ITEM) {
      return { error: `Please enter a valid quantity for ${item.name}.` };
    }
    if (item.maxPerOrder !== null && quantity > item.maxPerOrder) {
      return { error: `You can buy up to ${item.maxPerOrder} × ${item.name} per order.` };
    }
    lines.push({
      itemId,
      name: item.name,
      quantity,
      unitPriceCents: item.priceCents,
      unitsPerItem: item.unitsPerItem,
      fairMarketValueCents: item.fairMarketValueCents,
    });
  }

  if (lines.length === 0) return { error: 'Please choose at least one item.' };

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  if (campaign.maxPerOrder !== null && itemCount > campaign.maxPerOrder) {
    return { error: `You can buy up to ${campaign.maxPerOrder} per order.` };
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const feeCents = coverFees && campaign.coverFeesEnabled ? processingFeeCents(subtotalCents) : 0;

  // Only meaningful when the campaign states a value for what the buyer gets
  // (dinner at an event); otherwise there is no tax statement to make.
  const hasFairMarketValue = lines.some(l => l.fairMarketValueCents !== null);
  const fairMarketValueCents = hasFairMarketValue
    ? lines.reduce((sum, l) => sum + l.quantity * (l.fairMarketValueCents || 0), 0)
    : null;

  return {
    order: {
      lines,
      itemCount,
      units: lines.reduce((sum, l) => sum + l.quantity * l.unitsPerItem, 0),
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      fairMarketValueCents,
    },
  };
}

// ── Capacity ────────────────────────────────────────────────────────────────
// Firestore holds one document per campaign:
//
//   { soldUnits, soldItems: { [itemId]: n }, nextNumber,
//     holds: { [orderId]: { units, items: { [itemId]: n }, expiresAt } } }
//
// A hold is taken when a checkout starts and turned into a sale by the webhook.
// Holds carry their own expiry, so one whose `checkout.session.expired` webhook
// never arrives stops counting by itself instead of locking stock away forever.

function activeHolds(state, now) {
  return Object.entries(state?.holds || {}).filter(([, hold]) => hold.expiresAt > now);
}

// What is still available. `null` means unlimited.
function availability(campaign, state, now = Date.now()) {
  const holds = activeHolds(state, now);
  const heldUnits = holds.reduce((sum, [, h]) => sum + (h.units || 0), 0);
  const soldUnits = state?.soldUnits || 0;

  const remainingUnits = campaign.totalCap === null
    ? null
    : Math.max(0, campaign.totalCap - campaign.reservedSpots - soldUnits - heldUnits);

  const items = {};
  for (const item of campaign.items) {
    const held = holds.reduce((sum, [, h]) => sum + (h.items?.[item.id] || 0), 0);
    const sold = state?.soldItems?.[item.id] || 0;
    const byItemCap = item.totalCap === null ? null : Math.max(0, item.totalCap - sold - held);
    const byTotal = remainingUnits === null ? null : Math.floor(remainingUnits / item.unitsPerItem);
    items[item.id] = byItemCap === null ? byTotal : byTotal === null ? byItemCap : Math.min(byItemCap, byTotal);
  }

  return { remainingUnits, items };
}

// Returns the new state with the hold added, or { error } when the order no
// longer fits.
function applyHold(campaign, state, orderId, order, expiresAt, now = Date.now()) {
  const available = availability(campaign, state, now);

  if (available.remainingUnits !== null && order.units > available.remainingUnits) {
    return {
      error: available.remainingUnits === 0
        ? 'Sorry, this is sold out.'
        : `Sorry, only ${available.remainingUnits} ${available.remainingUnits === 1 ? 'place is' : 'places are'} left.`,
    };
  }
  for (const line of order.lines) {
    const left = available.items[line.itemId];
    if (left !== null && left !== undefined && line.quantity > left) {
      return { error: left === 0 ? `Sorry, ${line.name} is sold out.` : `Sorry, only ${left} × ${line.name} left.` };
    }
  }

  // Expired holds are pruned on every write so the map stays small.
  const holds = Object.fromEntries(activeHolds(state, now));
  holds[orderId] = {
    units: order.units,
    items: Object.fromEntries(order.lines.map(l => [l.itemId, l.quantity])),
    expiresAt,
  };
  return { state: { ...state, holds } };
}

function releaseHold(state, orderId) {
  const holds = { ...(state?.holds || {}) };
  delete holds[orderId];
  return { ...state, holds };
}

// Converts a hold into a sale and, for a numbered campaign, hands out the next
// consecutive numbers. A sale is recorded even when its hold has lapsed — the
// buyer has paid, so the order stands; the caller logs it.
function applySale(campaign, state, orderId, order) {
  const soldItems = { ...(state?.soldItems || {}) };
  for (const line of order.lines) soldItems[line.itemId] = (soldItems[line.itemId] || 0) + line.quantity;

  let numbers = null;
  let nextNumber = state?.nextNumber || 1;
  if (campaign.numbered) {
    numbers = { first: nextNumber, count: order.units };
    nextNumber += order.units;
  }

  return {
    state: {
      ...releaseHold(state, orderId),
      soldUnits: (state?.soldUnits || 0) + order.units,
      soldItems,
      nextNumber,
    },
    numbers,
    holdLapsed: !state?.holds?.[orderId],
  };
}

// "HPS-MVZLG280-XACX": sortable by time, short enough to read over the phone.
function makeOrderId(date = new Date()) {
  const stamp = date.getTime().toString(36).toUpperCase();
  const random = require('crypto').randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `HPS-${stamp}-${random}`;
}

// ── Presentation helpers shared by the sheet, the email and the status API ──

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function numberList(numbers) {
  if (!numbers || numbers.count < 1) return [];
  return Array.from({ length: numbers.count }, (_, i) => numbers.first + i);
}

// Short lists are written out; long ones become a range so a 40-duck order
// stays one line.
function formatNumbers(numbers) {
  const list = numberList(numbers);
  if (list.length === 0) return '';
  if (list.length <= 10) return list.join(', ');
  return `${list[0]}–${list[list.length - 1]}`;
}

function orderSummaryText(order) {
  return order.lines.map(l => `${l.quantity} × ${l.name}`).join(', ');
}

module.exports = {
  CAMPAIGN_ID_PATTERN,
  CHECKOUT_LIFETIME_SECONDS,
  HOLD_GRACE_MS,
  MAX_QUANTITY_PER_ITEM,
  normalizeCampaign,
  isOpen,
  processingFeeCents,
  priceOrder,
  availability,
  applyHold,
  releaseHold,
  applySale,
  makeOrderId,
  formatMoney,
  numberList,
  formatNumbers,
  orderSummaryText,
};
