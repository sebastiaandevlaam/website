// One-off: creates the Contentful content types for paid campaigns
// (campaignItem, campaign, sectionCampaign) with editor help texts, and allows
// sectionCampaign in the page's `sections` field.
//
//   CONTENTFUL_MANAGEMENT_TOKEN=CFPAT-… node --env-file=.env --env-file=.env.holliston-pantry-shelf setup-campaign-content-types.js          # dry run
//   CONTENTFUL_MANAGEMENT_TOKEN=CFPAT-… node --env-file=.env --env-file=.env.holliston-pantry-shelf setup-campaign-content-types.js --apply
//
// Safe to re-run: an existing content type only gains fields it is missing, and
// sectionCampaign is only added to the page if it is missing. Creates no
// entries, so nothing changes for visitors. Field ids must match
// campaignOrder.js / CampaignSection.jsx — see CLAUDE.md "Paid Campaigns".

const APPLY = process.argv.includes('--apply');
const SPACE = process.env.CONTENTFUL_SPACE_ID;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || 'master';
const TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

const BACKGROUNDS = ['Default Background', 'Beige Background', 'Red Background', 'Gray Background', 'Image Background'];

const f = (id, name, type, extra = {}) => ({ id, name, type, localized: false, required: false, ...extra });
const min = (n) => ({ range: { min: n } });

