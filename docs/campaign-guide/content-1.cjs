// Chapters 1–3: what a campaign is, the spreadsheet, the items.
module.exports = ({ shot, step, steps, tip, warn, table, copy }) => [
  {
    id: 'start',
    eyebrow: 'Read this first',
    title: 'How a campaign works',
    html: `
<p>A <b>campaign</b> is anything the pantry sells on the website: rubber ducks for the Duck Drop, tickets for a dinner, raffle-style items. Visitors choose how many they want, enter their details, pay by card on a secure Stripe page, and get a confirmation email. Every sale lands in a Google Sheet for the team.</p>
${shot('w01-page.jpg', 'What visitors see: a campaign on the website.')}

<h3>Two kinds of campaign</h3>
${table(['Type', 'Use it for', 'What is special'], [
  ['Numbered', 'Duck Drop and anything else where each item needs its own number', 'Every duck gets the next number (1, 2, 3 … or from a start number you choose). Buyers see their numbers right away and in their email. The sheet has one row per duck.'],
  ['Tickets', 'Dinners, galas, events', 'A "family ticket" can count as 4 people toward the event\'s capacity. The sheet has one row per order, with the number of people.'],
])}

<h3>The four building blocks in Contentful</h3>
<p>You build a campaign from four kinds of entries. Each one points to the next:</p>
<div class="diagram"><span>Page</span><i>shows a</i><span>Campaign Section</span><i>which uses a</i><span>Campaign</span><i>which sells</i><span>Campaign Items</span></div>
${table(['Entry', 'What it holds', 'Example'], [
  ['Campaign Item', 'One thing for sale and its price', 'Duck, $10 · Family ticket, $100'],
  ['Campaign', 'The sale itself: dates, limits, spreadsheet, the buyer\'s email', 'Duck Drop 2027'],
  ['Campaign Section', 'The form on a page, with a title and intro text', '"Adopt a Duck!"'],
  ['Page', 'The web address where the form appears', '/duck-drop'],
])}

<h3>Before you start, have these ready</h3>
<ul>
  <li>What you are selling and the price of each item.</li>
  <li>When sales open and close (optional).</li>
  <li>Any limits: total available, per order, places held back for sponsors.</li>
  <li>The text for the confirmation email and the thank-you message.</li>
  <li>About 30 minutes, and access to Contentful and the pantry's Google Drive.</li>
</ul>

${warn(`<p><b>Three rules that protect your sales data</b></p>
<ol>
<li>Never change a campaign's <b>Campaign ID</b> after the first sale. The website counts sales and hands out duck numbers by that ID.</li>
<li>In the sales spreadsheet, never rename the first tab (<code>Sheet1</code>) and never move or delete the generated columns. You may add your own columns to the right.</li>
<li>Always test a new campaign on a hidden page before you link to it (chapter 6).</li>
</ol>`)}
`,
  },

  {
    id: 'sheet',
    eyebrow: 'Google Drive · 5 minutes',
    title: 'Create the sales spreadsheet',
    html: `
<p>Every sale is written to a Google Sheet that belongs to the campaign. Create it first, because the campaign needs its ID.</p>
${steps(
  step('1', 'Create a new spreadsheet', `<p>In Google Drive, open the pantry's shared folder for events (not your personal <i>My Drive</i>, so the sheet stays with the pantry). Click <b>New → Google Sheets → Blank spreadsheet</b>.</p>`),
  step('2', 'Name it', `<p>Click <i>Untitled spreadsheet</i> at the top left and type a clear name, for example <b>Duck Drop 2027 – Online Sales</b>.</p>
    <p>Leave the sheet empty and leave the tab at the bottom named <code>Sheet1</code>. The website writes the column headings itself when the first sale comes in.</p>`),
  step('3', 'Share it with the website', `<p>Click <b>Share</b> (top right). In "Add people", paste this address and choose <b>Editor</b>:</p>
    <p>${copy('donation-sheet-writer@pantry-shoppers.iam.gserviceaccount.com')}</p>
    <p>Untick <b>Notify people</b> (it is not a real inbox) and click <b>Share</b>. This is the website's own account; without it, sales cannot be written to the sheet.</p>`),
  step('4', 'Keep it private', `<p>In the same Share window, under <b>General access</b>, make sure it says <b>Restricted</b>. Add the team members who need to see sales. The sheet holds buyers' names, emails and phone numbers.</p>`),
  step('5', 'Copy the spreadsheet ID', `<p>Look at the address bar. The ID is the long code between <code>/d/</code> and <code>/edit</code>:</p>
    <p><code>docs.google.com/spreadsheets/d/<b>1XVzgxftbQojfFFfDUR1-ktRVLMTQwrWqg4CPFpfslMc</b>/edit</code></p>
    <p>Copy just that part. You will paste it into the campaign in chapter 4.</p>`),
)}
${tip('<p>No sheet yet? You can leave the spreadsheet field empty and add it later. Sales are always stored safely, but <b>only sales made after you add the ID appear in the sheet</b>. Add it before you open sales.</p>')}
`,
  },

  {
    id: 'items',
    eyebrow: 'Contentful · 5 minutes per item',
    title: 'Create the items for sale',
    html: `
