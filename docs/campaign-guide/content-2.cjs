// Chapters 4–6: the campaign, putting it on the site, testing it.
module.exports = ({ shot, step, steps, tip, warn, table }) => [
  {
    id: 'campaign',
    eyebrow: 'Contentful · 15 minutes',
    title: 'Create the campaign',
    html: `
<p>The <b>Campaign</b> entry ties everything together: the items, the dates, the limits, the spreadsheet and the email buyers receive. Only the first few fields are required.</p>
${shot('c00-campaign-overview.jpg', 'A campaign entry (the Duck Drop test campaign).')}
${steps(
  step('1', 'Start a new Campaign', `<p><b>Content → Add entry → Campaign</b>.</p>`),
  step('2', 'Name', `<p>The name buyers see on the payment page and in their email, for example <b>Duck Drop 2027</b> or <b>Spring Gala 2027</b>.</p>`, shot('c08-campaign-name.jpg', 'Name.')),
  step('3', 'Campaign ID', `<p>A short code, lowercase with dashes, for example <code>duck-drop-2027</code>. It must be different from every earlier campaign, so include the year.</p>
    ${warn('<p>Never change the Campaign ID once sales have started. The website keeps count of sales and duck numbers under this ID; a new ID starts from zero.</p>')}`, shot('c09-campaign-id.jpg', 'Campaign ID.')),
  step('4', 'Campaign Type', `<p>Choose <b>Numbered</b> for the Duck Drop or <b>Tickets</b> for an event.</p>`, shot('c10-campaign-type.jpg', 'Campaign Type.')),
  step('5', 'Start Number (Numbered only)', `<p>The number the first duck gets. Leave empty to start at 1. Use it when ducks are also sold on paper: if the paper forms use 1–500, enter <code>501</code> here.</p>
    <p>If you raise it later, the next duck jumps to the new number. Lowering it has no effect, so a number is never given out twice.</p>`, shot('c11-start-number.jpg', 'Start Number.')),
  step('6', 'Items', `<p>Click <b>Add existing content</b> and pick the items you made in chapter 3. The order here is the order on the website; drag to rearrange.</p>`, shot('c12-items.jpg', 'Items, linked to the Campaign Items.')),
  step('7', 'Open and close dates (optional)', `<p><b>Open Date</b>: sales start at this moment. <b>Close Date</b>: sales stop and visitors see the Closed Message instead of the form. Leave both empty to sell straight away with no end date.</p>`, shot('c13-dates.jpg', 'Open Date and Close Date.')),
  step('8', 'Limits (optional)', `<p><b>Total Capacity</b>: how many ducks or people in total. For tickets this counts people, so a family ticket uses 4.</p>
    <p><b>Reserved Spots</b>: places held back from the total for sponsors, volunteers or VIPs who don't buy online. You can change this at any time.</p>
    <p><b>Max Items per Order</b>: the most items one buyer can take in one order.</p>
    <p>Leave any of these empty for no limit. Example: a hall for 120 with 10 seats for sponsors → Total Capacity <code>120</code>, Reserved Spots <code>10</code>, so 110 are sold online.</p>`, shot('c14-capacity.jpg', 'Total Capacity.') + shot('c15-reserved.jpg', 'Reserved Spots.')),
  step('9', 'Offer to cover fees', `<p>Turn on to show the checkbox "Help cover the credit card processing fee". Most buyers leave it ticked, so the pantry receives the full price. <b>Cover Fees Label</b> changes its wording.</p>`, shot('c16-cover-fees.jpg', 'Offer to Cover Fees.')),
  step('10', 'Spreadsheet ID', `<p>Paste the ID you copied in chapter 2. Paste only the ID, not the whole link; Contentful will warn you if you paste a link.</p>`, shot('c17-spreadsheet.jpg', 'Spreadsheet ID.')),
  step('11', 'The confirmation email', `<p>Every buyer gets this email right after paying. Write it in the <b>Confirmation Email Subject</b> and <b>Confirmation Email Body</b> fields. Words in curly brackets are filled in for each buyer:</p>
    ${table(['Write', 'Becomes', 'Example'], [
      ['{firstName}', 'Buyer\'s first name', 'Jane'],
      ['{lastName}', 'Buyer\'s last name', 'Example'],
      ['{campaignName}', 'The campaign\'s Name', 'Duck Drop 2027'],
      ['{count}', 'How many ducks or places', '2'],
      ['{numbers}', 'Their duck numbers', '101, 102'],
      ['{total}', 'Amount paid', '$20.91'],
      ['{orderId}', 'Order number', 'HPS-MVZLG280-1A2B'],
      ['{orderSummary}', 'A small table of what they bought, with the total. Put it on a line by itself.', '(table)'],
    ])}
    <p>Use <b>**double asterisks**</b> for bold and a blank line between paragraphs. If you leave the body empty, a short standard email is sent. For a Numbered campaign the duck numbers are always included, even if you forget <code>{numbers}</code>.</p>
    <p>This is what the buyer receives:</p>`, shot('c19-email-body.jpg', 'The Confirmation Email Body field.') + shot('w13-email.jpg', 'The email the buyer receives, built from that text.')),
  step('12', 'Sender and replies (optional)', `<p><b>Confirmation Email From</b>: leave empty to send from <code>website@hollistonpantryshelf.org</code>. A different sender, such as <code>ducks@</code>, must first be set up by the website administrator.</p>
    <p><b>Confirmation Email Reply-To</b>: where buyers' replies go, for example the event coordinator's address.</p>`, shot('c20-email-from.jpg', 'Confirmation Email From.')),
  step('13', 'Messages on the website', `<p><b>Success Headline</b> and <b>Success Body</b>: the thank-you page after payment.<br><b>Closed Message</b>: shown instead of the form outside the open and close dates.<br><b>Sold Out Message</b>: shown when everything is sold.</p>`, shot('c21-success.jpg', 'Success Headline and Body.') + shot('c22-closed.jpg', 'Closed Message.')),
  step('14', 'Publish', `<p>Click <b>Publish</b>. The campaign is ready but not yet visible anywhere; that is the next chapter.</p>`),
)}
`,
  },

  {
    id: 'website',
    eyebrow: 'Contentful · 5 minutes',
    title: 'Put it on the website',
    html: `
<p>A campaign appears on the website through a <b>Campaign Section</b> on a <b>Page</b>. You can give it a page of its own (best for the Duck Drop) or add it to an existing page.</p>
<h3>A. Create the section</h3>
${steps(
  step('1', 'Add a Campaign Section', `<p><b>Content → Add entry → Campaign Section</b>. Enter a <b>Title</b> (the heading on the page, such as "Adopt a Duck!") and an <b>Intro Text</b> explaining the event, the date and what buyers get.</p>`, shot('c23-section-title.jpg', 'Title.')),
  step('2', 'Link the campaign', `<p>Under <b>Campaign</b>, click <b>Add existing content</b> and choose your campaign. Pick a <b>Background Style</b> if you like, then <b>Publish</b>.</p>`, shot('c24-section-campaign.jpg', 'The Campaign field linked to the campaign.')),
)}
<h3>B1. On a new page</h3>
${steps(
  step('3', 'Create the page', `<p><b>Content → Add entry → Page</b>. Fill in an <b>Internal Title</b> and a <b>Slug</b>: the web address, starting with a slash, such as <code>/duck-drop</code>.</p>`, shot('c25-page-slug.jpg', 'Slug.')),
  step('4', 'Add the section', `<p>Under <b>Sections</b>, click <b>Add existing content</b>, choose the Campaign Section, then <b>Publish</b>. The page is now live at that address, but nobody can find it yet. Test it now (chapter 6) before you link to it.</p>`, shot('c26-page-sections.jpg', 'Sections on the page.')),
  step('5', 'Link to it from the menu (after testing)', `<p>Open the <b>Navigation Menu</b> entry, add a <b>Button / Link</b> under <b>Menu Items</b> with the text and the slug, and publish. Or link to the page from a button on the homepage or in the announcement bar.</p>`, shot('c28-nav-items.jpg', 'Menu Items in the Navigation Menu.')),
)}
<h3>B2. Or on an existing page</h3>
${steps(
  step('3', 'Add the section to the page', `<p>Open the page, for example <i>Support</i>. Under <b>Sections</b>, click <b>Add existing content</b>, choose the Campaign Section, drag it into place and <b>Publish</b>. It is visible to everyone immediately, so do this after testing.</p>`, shot('c29-existing-page-sections.jpg', 'Sections on an existing page.')),
)}
`,
  },

  {
    id: 'test',
    eyebrow: 'Before you announce it',
    title: 'Test it like a buyer',
    html: `
<p>Open the page and walk through it exactly as a buyer would. This is also what you will see when you help someone over the phone.</p>
${steps(
  step('1', 'Choose quantities', `<p>Use <b>+</b> and <b>−</b>, or type a number. The buttons stop at any limit you set.</p>`, shot('w02-quantity.jpg', 'Choosing how many.')),
  step('2', 'Enter details', `<p>First and last name, email, and phone are all required. The phone number must be a US number; it is tidied up automatically, e.g. <code>(508) 555-0123</code>.</p>`, shot('w03-details.jpg', 'The buyer\'s details.')),
  step('3', 'Check the fee and total', `<p>The fee checkbox is ticked by default. The total updates as you go.</p>`, shot('w04-fee.jpg', 'Covering the processing fee.')),
  step('4', 'Continue to payment', `<p>The buyer goes to Stripe's secure payment page. The items are reserved for them for 30 minutes while they pay.</p>`, shot('w05-continue.jpg', 'Continue to payment.')),
  step('5', 'Pay on Stripe', `<p>Stripe shows the pantry's name, each item and the total. Stripe sometimes offers its quick-pay service "Link" first; buyers can click <b>Pay without Link</b> to pay normally by card.</p>`, shot('w06-stripe.jpg', 'Stripe\'s payment page.')),
  step('6', 'Changed their mind?', `<p>The back arrow at the top left returns to the form and releases the reserved items straight away.</p>`, shot('w07-stripe-back.jpg', 'Going back without paying.')),
  step('7', 'Thank-you page', `<p>After paying, the buyer returns to the same page and sees your thank-you message, their order number, and for the Duck Drop their duck numbers.</p>`, shot('w11-thank-you.jpg', 'After payment: numbers and order details.')),
  step('8', 'Confirmation email', `<p>Within a minute the email from chapter 4 arrives (check the spam folder the first time). The sale also appears in the spreadsheet.</p>`),
)}
${warn('<p><b>Do one real test purchase</b> of the cheapest item before you announce the campaign, then refund it in Stripe (chapter 8). It is the only way to be sure the payment, the email and the sheet all work. The refund costs the pantry Stripe\'s small fee, about 60 cents.</p>')}
<h3>A ticket campaign looks like this</h3>
${shot('w12-tickets.jpg', 'Tickets: several items, "Only 6 left", and a sold-out item.')}
`,
  },
];
