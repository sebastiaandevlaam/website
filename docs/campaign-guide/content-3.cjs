// Chapters 7–11: running sales, refunds, closing, examples, troubleshooting.
module.exports = ({ shot, step, steps, tip, warn, table }) => [
  {
    id: 'running',
    eyebrow: 'While sales are open',
    title: 'View sales and make changes',
    html: `
<h3>See who bought what</h3>
<p>Open the campaign's spreadsheet. A new row appears within a minute of each payment. Sort or filter it like any sheet. Don't move or delete the generated columns; add your own to the right, such as "Checked in" or "Prize".</p>
<p><b>Duck Drop: one row per duck.</b> Column C is the duck number, so on the day you can look up any number instantly.</p>
${shot('w14-sheet-ducks.jpg', 'Duck Drop sheet: Jane bought 2 ducks, Sam a 5-pack (numbers 103–107), Lee 1.')}
<p><b>Tickets: one row per order.</b> The <i>People</i> column (H) counts family tickets as 4.</p>
${shot('w15-sheet-tickets.jpg', 'Ticket sheet: one row per order, with the number of people.')}
${table(['To find out', 'In the sheet'], [
  ['Ducks sold so far', 'The highest number in column C, or <code>=COUNTA(C2:C)</code>'],
  ['People coming (tickets)', '<code>=SUM(H2:H)</code>'],
  ['Money raised', 'Use Stripe\'s dashboard (it shows refunds too), or add up each order once'],
  ['Someone\'s order', 'Search the sheet (Ctrl/⌘ F) for their name or email'],
])}

<h3>How much is left</h3>
<p>When an item has a limit, the website shows <b>Only N left</b> once 20 or fewer remain, and <b>Sold out</b> at zero. When everything is gone, the Sold Out Message replaces the form.</p>
${shot('w08-low-stock.jpg', '"Only 7 left" appears automatically.')}
${shot('w09-sold-out.jpg', 'The Sold Out Message, written in the campaign.')}

<h3>Common changes</h3>
${table(['You want to…', 'Do this in the campaign (then Publish)'], [
  ['Hold back more places for sponsors', 'Raise <b>Reserved Spots</b>. Lower it to release them for sale.'],
  ['Sell more than planned', 'Raise <b>Total Capacity</b> (or the item\'s Total Available).'],
  ['Stop sales now', 'Set <b>Close Date</b> to now. Visitors see the Closed Message.'],
  ['Extend sales', 'Move the <b>Close Date</b> later.'],
  ['Change the email or messages', 'Edit them. New buyers get the new text straight away.'],
  ['Change a price', 'Edit the item\'s Price. Only new orders pay the new price.'],
  ['Add an item (e.g. a 10-pack)', 'Create the Campaign Item and add it to <b>Items</b>.'],
])}
${shot('w10-closed.jpg', 'After the Close Date, the Closed Message replaces the form.')}
${tip('<p>Changes in Contentful reach the website within about a minute. Refresh the page to see them.</p>')}
`,
  },

  {
    id: 'refunds',
    eyebrow: 'Helping buyers',
    title: 'Refunds and buyer questions',
    html: `
<p>Refunds are done in Stripe by someone with access to the pantry's Stripe account (usually the treasurer).</p>
${steps(
  step('1', 'Find the payment', `<p>Go to <b>dashboard.stripe.com → Payments</b> and search for the buyer's email address. The payment description includes the campaign name and order number, such as <i>Duck Drop 2027 — HPS-MVZLG280-1A2B</i>.</p>`),
  step('2', 'Refund it', `<p>Open the payment, click <b>Refund</b>, choose the full amount or part of it, pick a reason and confirm. The buyer gets the money back in 5–10 days. Stripe keeps its small processing fee.</p>`),
  step('3', 'Mark it in the sheet', `<p>Add a column on the right called <b>Refunded</b> and mark the buyer's row(s). Don't delete the rows: they are your record of what happened.</p>`),
  step('4', 'Give the places back (only if the campaign has a limit)', `<p>The website still counts a refunded order as sold. To put the places back on sale, lower <b>Reserved Spots</b> by that many (a family ticket = 4). If Reserved Spots is already 0, raise <b>Total Capacity</b> instead. Refunded duck numbers are not reused.</p>`),
)}
<h3>Questions you may get</h3>
${table(['Buyer says…', 'What to do'], [
  ['"I didn\'t get my email."', 'Find them in the sheet. If the row is there, the payment worked: ask them to check spam, and send their order number and duck numbers from your own email. If there is no row, check Stripe; if Stripe shows no payment, they did not complete checkout.'],
  ['"I made a typo in my name or email."', 'Correct it in the sheet. Nothing else needs to change.'],
  ['"Can I swap my duck numbers?"', 'No. Numbers are given in order of purchase and can\'t be changed.'],
  ['"It says sold out but I need tickets."', 'If you have Reserved Spots left, sell them directly and lower Reserved Spots, or release some for online sale.'],
  ['"The form won\'t accept my phone number."', 'It must be a US number with area code, e.g. 508 555 0123.'],
])}
`,
  },

  {
    id: 'after',
    eyebrow: 'When it is over',
    title: 'Close the campaign',
    html: `
