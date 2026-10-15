# Security setup — what still needs doing by hand

Everything in this file needs manual setup that cannot be done from code.
Section 2 (email) is **required before the next functions deploy**, and
section 3 before the first campaign goes live; the rest is optional to deploy
but recommended to finish.

---

## 1. Firebase App Check (the important one)

**Why.** The form endpoints (including campaign checkout) are public and unauthenticated. The honeypot,
timing check and rate limit in `security.js` stop casual and scripted abuse, but
none of them *prove* a request came from our website — anyone who reads the
JavaScript can craft a valid-looking POST with `curl`. App Check is the only
layer that actually verifies origin.

**Current state.** All the code is written and inert. `APP_CHECK_ENFORCED` is
unset, so `verifyAppCheck()` returns `{ ok: true, skipped: true }` and nothing is
rejected. The client only loads the Firebase SDK if `VITE_RECAPTCHA_SITE_KEY` is
set, so there is no bundle cost until you turn it on.

**Do it in this order — enabling the server before the client blocks every real
submission.**

1. **Register a reCAPTCHA v3 site key**
   - <https://www.google.com/recaptcha/admin/create>
   - Label: `Holliston Pantry Shelf`, type **reCAPTCHA v3**
   - Domains: `hollistonpantryshelf.org`, `www.hollistonpantryshelf.org`,
     `holliston-pantry-shelf.web.app`, and `localhost` for testing
   - Copy the **site key** (public) and the **secret key** (private)

2. **Register App Check in Firebase**
   - Firebase console → **Build → App Check → Apps**
   - Register the Web app with the **reCAPTCHA v3** provider, pasting the
     *secret* key
   - Leave enforcement **off** for now

3. **Get the web app config**
   - Firebase console → **Project settings → General → Your apps → Web app**
   - Copy `apiKey` and `appId`

4. **Set the client env vars** in `.env.production` (and `.env.development` to
   test locally), then rebuild and deploy the site:
   ```
   VITE_RECAPTCHA_SITE_KEY=<reCAPTCHA site key>
   VITE_FIREBASE_API_KEY=<apiKey>
   VITE_FIREBASE_APP_ID=<appId>
   ```
   At this point the site sends tokens and the server still ignores them.
   Submit each form once and confirm they all still work.

5. **Watch the logs, not the console.** These are plain HTTP `onRequest`
   functions, so Firebase verifies nothing for us — the App Check console's
   per-API metrics cover Firestore, Storage and Auth, and its Functions row only
   links to documentation. There is no metric for our endpoints.

   Use observe mode instead: it verifies every request and logs the outcome
   without ever rejecting one.
   ```bash
   # functions/.env.holliston-pantry-shelf
   APP_CHECK_OBSERVE=true
   ```
   ```bash
   firebase deploy --only functions
   firebase functions:log --only submitOperationMitten | grep appcheck
   ```
   Leave it a day, then count: `appcheck: VALID token` lines are real traffic
   that would survive enforcement, `appcheck: WOULD REJECT` lines are traffic
   that would be blocked. Only enforce once the rejects are bots rather than
   families.

6. **Turn on enforcement**, server side only. Replace the observe flag:
   ```bash
   # in functions/.env.holliston-pantry-shelf
   APP_CHECK_ENFORCED=true     # and remove APP_CHECK_OBSERVE
   ```
   If both are set, enforcing wins.
   ```bash
   firebase deploy --only functions
   ```

7. **Verify** by submitting each form from the real site (and starting one
   campaign checkout), then
   confirm a bare `curl` POST is now rejected with 403.

**To roll back**, remove `APP_CHECK_ENFORCED` and redeploy the functions. The
client keeps sending tokens harmlessly.

---

## 2. Website email through Google Workspace

**Why.** Email used to go through Resend, whose free plan stops at 100 messages
a day — fine for staff alerts, not for ticket and fundraiser confirmations.
Sending through our own Workspace costs nothing extra, allows roughly 2,000 a
day per mailbox, keeps copies in the mailbox's Sent folder, and uses the DKIM
signing Google already does for the domain.

