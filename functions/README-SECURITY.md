# Security setup — what still needs doing by hand

Everything in this file is **optional to deploy but recommended to finish**. The
code is already in place and safe to ship as-is; the steps below switch on the
one protection that cannot be done from code alone.

---

## 1. Firebase App Check (the important one)

**Why.** The three form endpoints are public and unauthenticated. The honeypot,
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

5. **Watch the metrics.** App Check → APIs shows verified vs unverified
   requests. Wait until verified requests appear and look correct — a day is
   plenty.

6. **Turn on enforcement**, server side only:
   ```bash
   # in functions/.env.holliston-pantry-shelf
   APP_CHECK_ENFORCED=true
   ```
   ```bash
   firebase deploy --only functions
   ```

7. **Verify** by submitting each of the three forms from the real site, then
   confirm a bare `curl` POST is now rejected with 403.

**To roll back**, remove `APP_CHECK_ENFORCED` and redeploy the functions. The
client keeps sending tokens harmlessly.

---

## 2. Dependency alerts

Enable Dependabot on the GitHub repo (Settings → Code security → Dependabot
alerts + security updates). This review cleared everything that had a fix; the
next one will arrive on its own.

Four moderate advisories remain in `functions/` (`qs`, `uuid` reached through
`express` and `gaxios`, inside `firebase-functions` and `googleapis`). They have
no fix that npm can resolve without breaking the dependency tree, and both are
denial-of-service shaped rather than data-exposure shaped. Re-run
`npm audit --omit=dev` after any future `firebase-functions` upgrade.

---

## 3. Things to know, not to do

- **Contentful tokens ship in the bundle.** That is inherent to a
  client-rendered site and is what delivery/preview tokens are for. Both are
  read-only. They now come from `VITE_CONTENTFUL_*` env vars so rotating one
  does not need a code change.
- **Draft content** is only fetched when the page is framed by
  `app.contentful.com` (see `src/utils/contentfulConfig.js`), and the
  `frame-ancestors` CSP directive in `firebase.json` independently stops any
  other site framing us.
- **The rate limit is per warm instance**, not global. With `maxInstances: 10` a
  determined attacker gets roughly ten times the stated limit. Making it global
  needs Firestore, which is not enabled on this project.
- **Honeypot submissions get a success response.** That is deliberate: telling a
  bot it failed just teaches it to adapt. The row is simply never written.
- **The CSP is enforced, not report-only.** If you add a new third-party embed
  (a map, a donation widget, a font host), it will be blocked until you add its
  origin to the relevant directive in `firebase.json`. The browser console names
  the exact directive that blocked it.
