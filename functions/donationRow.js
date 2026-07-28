// Shared donation-row shape used by both the live Stripe webhook (index.js)
// and the one-time historical backfill (backfill-donations.js), so the sheet
// columns never drift between them.

const DONATION_HEADER = [
  'Date (ET)',
  'Stripe Session ID',
  'Donor Name',
  'Donor Email',
  'Donation Amount (USD)',
  'Amount Paid (USD)',
  'Fees Covered',
  'Reason',
  'Honoree',
  'Amount Note',
  'Has Acknowledgement',
  'Acknowledgement Name',
  'Street',
  'Apt / Unit',
  'City',
  'State',
  'Postal Code',
  'Country',
  'Notes',
];

// "YYYY-MM-DD HH:mm" in US Eastern time — sortable as plain text and readable
// for the secretary without timezone math.
function formatDateEastern(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  const date = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

// Build one sheet row from a Stripe Checkout Session. `meta` defaults to the
// session's own metadata (set in createDonationCheckout).
function buildDonationRow(session, meta) {
  meta = meta || session.metadata || {};
  const donorName = session.customer_details?.name || '';
  const donorEmail = session.customer_details?.email || '';
  const amountPaid = Number((session.amount_total / 100).toFixed(2)); // total charged (incl. covered fees)
  // Base donation the donor chose. Older donations predate this metadata, so
  // fall back to the total paid.
  const donationAmount = meta.donation_amount
    ? Number(meta.donation_amount)
    : amountPaid;
  const hasAck = !!(meta.ack_first_name || meta.ack_last_name);

  return [
    formatDateEastern(session.created),
    session.id,
    donorName,
    donorEmail,
    donationAmount,
    amountPaid,
    meta.cover_fees === 'true' ? 'Yes' : 'No',
    meta.reason || '',
    meta.honoree || '',
    meta.amount_tagline || '',
    hasAck ? 'Yes' : 'No',
    hasAck ? `${meta.ack_first_name || ''} ${meta.ack_last_name || ''}`.trim() : '',
    meta.ack_street || '',
    meta.ack_apt || '',
    meta.ack_city || '',
    meta.ack_state || '',
    meta.ack_postal || '',
    meta.ack_country || '',
    meta.ack_notes || '',
  ];
}

module.exports = { DONATION_HEADER, buildDonationRow, formatDateEastern };
