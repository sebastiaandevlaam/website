const { onRequest } = require('firebase-functions/https');
const { DONATION_HEADER, buildDonationRow } = require('./donationRow');
const { getSheetsClient, appendSheetRows, ensureHeaderRow } = require('./sheets');
const { corsMiddleware, screenRequest, capString } = require('./security');
const { escapeHtml, escapeSubject, row, mailtoCell } = require('./email');

// Donations at or above this amount (USD) always trigger a notification email,
// even when the donation reason does not have sendConfirmationEmail enabled.
const LARGE_DONATION_EMAIL_THRESHOLD = 500;

const SITE_URL = () => process.env.SITE_URL || 'https://hollistonpantryshelf.org';

// The client tells us where to send the donor after payment, and Stripe will
// redirect there from its own domain. Left unchecked, anyone can mint a session
// that sends a real donor to a page they control immediately after paying —
// the perfect setup for "just confirm your card details" phishing. Only our own
// origin is allowed; anything else silently falls back to the donate page.
function safeReturnUrl(returnUrl) {
  const fallback = `${SITE_URL()}/donate`;
  if (!returnUrl) return fallback;
  try {
    const url = new URL(returnUrl);
    const site = new URL(SITE_URL());
    const localhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.origin === site.origin || localhost) return url.origin + url.pathname;
    console.warn('Rejected off-site returnUrl:', returnUrl);
  } catch {
    console.warn('Rejected unparseable returnUrl:', returnUrl);
  }
  return fallback;
}

exports.createDonationCheckout = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    // No honeypot/timing here: a donation costs the sender real money, so spam
    // is self-limiting, and a fast repeat gift from one household is normal.
    const screened = await screenRequest(req, { checkAutomation: false });
    if (screened) return res.status(screened.status).json(screened.body);

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    try {
      const { donationAmount, processingFee, coverFees, reason, honoree, amountTagline, acknowledgement, sendConfirmationEmail, returnUrl } = req.body;

      if (!donationAmount || donationAmount < 1) {
        return res.status(400).json({ error: 'Invalid donation amount' });
      }

      const lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Holliston Pantry Shelf',
              description: buildDescription(reason, honoree),
            },
            unit_amount: Math.round(donationAmount * 100),
          },
          quantity: 1,
        },
      ];

      if (coverFees && processingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Transaction Cost Coverage',
              description: 'Covers Stripe processing fees so 100% of your donation reaches the pantry',
            },
            unit_amount: Math.round(processingFee * 100),
          },
          quantity: 1,
        });
      }

      // Stripe caps metadata values at 500 characters and rejects the whole
      // request over it, so cap here rather than letting a long note fail the
      // donation.
      const sharedMetadata = {
        reason: capString(reason || 'general'),
        honoree: capString(honoree),
        amount_tagline: capString(amountTagline),
        send_email: sendConfirmationEmail ? 'true' : 'false',
        cover_fees: coverFees ? 'true' : 'false',
        donation_amount: String(donationAmount),
        ...(acknowledgement ? {
          ack_first_name: capString(acknowledgement.firstName),
          ack_last_name: capString(acknowledgement.lastName),
          ack_street: capString(acknowledgement.streetAddress),
          ack_apt: capString(acknowledgement.apt),
          ack_city: capString(acknowledgement.city),
          ack_state: capString(acknowledgement.state),
          ack_postal: capString(acknowledgement.postalCode),
          ack_country: capString(acknowledgement.country),
          ack_notes: capString(acknowledgement.additionalText),
        } : {}),
      };

      const baseUrl = safeReturnUrl(returnUrl);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}?payment=success&amount=${donationAmount}`,
        cancel_url: baseUrl,
        metadata: sharedMetadata,
        payment_intent_data: {
          metadata: sharedMetadata,
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe error:', err);
      res.status(500).json({ error: 'Payment session creation failed' });
    }
  });
});

function buildDescription(reason, honoree) {
  if (honoree) return `${reason}: ${honoree}`;
  return 'Donation to support our neighbors in need';
}

exports.stripeWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};

    // Base donation amount (excludes any fee-coverage line item). Falls back to
    // the total paid for older donations that predate the donation_amount metadata.
    const donationAmount = Number(meta.donation_amount) || (session.amount_total / 100);
    const isLargeDonation = donationAmount >= LARGE_DONATION_EMAIL_THRESHOLD;

    const work = [appendDonationRow(session, meta)];
    if (meta.send_email === 'true' || isLargeDonation) {
      work.push(sendDonationEmail(session, meta));
    }

    // Awaited, not fire-and-forget. Cloud Functions may freeze or reclaim the
    // instance the moment the response is sent, so work left running after
    // res.json() can be killed mid-flight — silently losing the row for a
    // donation we have already taken money for. allSettled so a failed email
    // still lets the sheet write finish, and vice versa.
    const results = await Promise.allSettled(work);
    for (const result of results) {
      if (result.status === 'rejected') console.error('Webhook side-effect failed:', result.reason);
    }
  }

  res.json({ received: true });
});

async function appendDonationRow(session, meta) {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.DONATION_SHEET_ID;

  await ensureHeaderRow(sheets, spreadsheetId, DONATION_HEADER);
  await appendSheetRows(sheets, spreadsheetId, [buildDonationRow(session, meta)]);
}

async function sendDonationEmail(session, meta) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const donorName = session.customer_details?.name || '—';
  const donorEmail = session.customer_details?.email || '—';
  const amountPaid = (session.amount_total / 100).toFixed(2);

  const ackRows = [
    meta.ack_first_name || meta.ack_last_name
      ? row('Acknowledgement name', `${meta.ack_first_name || ''} ${meta.ack_last_name || ''}`.trim())
      : '',
    row('Street', meta.ack_street),
    row('Apt / Unit', meta.ack_apt),
    row('City', meta.ack_city),
    row('State', meta.ack_state),
    row('Postal code', meta.ack_postal),
    row('Country', meta.ack_country),
    row('Notes', meta.ack_notes),
  ].join('');

  const html = `
    <h2 style="font-family:sans-serif;color:#A00405">New Donation Received</h2>
    <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">
      ${row('Donor name', donorName)}
      ${row('Donor email', mailtoCell(donorEmail), { html: true })}
      ${row('Amount paid', `$${amountPaid}`)}
      ${row('Reason', meta.reason)}
      ${row('Honoree', meta.honoree)}
      ${row('Amount note', meta.amount_tagline)}
      ${ackRows}
    </table>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: process.env.DONATION_EMAIL_TO,
    subject: escapeSubject(`New Donation — $${amountPaid} from ${donorName}`),
    html,
  });
}

// Exported for tests.
exports._internal = { safeReturnUrl, buildDescription, escapeHtml };
