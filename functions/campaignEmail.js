// The buyer's confirmation email for a paid campaign. Subject and body are
// written per campaign in Contentful, in Markdown, with placeholders:
//
//   {firstName} {lastName} {orderId} {campaignName} {total} {count} {numbers}
//   {orderSummary}  — a table of what was bought; put it on a line of its own
//
// Placeholders are filled in *after* the Markdown is rendered, and every value
// is escaped, so a buyer who types Markdown or HTML into their name gets it
// printed literally. Raw HTML in the Contentful text is escaped too, and links
// are limited to http(s)/mailto/tel: a compromised CMS account must not be
// able to turn our own verified domain into a phishing sender.

const { Marked } = require('marked');
const { escapeHtml, escapeSubject } = require('./email');
const { formatMoney, formatNumbers } = require('./campaignOrder');

const DEFAULT_SUBJECT = 'Your order for {campaignName}';

const DEFAULT_BODY = `Hi {firstName},

Thank you for supporting the Holliston Pantry Shelf! Here is your order for {campaignName}.

{orderSummary}

Your order number is **{orderId}**.`;

const DEFAULT_NUMBERS_LINE = 'Your numbers: **{numbers}**';

const SAFE_LINK = /^(https?:|mailto:|tel:)/i;

const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
    link(token) {
      const text = this.parser.parseInline(token.tokens);
      if (!SAFE_LINK.test(token.href)) return text;
      return `<a href="${escapeHtml(token.href)}" style="color:#A00405">${text}</a>`;
    },
    image(token) {
      return escapeHtml(token.text || '');
    },
  },
});

function orderSummaryTable(order) {
  const cell = 'padding:6px 16px 6px 0;border-bottom:1px solid #eee';
  const rows = order.lines.map(l => `
    <tr>
      <td style="${cell}">${l.quantity} × ${escapeHtml(l.name)}</td>
      <td style="${cell};text-align:right">${formatMoney(l.quantity * l.unitPriceCents)}</td>
    </tr>`);
  if (order.feeCents > 0) {
    rows.push(`
    <tr>
      <td style="${cell}">Processing fee (thank you for covering it)</td>
      <td style="${cell};text-align:right">${formatMoney(order.feeCents)}</td>
    </tr>`);
  }
  rows.push(`
    <tr>
      <td style="padding:8px 16px 6px 0;font-weight:700">Total</td>
      <td style="padding:8px 0 6px;font-weight:700;text-align:right">${formatMoney(order.totalCents)}</td>
    </tr>`);
  return `<table style="border-collapse:collapse;font-size:15px;margin:8px 0 16px">${rows.join('')}</table>`;
}

// IRS Publication 1771: a payment over $75 that is partly a gift and partly
// for goods or services needs a written statement with a good-faith estimate
// of their value. It is added to every order of a campaign that states a fair
// market value, regardless of total — harmless under $75, and it means no
// order that needs it can ever miss it.
function taxStatement(order) {
  if (order.fairMarketValueCents === null || order.fairMarketValueCents === undefined) return '';
  const deductible = Math.max(0, order.totalCents - order.fairMarketValueCents);
  return `<p style="font-size:13px;color:#666;margin-top:24px">
    The amount of your payment that is deductible for federal income tax purposes is limited to the
    excess of the money you paid over the value of the goods or services provided by the Holliston
    Pantry Shelf. We estimate that value at ${formatMoney(order.fairMarketValueCents)}, so
    ${formatMoney(deductible)} of your ${formatMoney(order.totalCents)} payment may be deductible.
  </p>`;
}

function placeholderValues(record) {
  const { buyer, order } = record;
  return {
    firstName: buyer.firstName,
    lastName: buyer.lastName,
    orderId: record.orderId,
    campaignName: record.campaign.name,
    total: formatMoney(record.amountPaidCents ?? order.totalCents),
    count: String(record.numbers?.count ?? order.units),
    numbers: formatNumbers(record.numbers),
  };
}

function fill(template, values, transform) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? transform(values[key]) : match);
}

// Returns { subject, html } for `record`, the order document in Firestore.
function renderCampaignEmail(record) {
  const values = placeholderValues(record);
  const template = record.campaign.email || {};

  let body = template.body?.trim() || DEFAULT_BODY;
  // A numbered campaign must tell the buyer their numbers. If the editor's
  // text forgets the placeholder, add the line rather than send an email
  // without them.
  if (record.numbers && !body.includes('{numbers}')) {
    body = `${body}\n\n${DEFAULT_NUMBERS_LINE}`;
  }

  let html = markdown.parse(body);
  const table = orderSummaryTable(record.order);
  html = html.replace(/<p>\s*\{orderSummary\}\s*<\/p>/g, table).replace(/\{orderSummary\}/g, table);
  html = fill(html, values, escapeHtml);

  const subject = escapeSubject(fill(template.subject || DEFAULT_SUBJECT, values, String));

  return {
    subject,
    html: `<div style="font-family:'Open Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A;max-width:560px">
${html}
${taxStatement(record.order)}
</div>`,
  };
}

module.exports = { renderCampaignEmail, DEFAULT_BODY, DEFAULT_SUBJECT };
