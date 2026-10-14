/**
 * Sends one test email through the Gmail API, to confirm the Workspace setup
 * (service account, domain-wide delegation, sender mailbox, aliases) before
 * deploying functions that depend on it.
 *
 * Run from the functions/ directory:
 *     node --env-file=.env --env-file=.env.holliston-pantry-shelf send-test-email.js you@example.com
 *     node --env-file=.env --env-file=.env.holliston-pantry-shelf send-test-email.js you@example.com fundraising@hollistonpantryshelf.org
 *
 * The optional second argument tests sending as an alias; it must be listed in
 * EMAIL_ALLOWED_SENDERS and set up as "Send mail as" on the sender mailbox.
 */

const { sendEmail } = require('./mailer');

async function main() {
  const [to, from] = process.argv.slice(2);
  if (!to) {
    console.error('Usage: node --env-file=... send-test-email.js <to> [from-alias]');
    process.exit(1);
  }

  await sendEmail({
    to,
    from,
    subject: 'Test email from the Holliston Pantry Shelf website — ✓',
    html: '<p style="font-family:sans-serif">If you can read this, and the dash and check mark in the subject look right, website email is set up correctly.</p>',
  });
  console.log(`Sent to ${to}. Check the From address and that it is in the sender mailbox's Sent folder.`);
}

main().catch(err => {
  console.error('Send failed:', err.response?.data?.error || err.message);
  process.exit(1);
});
