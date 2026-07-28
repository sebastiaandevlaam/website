const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/https');
const cors = require('cors')({ origin: true });
const { DONATION_HEADER, buildDonationRow } = require('./donationRow');

setGlobalOptions({ maxInstances: 10, region: 'us-east1' });

exports.createDonationCheckout = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const SITE_URL = process.env.SITE_URL || 'https://hollistonpantryshelf.org';

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

      const sharedMetadata = {
        reason: reason || 'general',
        honoree: honoree || '',
        amount_tagline: amountTagline || '',
        send_email: sendConfirmationEmail ? 'true' : 'false',
        cover_fees: coverFees ? 'true' : 'false',
        ...(acknowledgement ? {
          ack_first_name: acknowledgement.firstName || '',
          ack_last_name: acknowledgement.lastName || '',
          ack_street: acknowledgement.streetAddress || '',
          ack_apt: acknowledgement.apt || '',
          ack_city: acknowledgement.city || '',
          ack_state: acknowledgement.state || '',
          ack_postal: acknowledgement.postalCode || '',
          ack_country: acknowledgement.country || '',
          ack_notes: acknowledgement.additionalText || '',
        } : {}),
      };

      const baseUrl = returnUrl || `${SITE_URL}/donate`;
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

exports.stripeWebhook = onRequest((req, res) => {
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

    appendDonationRow(session, meta).catch(err => console.error('Sheets error:', err));

    if (meta.send_email === 'true') {
      sendDonationEmail(session, meta).catch(err => console.error('Resend error:', err));
    }
  }

  res.json({ received: true });
});

async function appendDonationRow(session, meta) {
  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.DONATION_SHEET_ID;

  await ensureHeaderRow(sheets, spreadsheetId);

  const row = buildDonationRow(session, meta);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// Writes the header row once if the sheet is still empty, so the first
// donation doesn't land in row 1 without column titles.
async function ensureHeaderRow(sheets, spreadsheetId) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A1:R1',
  });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [DONATION_HEADER] },
    });
  }
}

async function sendDonationEmail(session, meta) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const donorName = session.customer_details?.name || '—';
  const donorEmail = session.customer_details?.email || '—';
  const amountPaid = (session.amount_total / 100).toFixed(2);

  const row = (label, value) => value
    ? `<tr><td style="padding:6px 12px 6px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>`
    : '';

  const ackRows = [
    meta.ack_first_name || meta.ack_last_name
      ? row('Acknowledgement name', `${meta.ack_first_name} ${meta.ack_last_name}`.trim())
      : '',
    row('Street', meta.ack_street),
    meta.ack_apt ? row('Apt / Unit', meta.ack_apt) : '',
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
      ${row('Donor email', `<a href="mailto:${donorEmail}">${donorEmail}</a>`)}
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
    subject: `New Donation — $${amountPaid} from ${donorName}`,
    html,
  });
}

exports.submitVolunteerApplication = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { firstName, lastName, email, phone, contactTimes, opportunities, availability, languages, isStudent } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const formatList = (arr) => arr?.length ? arr.join(', ') : '—';

    const html = `
      <h2>New Volunteer Application</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:15px;">
        <tr><td><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td><strong>Phone</strong></td><td>${phone}</td></tr>
        <tr><td><strong>Best time to reach</strong></td><td>${formatList(contactTimes)}</td></tr>
        <tr><td><strong>Opportunities</strong></td><td>${formatList(opportunities)}</td></tr>
        <tr><td><strong>Availability</strong></td><td>${formatList(availability)}</td></tr>
        <tr><td><strong>Languages</strong></td><td>${languages || '—'}</td></tr>
        <tr><td><strong>Student</strong></td><td>${isStudent || '—'}</td></tr>
      </table>
    `;

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.VOLUNTEER_EMAIL_TO,
        subject: `New Volunteer Application — ${firstName} ${lastName}`,
        html,
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Resend error:', err);
      res.status(500).json({ error: 'Failed to send application. Please try again.' });
    }
  });
});