const CONTENT_TYPES = [
  {
    id: 'campaignItem',
    name: 'Campaign Item',
    description: 'Something a campaign sells: a duck, a 5-pack, an adult or family ticket.',
    displayField: 'name',
    fields: [
      [f('name', 'Name', 'Symbol', { required: true }), 'Shown to buyers, on the Stripe page and in the sheet, e.g. "Adult ticket".'],
      [f('description', 'Description', 'Symbol'), 'Optional line under the name, e.g. "Admits 2 adults and 2 children".'],
      [f('price', 'Price (USD)', 'Number', { required: true, validations: [min(0.5)] }), 'Price per item in dollars, e.g. 10 or 40.'],
      [f('unitsPerItem', 'Units per Item', 'Integer', { validations: [min(1)] }),
        'How many places (tickets) or numbers (ducks) one of these counts as. Family ticket = 4, duck 5-pack = 5. Empty = 1.'],
      [f('maxPerOrder', 'Max per Order', 'Integer', { validations: [min(1)] }), 'Optional limit on how many of this item one order may contain. Empty = no limit.'],
      [f('totalCap', 'Total Available', 'Integer', { validations: [min(0)] }), 'Optional stock for this item alone, e.g. 10 sponsor tables. Empty = limited only by the campaign total.'],
      [f('fairMarketValue', 'Fair Market Value (USD)', 'Number', { validations: [min(0)] }),
        'Value of what the buyer receives per item (e.g. the dinner). When set, the confirmation email includes the IRS tax-deduction statement. Leave empty for the Duck Drop.'],
    ],
  },
  {
    id: 'campaign',
    name: 'Campaign',
    description: 'A paid campaign (Duck Drop, event tickets). Referenced by a Campaign Section.',
    displayField: 'name',
    fields: [
      [f('name', 'Name', 'Symbol', { required: true }), 'e.g. "Duck Drop 2027". Used in emails and on the Stripe page.'],
      [f('campaignId', 'Campaign ID', 'Symbol', {
        required: true,
        validations: [
          { unique: true },
          { regexp: { pattern: '^[a-z0-9][a-z0-9-]{0,59}$' }, message: 'Lowercase letters, digits and dashes only, e.g. duck-drop-2027' },
        ],
      }), 'Permanent key for stock and numbering, e.g. duck-drop-2027. NEVER change it once sales have started.'],
      [f('campaignType', 'Campaign Type', 'Symbol', { required: true, validations: [{ in: ['Numbered', 'Tickets'] }] }),
        'Numbered: every unit gets a number, one sheet row per number (Duck Drop). Tickets: one sheet row per order.'],
      [f('startNumber', 'Start Number', 'Integer', { validations: [min(1)] }),
        'Numbered campaigns only: the first number handed out. Empty = 1. Changing it later never reuses a number: raising it jumps ahead, lowering it is ignored.'],
      [f('items', 'Items', 'Array', {
        required: true,
        items: { type: 'Link', linkType: 'Entry', validations: [{ linkContentType: ['campaignItem'] }] },
      }), 'What is for sale, in the order shown.'],
      [f('openDate', 'Open Date', 'Date'), 'Optional. Sales open at this moment.'],
      [f('closeDate', 'Close Date', 'Date'), 'Optional. Sales close at this moment and the Closed Message is shown.'],
      [f('totalCap', 'Total Capacity', 'Integer', { validations: [min(0)] }), 'Optional total places/ducks for the whole campaign, counted in units. Empty = unlimited.'],
      [f('reservedSpots', 'Reserved Spots', 'Integer', { validations: [min(0)] }),
        'Places held back from the total for sponsors/VIPs. Adjust any time. After a refund, lower this by the refunded places to put them back on sale.'],
      [f('maxPerOrder', 'Max Items per Order', 'Integer', { validations: [min(1)] }), 'Optional limit on the number of items in one order. Empty = no limit.'],
      [f('coverFeesEnabled', 'Offer to Cover Fees', 'Boolean'), 'Show the "help cover the processing fee" checkbox. Empty counts as yes.'],
      [f('coverFeesLabel', 'Cover Fees Label', 'Symbol'), 'Optional wording for that checkbox.'],
      [f('spreadsheetId', 'Spreadsheet ID', 'Symbol', {
        validations: [{ regexp: { pattern: '^[A-Za-z0-9_-]{20,}$' }, message: 'Paste only the id from the sheet URL (between /d/ and /edit), not the whole link.' }],
      }), 'Optional. Sheet id from its URL (between /d/ and /edit). Share the sheet with the service account as Editor; keep the first tab named Sheet1. Orders are always kept in Firestore; the sheet only gets orders placed after this is set.'],
      [f('confirmationEmailSubject', 'Confirmation Email Subject', 'Symbol'), 'Optional. Placeholders allowed, e.g. "Your ducks for {campaignName}". Default: "Your order for {campaignName}".'],
      [f('confirmationEmailBody', 'Confirmation Email Body', 'Text'),
        'Markdown. Placeholders: {firstName} {lastName} {orderId} {campaignName} {total} {count} {numbers}, and {orderSummary} (a table, on its own line). Duck numbers are added automatically if {numbers} is missing.'],
      [f('confirmationEmailFrom', 'Confirmation Email From', 'Symbol'), 'Optional sender alias, e.g. ducks@hollistonpantryshelf.org. Must be set up as an alias AND listed in EMAIL_ALLOWED_SENDERS, otherwise website@ is used.'],
      [f('confirmationEmailReplyTo', 'Confirmation Email Reply-To', 'Symbol'), 'Optional address that receives buyers\' replies.'],
      [f('successHeadline', 'Success Headline', 'Symbol'), 'Thank-you page headline after payment.'],
      [f('successBody', 'Success Body', 'Text'), 'Thank-you page text (Markdown).'],
      [f('closedMessage', 'Closed Message', 'Text'), 'Shown instead of the form outside the open/close dates (Markdown).'],
      [f('soldOutMessage', 'Sold Out Message', 'Text'), 'Shown instead of the form when everything is sold out (Markdown).'],
    ],
  },
  {
    id: 'sectionCampaign',
    name: 'Campaign Section',
    description: 'Places a campaign\'s order form on a page.',
    displayField: 'title',
    fields: [
      [f('title', 'Title', 'Symbol', { required: true }), null],
      [f('introText', 'Intro Text', 'Text'), 'Markdown shown above the form.'],
      [f('campaign', 'Campaign', 'Link', { required: true, linkType: 'Entry', validations: [{ linkContentType: ['campaign'] }] }), null],
      [f('backgroundStyle', 'Background Style', 'Symbol', { validations: [{ in: BACKGROUNDS }] }), null],
    ],
  },
];

