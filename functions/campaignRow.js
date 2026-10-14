// Sheet rows for paid campaigns. Each campaign writes to its own spreadsheet
// (its id lives on the Contentful entry). The headers here are the single
// source of truth — never reorder columns in a sheet by hand.
//
// A numbered campaign (Duck Drop) writes one row per number, because staff
// work the draw number by number. A ticket campaign writes one row per order,
// because check-in works buyer by buyer.

const { numberList, orderSummaryText } = require('./campaignOrder');
const { formatUsPhone } = require('./phone');

const NUMBERED_HEADER = [
  'Date (ET)',
  'Order ID',
  'Number',
  'Item',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Numbers in Order',
  'Order Total Paid (USD)',
  'Fees Covered',
  'Stripe Session ID',
];

const TICKETS_HEADER = [
  'Date (ET)',
  'Order ID',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Order',
  'People',
  'Subtotal (USD)',
  'Fee Covered (USD)',
  'Total Paid (USD)',
  'Fair Market Value (USD)',
  'Stripe Session ID',
];

const dollars = (cents) => Number(((cents || 0) / 100).toFixed(2));

// `record` is the order document from Firestore (see campaigns.js).
// `formatDate` turns unix seconds into the shared "YYYY-MM-DD HH:mm" Eastern
// string, so these sheets sort the same way as the donations sheet.
function buildCampaignRows(record, formatDate) {
  const { buyer, order } = record;
  const date = formatDate(Math.floor((record.paidAt || record.createdAt) / 1000));
  const phone = formatUsPhone(buyer.phone);
  const totalPaid = dollars(record.amountPaidCents ?? order.totalCents);

  if (record.campaign.numbered) {
    // Expand the lines so each number knows which item it came from: two
    // singles and a 5-pack give numbers 1–2 as "Duck" and 3–7 as "5-pack".
    const itemPerUnit = order.lines.flatMap(l => Array(l.quantity * l.unitsPerItem).fill(l.name));
    const numbers = numberList(record.numbers);
    return numbers.map((number, i) => [
      date,
      record.orderId,
      number,
      itemPerUnit[i] || '',
      buyer.firstName,
      buyer.lastName,
      buyer.email,
      phone,
      numbers.length,
      totalPaid,
      order.feeCents > 0 ? 'Yes' : 'No',
      record.stripeSessionId || '',
    ]);
  }

  return [[
    date,
    record.orderId,
    buyer.firstName,
    buyer.lastName,
    buyer.email,
    phone,
    orderSummaryText(order),
    order.units,
    dollars(order.subtotalCents),
    dollars(order.feeCents),
    totalPaid,
    order.fairMarketValueCents === null ? '' : dollars(order.fairMarketValueCents),
    record.stripeSessionId || '',
  ]];
}

const headerFor = (record) => (record.campaign.numbered ? NUMBERED_HEADER : TICKETS_HEADER);

module.exports = { NUMBERED_HEADER, TICKETS_HEADER, buildCampaignRows, headerFor };
