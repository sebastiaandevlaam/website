// Paid campaigns — the Duck Drop, event tickets, and anything else sold as a
// list of priced items from a Contentful `campaign` entry.
//
//   createCampaignCheckout   POST  prices the order from Contentful, holds the
//                                  stock in Firestore, opens Stripe Checkout
//   cancelCampaignCheckout   POST  buyer came back from Stripe without paying
//   getCampaignAvailability  GET   what is left, for the form to show
//   getCampaignOrder         GET   the paid order, for the thank-you page
//   handleCampaignCheckoutEvent    called by stripeWebhook (donations.js)
//
// Products exist only in Contentful; Stripe gets inline price_data, so there is
// nothing to keep in sync in the Stripe dashboard. Firestore is the source of
// truth for what is held and sold. The Admin SDK bypasses security rules, and
// the rules are shared with the shopper apps in this project — never deploy
// rules from this repo.
//
// The rules about prices and capacity live in campaignOrder.js.

const { onRequest } = require('firebase-functions/https');
const { formatDateEastern } = require('./donationRow');
const {
  CAMPAIGN_ID_PATTERN,
  CHECKOUT_LIFETIME_SECONDS,
  HOLD_GRACE_MS,
  normalizeCampaign,
  isOpen,
  priceOrder,
  availability,
  applyHold,
  releaseHold,
  applySale,
  makeOrderId,
  numberList,
} = require('./campaignOrder');
const { headerFor, buildCampaignRows } = require('./campaignRow');
const { renderCampaignEmail } = require('./campaignEmail');
const { getSheetsClient, appendSheetRows, ensureHeaderRow } = require('./sheets');
const { sendEmail } = require('./mailer');
const { corsMiddleware, screenRequest, capString, safeReturnUrl } = require('./security');
const { isValidUsPhone, formatUsPhone } = require('./phone');

// Prefixed: this Firestore database is shared with the shopper apps.
const CAMPAIGNS = 'websiteCampaigns';
const ORDERS = 'websiteCampaignOrders';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

// ── Firestore ───────────────────────────────────────────────────────────────