**Current state.** `functions/mailer.js` sends everything as
`website@hollistonpantryshelf.org` via the Gmail API. Until the steps below are
done, the volunteer form returns an error and donation alerts are logged as
failed (the donation sheet row is unaffected). **Finish these before deploying
functions.**

1. **Create the mailbox.** Admin console → Directory → Users → add
   `website@hollistonpantryshelf.org`. It must be a real user, not a group:
   the Gmail API can only act as a user. A dedicated mailbox matters — if the
   daily limit is ever hit, Google blocks that mailbox's sending for up to a
   day, and that should never be someone's own inbox.

2. **Create a separate service account.** Google Cloud console, project
   `holliston-pantry-shelf` → IAM & Admin → Service Accounts → Create, e.g.
   `website-mailer`. Grant it no roles. Open it → Keys → Add key → JSON.
   *Do not reuse the sheets service account*: delegation (next step) lets this
   key send as anyone in the domain, so it should unlock nothing else. If key
   creation is blocked, the organisation policy
   `iam.disableServiceAccountKeyCreation` is on; an org admin can exempt this
   project.

3. **Enable the Gmail API** in the same project: APIs & Services → Library →
   Gmail API → Enable.

4. **Authorise domain-wide delegation** (needs a Workspace super admin).
   Admin console → Security → Access and data control → API controls → Manage
   Domain Wide Delegation → Add new:
   - Client ID: the service account's numeric *Unique ID* (on its details page)
   - OAuth scopes: `https://www.googleapis.com/auth/gmail.send` — only this one

   It usually works within minutes but can take up to 24 hours.

5. **Set the function env vars** in `functions/.env.holliston-pantry-shelf`,
   and remove `RESEND_API_KEY` and `RESEND_FROM`:
   ```bash
   GMAIL_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'   # the key, on one line
   EMAIL_SENDER_MAILBOX=website@hollistonpantryshelf.org
   EMAIL_FROM_NAME=Holliston Pantry Shelf        # optional, this is the default
   EMAIL_ALLOWED_SENDERS=                        # optional, see step 7
   ```

6. **Test before deploying**, from `functions/`:
   ```bash
   node --env-file=.env --env-file=.env.holliston-pantry-shelf send-test-email.js you@example.com
   ```
   Errors map to steps: `unauthorized_client` → step 4 (wrong client ID or
   scope, or not propagated yet); `Gmail API has not been used` → step 3;
   `invalid_grant` → the mailbox in step 1 does not exist.

7. **Aliases, only when a campaign needs its own sender** (e.g.
   `fundraising@`). Admin console → the `website@` user → Add alternate email;
   then in `website@`'s Gmail → Settings → Accounts → Send mail as → add it.
   Add the address to `EMAIL_ALLOWED_SENDERS` (comma-separated) and test with
   `send-test-email.js you@example.com fundraising@hollistonpantryshelf.org`.
   An address that is not a Send-as alias is silently rewritten by Gmail to
   `website@`; one that is not in the allowlist is replaced by `website@` in
   code, with a warning in the logs.

8. **Deploy and retire Resend.** `firebase deploy --only functions`, submit the
   volunteer form once, then delete the Resend API key and remove Resend's DNS
   records (its DKIM record and any SPF `include`) from the domain.

---

## 3. Paid campaigns (Duck Drop, event tickets)

**Why.** `functions/campaigns.js` sells items defined in Contentful through
Stripe Checkout, counts stock in Firestore, writes each campaign's own sheet,
and emails the buyer through section 2. None of it works until the steps below
are done. Section 2 must be finished first — the buyer email depends on it.