async function cma(method, path, { body, version } = {}) {
  const response = await fetch(`https://api.contentful.com/spaces/${SPACE}/environments/${ENV}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version !== undefined ? { 'X-Contentful-Version': String(version) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !(method === 'GET' && response.status === 404)) {
    throw new Error(`${method} ${path} → ${response.status}: ${JSON.stringify(data.details || data.message || data)}`);
  }
  return { status: response.status, data };
}

async function createContentType(def) {
  const existing = await cma('GET', `/content_types/${def.id}`);
  if (existing.status !== 404) {
    await addMissingFields(def, existing.data);
    return;
  }
  console.log(`• ${def.id}: will create with ${def.fields.length} fields (${def.fields.map(([fd]) => fd.id).join(', ')})`);
  if (!APPLY) return;

  const created = await cma('PUT', `/content_types/${def.id}`, {
    body: { name: def.name, description: def.description, displayField: def.displayField, fields: def.fields.map(([fd]) => fd) },
  });
  await cma('PUT', `/content_types/${def.id}/published`, { version: created.data.sys.version });

  // Help texts live on the editor interface, which Contentful creates with
  // default widgets on activation; only the help text is added.
  await setHelpTexts(def.id, def.fields);
  console.log(`  ✓ created, activated, help texts set`);
}

// An existing type is never changed, only extended: fields the definition has
// and Contentful lacks are appended (at the end — editors can reorder them).
async function addMissingFields(def, current) {
  const have = new Set(current.fields.map(fd => fd.id));
  const missing = def.fields.filter(([fd]) => !have.has(fd.id));
  if (missing.length === 0) {
    console.log(`• ${def.id}: exists and is complete — left untouched`);
    return;
  }
  console.log(`• ${def.id}: exists; will add ${missing.map(([fd]) => fd.id).join(', ')}`);
  if (!APPLY) return;

  const { sys, name, description, displayField, fields } = current;
  const updated = await cma('PUT', `/content_types/${def.id}`, {
    body: { name, description, displayField, fields: [...fields, ...missing.map(([fd]) => fd)] },
    version: sys.version,
  });
  await cma('PUT', `/content_types/${def.id}/published`, { version: updated.data.sys.version });
  await setHelpTexts(def.id, missing);
  console.log('  ✓ fields added, activated, help texts set');
}

async function setHelpTexts(contentTypeId, fieldDefs) {
  const ei = await cma('GET', `/content_types/${contentTypeId}/editor_interface`);
  const help = new Map(fieldDefs.filter(([, h]) => h).map(([fd, h]) => [fd.id, h]));
  const controls = (ei.data.controls || []).map(c =>
    help.has(c.fieldId) ? { ...c, settings: { ...(c.settings || {}), helpText: help.get(c.fieldId) } } : c);
  await cma('PUT', `/content_types/${contentTypeId}/editor_interface`, { body: { controls }, version: ei.data.sys.version });
}

async function allowOnPage() {
  const page = await cma('GET', '/content_types/page');
  const sections = page.data.fields.find(fd => fd.id === 'sections');
  const rule = sections?.items?.validations?.find(v => v.linkContentType);
  if (!rule) {
    console.log('• page.sections: no content-type restriction — nothing to do');
    return;
  }
  if (rule.linkContentType.includes('sectionCampaign')) {
    console.log('• page.sections: already allows sectionCampaign');
    return;
  }
  console.log('• page.sections: will add sectionCampaign to the allowed section types');
  if (!APPLY) return;
  rule.linkContentType.push('sectionCampaign');
  const { sys, name, description, displayField, fields } = page.data;
  const updated = await cma('PUT', '/content_types/page', { body: { name, description, displayField, fields }, version: sys.version });
  await cma('PUT', '/content_types/page/published', { version: updated.data.sys.version });
  console.log('  ✓ page updated and activated');
}

(async () => {
  if (!SPACE || !TOKEN) {
    console.error('Set CONTENTFUL_SPACE_ID (via --env-file) and CONTENTFUL_MANAGEMENT_TOKEN.');
    process.exit(1);
  }
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN (add --apply to make changes)'} — space ${SPACE}, environment ${ENV}\n`);
  for (const def of CONTENT_TYPES) await createContentType(def);
  await allowOnPage();
  console.log(APPLY ? '\nDone.' : '\nNothing was changed.');
})().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