let firestore;
function db() {
  if (!firestore) {
    const { initializeApp, getApps } = require('firebase-admin/app');
    if (getApps().length === 0) initializeApp();
    firestore = require('firebase-admin/firestore').getFirestore();
    // An optional field left undefined must not fail a paid order's write.
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

// ── Contentful ──────────────────────────────────────────────────────────────
// Fetched server-side with the same read-only delivery token the site uses.
// The browser sends only a campaign id and quantities; everything that decides
// a price comes from here.

const campaignCache = new Map();

async function fetchCampaign(campaignId, { maxAgeMs = 0 } = {}) {
  if (!CAMPAIGN_ID_PATTERN.test(campaignId || '')) return null;

  const cached = campaignCache.get(campaignId);
  if (cached && Date.now() - cached.at < maxAgeMs) return cached.campaign;

  const space = process.env.CONTENTFUL_SPACE_ID;
  const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master';
  const token = process.env.CONTENTFUL_DELIVERY_TOKEN;
  if (!space || !token) throw new Error('CONTENTFUL_SPACE_ID / CONTENTFUL_DELIVERY_TOKEN are not set.');

  const url = new URL(`https://cdn.contentful.com/spaces/${space}/environments/${environment}/entries`);
  url.searchParams.set('content_type', 'campaign');
  url.searchParams.set('fields.campaignId', campaignId);
  url.searchParams.set('include', '1');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Contentful responded ${response.status}`);
  const data = await response.json();

  const entry = data.items?.[0];
  if (!entry) return null;

  // Resolve the item links from `includes`. An unpublished item is simply
  // absent there, and so is not for sale.
  const included = new Map((data.includes?.Entry || []).map(e => [e.sys.id, e]));
  const items = (entry.fields?.items || []).map(link => included.get(link?.sys?.id)).filter(Boolean);
  const campaign = normalizeCampaign({ ...entry, fields: { ...entry.fields, items } });

  campaignCache.set(campaignId, { at: Date.now(), campaign });
  return campaign;
}

// ── Checkout ────────────────────────────────────────────────────────────────

function sanitizeCheckout(body) {
  const quantities = {};
  if (body.quantities && typeof body.quantities === 'object') {
    for (const [id, qty] of Object.entries(body.quantities).slice(0, 50)) {
      quantities[capString(id, 64)] = qty;
    }
  }
  return {
    campaignId: capString(body.campaignId, 60),
    quantities,
    coverFees: body.coverFees === true,
    returnUrl: capString(body.returnUrl, 500),
    buyer: {
      firstName: capString(body.firstName, 100).trim(),
      lastName: capString(body.lastName, 100).trim(),
      email: capString(body.email, 200).trim(),
      phone: capString(body.phone, 40).trim(),
    },
  };
}

function validateBuyer(buyer) {
  if (!buyer.firstName || !buyer.lastName) return 'Please enter your first and last name.';
  if (!EMAIL_PATTERN.test(buyer.email)) return 'Please enter a valid email address.';
  if (!isValidUsPhone(buyer.phone)) return 'Please enter a valid US phone number.';
  return null;
}

exports.createCampaignCheckout = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Automation checks stay on here, unlike donations: a bot that opens
    // checkouts it never pays for holds real stock for half an hour.
    const screened = await screenRequest(req);
    if (screened) return res.status(screened.status).json(screened.body);

    const input = sanitizeCheckout(req.body || {});
    const buyerError = validateBuyer(input.buyer);
    if (buyerError) return res.status(400).json({ error: buyerError });

    let campaign;
    try {
      campaign = await fetchCampaign(input.campaignId);
    } catch (err) {
      console.error('Campaign lookup failed:', err);
      return res.status(503).json({ error: 'We could not start checkout right now. Please try again shortly.' });
    }
    if (!campaign) return res.status(404).json({ error: 'This campaign could not be found.' });
    if (!isOpen(campaign)) return res.status(400).json({ error: 'Sorry, sales for this are closed.' });

    const priced = priceOrder(campaign, input.quantities, input.coverFees);
    if (priced.error) return res.status(400).json({ error: priced.error });
    const { order } = priced;

    const now = Date.now();
    const orderId = makeOrderId(new Date(now));
    const expiresAtSeconds = Math.floor(now / 1000) + CHECKOUT_LIFETIME_SECONDS;
    const holdExpiresAt = expiresAtSeconds * 1000 + HOLD_GRACE_MS;

    const buyer = { ...input.buyer, phone: formatUsPhone(input.buyer.phone) };
    const campaignRef = db().collection(CAMPAIGNS).doc(campaign.id);
    const orderRef = db().collection(ORDERS).doc(orderId);

    // Hold the stock before sending anyone to Stripe, so two buyers racing for
    // the last ticket cannot both pay for it.
    let holdError;
    try {
      await db().runTransaction(async tx => {
        const snapshot = await tx.get(campaignRef);
        const result = applyHold(campaign, snapshot.data() || {}, orderId, order, holdExpiresAt, now);
        if (result.error) { holdError = result.error; return; }
        holdError = null;
        tx.set(campaignRef, result.state);
        tx.set(orderRef, {
          orderId,
          campaignId: campaign.id,
          // A snapshot of what the email and sheet need, so the webhook does
          // not depend on Contentful being reachable when the payment lands.
          campaign: {
            name: campaign.name,
            numbered: campaign.numbered,
            spreadsheetId: campaign.spreadsheetId,
            email: campaign.email,
          },
          status: 'pending',
          buyer,
          order,
          numbers: null,
          createdAt: now,
        });
      });
    } catch (err) {
      console.error('Campaign hold failed:', err);
      return res.status(503).json({ error: 'We could not start checkout right now. Please try again shortly.' });
    }
    if (holdError) return res.status(409).json({ error: holdError });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const lineItems = order.lines.map(l => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `${campaign.name} — ${l.name}` },
        unit_amount: l.unitPriceCents,
      },
      quantity: l.quantity,
    }));
    if (order.feeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Transaction Cost Coverage',
            description: 'Covers Stripe processing fees so 100% of your purchase reaches the pantry',
          },
          unit_amount: order.feeCents,
        },
        quantity: 1,
      });
    }

    const metadata = { campaign_order_id: orderId, campaign_id: campaign.id };
    const baseUrl = safeReturnUrl(input.returnUrl, '/');

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: buyer.email,
        client_reference_id: orderId,
        expires_at: expiresAtSeconds,
        // Stripe substitutes the real id, which the thank-you page uses to
        // look the order up.
        success_url: `${baseUrl}?order=success&session_id={CHECKOUT_SESSION_ID}`,
        // The order id lets the page release the hold at once (see
        // cancelCampaignCheckout) instead of when the session times out.
        cancel_url: `${baseUrl}?order=cancelled&ref=${orderId}`,
        metadata,
        payment_intent_data: { metadata, description: `${campaign.name} — ${orderId}` },
      });

      await orderRef.update({ stripeSessionId: session.id });
      res.json({ url: session.url });
    } catch (err) {
      console.error('Campaign checkout error:', err);
      // Give the stock back straight away rather than holding it for nothing.
      await db().runTransaction(async tx => {
        const snapshot = await tx.get(campaignRef);
        tx.set(campaignRef, releaseHold(snapshot.data() || {}, orderId));
        tx.update(orderRef, { status: 'failed' });
      }).catch(releaseErr => console.error('Releasing hold failed:', releaseErr));
      res.status(500).json({ error: 'Payment session creation failed. Please try again.' });
    }
  });
});

// ── Webhook ─────────────────────────────────────────────────────────────────

// Runs `work` at most once per order, even when Stripe delivers the same event
// twice at the same moment. Throws when another delivery is mid-way, so this
// one answers 500 and Stripe retries it later, by which time the step is done.
async function once(orderRef, step, work) {
  const doneField = `${step}DoneAt`;
  const claimField = `${step}ClaimedAt`;

  const state = await db().runTransaction(async tx => {
    const data = (await tx.get(orderRef)).data() || {};
    if (data[doneField]) return 'done';
    if (data[claimField] && Date.now() - data[claimField] < 2 * 60 * 1000) return 'busy';
    tx.update(orderRef, { [claimField]: Date.now() });
    return 'claimed';
  });
  if (state === 'done') return;
  if (state === 'busy') throw new Error(`${step} for ${orderRef.id} is already in progress`);

  try {
    await work();
    await orderRef.update({ [doneField]: Date.now(), [claimField]: null });
  } catch (err) {
    await orderRef.update({ [claimField]: null }).catch(() => {});
    throw err;
  }
}

async function markPaid(orderId, session) {
  const orderRef = db().collection(ORDERS).doc(orderId);

  return db().runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error(`No campaign order ${orderId}`);
    const record = orderSnap.data();
    if (record.status === 'paid') return record;

    const campaignRef = db().collection(CAMPAIGNS).doc(record.campaignId);
    const campaignSnap = await tx.get(campaignRef);
    const sale = applySale(record.campaign, campaignSnap.data() || {}, orderId, record.order);
    if (sale.holdLapsed) {
      console.warn(`Order ${orderId} was paid after its hold lapsed; recorded anyway, check capacity.`);
    }

    const paid = {
      ...record,
      status: 'paid',
      paidAt: Date.now(),
      numbers: sale.numbers,
      stripeSessionId: session.id,
      amountPaidCents: session.amount_total,
    };
    tx.set(campaignRef, sale.state);
    tx.set(orderRef, paid);
    return paid;
  });
}

async function markExpired(orderId) {
  const orderRef = db().collection(ORDERS).doc(orderId);
  await db().runTransaction(async tx => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists || orderSnap.data().status !== 'pending') return;
    const campaignRef = db().collection(CAMPAIGNS).doc(orderSnap.data().campaignId);
    const campaignSnap = await tx.get(campaignRef);
    tx.set(campaignRef, releaseHold(campaignSnap.data() || {}, orderId));
    tx.update(orderRef, { status: 'expired' });
  });
}

// Every step is idempotent, so a throw here (answered with a 500) is safe for
// Stripe to retry: a paid order is never counted twice, the sheet row is never
// written twice, and the buyer never gets two emails.
async function handleCampaignCheckoutEvent(event) {
  const session = event.data.object;
  const orderId = session.metadata?.campaign_order_id;

  if (event.type === 'checkout.session.expired') return markExpired(orderId);
  if (event.type !== 'checkout.session.completed') return;
  if (session.payment_status !== 'paid') {
    console.warn(`Campaign session ${session.id} completed unpaid (${session.payment_status}); ignored.`);
    return;
  }

  const record = await markPaid(orderId, session);
  const orderRef = db().collection(ORDERS).doc(orderId);

  // Sheet and email are independent: one failing must not stop the other.
  // The sheet is optional — Firestore always holds the full order — and the
  // id is snapshotted at checkout, so adding one later applies to new orders.
  const results = await Promise.allSettled([
    record.campaign.spreadsheetId && once(orderRef, 'sheet', async () => {
      const sheets = getSheetsClient();
      await ensureHeaderRow(sheets, record.campaign.spreadsheetId, headerFor(record));
      await appendSheetRows(sheets, record.campaign.spreadsheetId, buildCampaignRows(record, formatDateEastern));
    }),
    once(orderRef, 'email', async () => {
      const { subject, html } = renderCampaignEmail(record);
      await sendEmail({
        to: record.buyer.email,
        from: record.campaign.email?.from,
        replyTo: record.campaign.email?.replyTo,
        subject,
        html,
      });
    }),
  ]);

  const failures = results.filter(r => r.status === 'rejected').map(r => r.reason);
  if (failures.length) {
    failures.forEach(err => console.error(`Campaign order ${orderId} side-effect failed:`, err));
    throw failures[0];
  }
}

// The buyer pressed "back" on Stripe. Expiring the session makes it unpayable
// and frees its stock now instead of in half an hour. Knowing an order id only
// lets someone cancel an unpaid checkout that is theirs to begin with — and
// the id only ever appears in that buyer's own cancel URL.
exports.cancelCampaignCheckout = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const orderId = capString(req.body?.orderId, 40);
    if (!/^HPS-[0-9A-Z]+-[0-9A-F]{4}$/.test(orderId)) return res.status(400).json({ error: 'Invalid order' });
    try {
      const snapshot = await db().collection(ORDERS).doc(orderId).get();
      const record = snapshot.data();
      if (!record || record.status !== 'pending') return res.json({ ok: true });
      if (record.stripeSessionId) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // Throws if the session was completed in the meantime, in which case
        // the order must stand — so only release after this succeeds.
        await stripe.checkout.sessions.expire(record.stripeSessionId);
      }
      await markExpired(orderId);
      res.json({ ok: true });
    } catch (err) {
      console.warn(`Cancel of ${orderId} skipped:`, err.message);
      res.json({ ok: true });
    }
  });
});

// ── Read endpoints ──────────────────────────────────────────────────────────
// GET, no App Check or rate limit: they write nothing, and the thank-you page
// polls the order endpoint while the webhook catches up.

exports.getCampaignAvailability = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    try {
      // Cached briefly: every visitor to the page asks.
      const campaign = await fetchCampaign(String(req.query.campaign || ''), { maxAgeMs: 30 * 1000 });
      if (!campaign) return res.status(404).json({ error: 'Not found' });
      const snapshot = await db().collection(CAMPAIGNS).doc(campaign.id).get();
      const { remainingUnits, items } = availability(campaign, snapshot.data() || {});
      res.set('Cache-Control', 'no-store');
      res.json({ open: isOpen(campaign), remainingUnits, items });
    } catch (err) {
      console.error('Availability error:', err);
      res.status(500).json({ error: 'Unavailable' });
    }
  });
});

// The session id is an unguessable Stripe token that only the buyer's browser
// received, so it is enough to show them their own first name and numbers.
exports.getCampaignOrder = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
    const sessionId = String(req.query.session || '');
    if (!SESSION_ID_PATTERN.test(sessionId)) return res.status(400).json({ error: 'Invalid session' });
    try {
      const result = await db().collection(ORDERS).where('stripeSessionId', '==', sessionId).limit(1).get();
      if (result.empty) return res.status(404).json({ error: 'Not found' });
      const record = result.docs[0].data();
      res.set('Cache-Control', 'no-store');
      res.json({
        status: record.status,
        orderId: record.orderId,
        firstName: record.buyer.firstName,
        email: record.buyer.email,
        numbers: numberList(record.numbers),
        lines: record.order.lines.map(l => ({ name: l.name, quantity: l.quantity })),
        totalCents: record.amountPaidCents ?? record.order.totalCents,
      });
    } catch (err) {
      console.error('Order lookup error:', err);
      res.status(500).json({ error: 'Unavailable' });
    }
  });
});

exports.handleCampaignCheckoutEvent = handleCampaignCheckoutEvent;
exports._internal = { sanitizeCheckout, validateBuyer };