1. **Function env vars** in `functions/.env.holliston-pantry-shelf` — the same
   read-only values the site uses (`VITE_CONTENTFUL_*` in `.env.production`):
   ```bash
   CONTENTFUL_SPACE_ID=<space id>
   CONTENTFUL_ENVIRONMENT=master
   CONTENTFUL_DELIVERY_TOKEN=<delivery token>
   ```
   The server reads prices, caps and sheet ids from Contentful itself and
   ignores any price the browser sends.

2. **Stripe webhook events.** Stripe dashboard → Developers → Webhooks → the
   existing `stripeWebhook` endpoint → add the event
   **`checkout.session.expired`** next to `checkout.session.completed`.
   Without it, abandoned checkouts still release their stock, just ~35 minutes
   later instead of ~30.

3. **Firestore access.** Firestore (`(default)` database) is already enabled
   and shared with the shopper apps. The functions use the Admin SDK, which
   ignores security rules, and write only to `websiteCampaigns` and
   `websiteCampaignOrders`. In the Firebase console → Firestore → Rules,
   confirm no rule grants the public read access to those collections (a
   catch-all `match /{document=**}` with `allow read: if true` would expose
   buyers' names and emails). **Do not deploy rules from this repo** — they
   would replace the shopper apps' rules.

4. **Per campaign — a spreadsheet (optional).** Every order is stored in
   Firestore regardless; the sheet is the staff-facing copy, and only orders
   placed after the id is set are written to it. Create a Google Sheet, leave the first
   tab named `Sheet1`, and share it as **Editor** with the sheets service
   account (`client_email` in `GOOGLE_SERVICE_ACCOUNT_JSON`). Paste its id into
   the campaign's `spreadsheetId` field. The header row is written on the first
   sale. Keep the sheet's link sharing restricted: Contentful content is
   public, so the id is too.

5. **Per campaign — optional sender alias** (e.g. `ducks@`): set it up as in
   section 2, step 7, then put it in the campaign's `confirmationEmailFrom`.

6. **Test in Stripe test mode** before going live: run a purchase with card
   `4242 4242 4242 4242`, check the sheet row, the email, and (for a numbered
   campaign) the numbers on the thank-you page. Then cancel one checkout on
   the Stripe page and confirm availability goes back up.

**Refunds** stay manual: refund in Stripe and mark the sheet row. A refund does
not lower the sold count, so on a capped campaign give the places back by
lowering `reservedSpots` by that many (or raising `totalCap` once
`reservedSpots` is 0). Duck numbers are never reused.

---

## 4. Dependency alerts

Enable Dependabot on the GitHub repo (Settings → Code security → Dependabot
alerts + security updates). This review cleared everything that had a fix; the
next one will arrive on its own.

Four moderate advisories remain in `functions/` (`qs`, `uuid` reached through
`express` and `gaxios`, inside `firebase-functions` and `googleapis`). They have
no fix that npm can resolve without breaking the dependency tree, and both are
denial-of-service shaped rather than data-exposure shaped. Re-run
`npm audit --omit=dev` after any future `firebase-functions` upgrade.

---

## 5. Things to know, not to do

- **Contentful tokens ship in the bundle.** That is inherent to a
  client-rendered site and is what delivery/preview tokens are for. Both are
  read-only. They now come from `VITE_CONTENTFUL_*` env vars so rotating one
  does not need a code change.
- **Draft content** is only fetched when the page is framed by
  `app.contentful.com` (see `src/utils/contentfulConfig.js`), and the
  `frame-ancestors` CSP directive in `firebase.json` independently stops any
  other site framing us.
- **The rate limit is per warm instance**, not global. With `maxInstances: 10` a
  determined attacker gets roughly ten times the stated limit. Firestore is
  enabled (paid campaigns use it) and could make it global, at a write per post.
- **Honeypot submissions get a success response.** That is deliberate: telling a
  bot it failed just teaches it to adapt. The row is simply never written.
- **The CSP is enforced, not report-only.** If you add a new third-party embed
  (a map, a donation widget, a font host), it will be blocked until you add its
  origin to the relevant directive in `firebase.json`. The browser console names
  the exact directive that blocked it.