${steps(
  step('1', 'Stop sales', `<p>Set the <b>Close Date</b> (if you didn't already) and publish. The Closed Message shows from then on.</p>`),
  step('2', 'Remove the links', `<p>After the event, remove the menu link and any buttons pointing to the page. Then either unpublish the page or remove the section from it.</p>`),
  step('3', 'Keep the records', `<p>Don't delete the Campaign entry or the spreadsheet; they are the record of the event. Move the sheet into an archive folder if you like.</p>`),
  step('4', 'Next year', `<p>Make a <b>new</b> Campaign with a new Campaign ID (<code>duck-drop-2028</code>) and a new spreadsheet. You can reuse the items. Never reuse an old Campaign ID: it would continue last year's numbering and counts.</p>`),
)}
`,
  },

  {
    id: 'examples',
    eyebrow: 'Copy these',
    title: 'Ready-made examples',
    html: `
<h3>Duck Drop</h3>
${table(['Field', 'Value'], [
  ['Items', '"Duck" $10 · "5-pack of ducks" $40, Units per Item 5'],
  ['Name / Campaign ID', 'Duck Drop 2027 / <code>duck-drop-2027</code>'],
  ['Campaign Type', 'Numbered'],
  ['Start Number', 'empty, or the first number after the paper sales'],
  ['Open / Close Date', 'April 1, 9:00 AM / May 1, 11:59 PM'],
  ['Total Capacity', 'empty (unlimited), or the number of ducks you have'],
  ['Email subject', '<code>Your ducks for {campaignName}</code>'],
  ['Success Headline', 'Your ducks are in the race!'],
])}
<p>Email body:</p>
<pre class="table-wrap"><code>Hi {firstName},

Thank you for adopting {count} duck(s) in the **{campaignName}**!

{orderSummary}

Your duck numbers: **{numbers}**

The ducks drop on **Sunday, May 2 at 2 PM** at Lake Winthrop. Winners are called the same day.
Your order number is {orderId}. Questions? Just reply to this email.</code></pre>

<h3>Dinner or gala tickets</h3>
${table(['Field', 'Value'], [
  ['Items', '"Adult ticket" $40, Fair Market Value 25 · "Family ticket" $100, Units per Item 4, Fair Market Value 60'],
  ['Name / Campaign ID', 'Spring Gala 2027 / <code>spring-gala-2027</code>'],
  ['Campaign Type', 'Tickets'],
  ['Total Capacity / Reserved Spots', '120 / 10'],
  ['Max Items per Order', '8'],
  ['Email subject', '<code>Your tickets for {campaignName}</code>'],
])}
<p>Email body:</p>
<pre class="table-wrap"><code>Hi {firstName},

Thank you! You're coming to the **{campaignName}**.

{orderSummary}

**Saturday, February 20 · doors at 6 PM · Holliston Town Hall**
There are no paper tickets: we'll have your name at the door.
Your order number is {orderId}.</code></pre>
${tip('<p>With a Fair Market Value set, the email automatically ends with the tax statement, for example: "We estimate that value at $50.00, so $30.00 of your $80.00 payment may be deductible."</p>')}
`,
  },

  {
    id: 'help',
    eyebrow: 'Troubleshooting',
    title: 'If something looks wrong',
    html: `
${table(['What you see', 'Likely cause and fix'], [
  ['The page shows the title but no form', 'The campaign or its items are not published, or no item has a price. Publish them all.'],
  ['"Sales are currently closed" before the start', 'The Open Date is in the future or the Close Date has passed. Check both, including the time and AM/PM.'],
  ['"This campaign could not be found"', 'The campaign is unpublished, or its Campaign ID was changed. Change it back and publish.'],
  ['A buyer paid but the sheet has no row', 'The sheet ID is missing or wrong, the sheet is not shared with the website as Editor, or the first tab was renamed. Fix it and tell the website administrator: earlier sales can be recovered.'],
  ['Columns in the sheet are shifted', 'Someone inserted or moved a column. Move it back; new rows always follow the original order.'],
  ['No confirmation emails', 'Check the website@ mailbox\'s Sent folder, then contact the website administrator.'],
  ['Changes in Contentful don\'t show', 'Did you click Publish? Wait a minute and refresh.'],
])}
<p>For anything else, contact the website administrator with the campaign name, the buyer's email and the time of purchase.</p>
`,
  },
];