<p>Make one <b>Campaign Item</b> for each thing a buyer can choose: "Duck", "5-pack of ducks", "Adult ticket", "Family ticket". Items can be reused next year.</p>
${steps(
  step('1', 'Start a new entry', `<p>In Contentful, open the <b>Content</b> tab and click <b>Add entry</b>.</p>`, shot('c01-add-entry.jpg', 'Content tab → Add entry.')),
  step('2', 'Choose "Campaign Item"', `<p>Type <b>Campaign</b> in the search box at the top of the menu to shorten the list, then click <b>Campaign Item</b>.</p>`, shot('c02-choose-type.jpg', 'Choose Campaign Item.')),
  step('3', 'Name', `<p>Type the name buyers will see, for example <b>Duck</b> or <b>Adult ticket</b>. It also appears on the payment page and in the sheet.</p>
    <p><b>Description</b> (optional) is a short line under the name, such as "Dinner and dessert included" or "Admits 2 adults and 2 children".</p>`, shot('c03-item-name.jpg', 'The Name field.')),
  step('4', 'Price', `<p>Enter the price in dollars, numbers only: <code>10</code>, <code>40</code>, <code>12.50</code>.</p>`, shot('c04-item-price.jpg', 'Price (USD).')),
  step('5', 'Units per item (only for packs and family tickets)', `<p>How many ducks or people this item counts as. Leave empty for a normal item (it counts as 1).</p>
    ${table(['Item', 'Units per Item', 'Result'], [
      ['Duck', '(empty)', '1 duck, 1 number'],
      ['5-pack of ducks', '5', '5 ducks with 5 consecutive numbers'],
      ['Family ticket', '4', 'Counts as 4 people toward the event\'s capacity'],
    ])}`, shot('c05-item-units.jpg', 'Units per Item.')),
  step('6', 'Limits (optional)', `<p><b>Max per Order</b>: the most of this item one buyer can take, for example 10 tickets. <b>Total Available</b>: stock for this item alone, for example 8 sponsor tables. Leave both empty for no limit.</p>`, shot('c06-item-caps.jpg', 'Max per Order and Total Available.')),
  step('7', 'Fair market value (tickets with a meal or gift)', `<p>If the buyer receives something of value, like dinner, enter its value per ticket here, for example <code>25</code> for a $40 dinner ticket. The confirmation email then includes the statement the IRS requires about how much of the payment is tax-deductible.</p>
    <p>Leave it empty for the Duck Drop.</p>`, shot('c07-item-fmv.jpg', 'Fair Market Value (USD).')),
  step('8', 'Publish', `<p>Click the green <b>Publish</b> button on the right. Once an entry is published, that button reads <b>Change status</b>; after you edit a published entry it offers <b>Publish changes</b>, and your edits only reach the website after you click it. Repeat for each item.</p>`, shot('c27-publish.jpg', 'The status button on the right (here on an entry that is already published).')),
)}
${tip('<p>Not sure about the fair market value? Ask the treasurer. A common approach is the cost per person of the meal the venue charges.</p>')}
`,
  },
];
