// Abuse controls for the three public, unauthenticated form endpoints.
//
// Layered deliberately, because no single layer is sufficient:
//
//   CORS allowlist  stops another website posting from a visitor's browser.
//                   Does nothing against curl — it is not an access control.
//   Honeypot        catches bots that fill every field they find.
//   Timing          catches bots that submit faster than a human can type.
//   Rate limit      caps how much damage one source can do in a burst.
//   App Check       the only layer that actually proves the request came from
//                   our own site. Off until it is configured — see README-SECURITY.md.

const cors = require('cors');

const ALLOWED_ORIGINS = [
  'https://hollistonpantryshelf.org',
  'https://www.hollistonpantryshelf.org',
  'https://holliston-pantry-shelf.web.app',
  'https://holliston-pantry-shelf.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Reflects only known origins. A request with no Origin header (curl, server to
// server, some privacy tooling) is allowed through to the handler, where the
// remaining layers still apply — rejecting those would break nothing an
// attacker relies on while breaking legitimate non-browser callers.
const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(null, false);
  },
});

// ── App Check ───────────────────────────────────────────────────────────────
// Verifies the request carries a token minted by our own site via reCAPTCHA.
// Enforced only when APP_CHECK_ENFORCED=true, so deploying this code changes
// nothing until the console side is set up and verified.

let appCheckModule;
async function verifyAppCheck(req) {
  if (process.env.APP_CHECK_ENFORCED !== 'true') return { ok: true, skipped: true };

  const token = req.header('X-Firebase-AppCheck');
  if (!token) return { ok: false, reason: 'missing App Check token' };

  try {
    if (!appCheckModule) {
      const { initializeApp, getApps } = require('firebase-admin/app');
      if (getApps().length === 0) initializeApp();
      appCheckModule = require('firebase-admin/app-check');
    }
    await appCheckModule.getAppCheck().verifyToken(token);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `invalid App Check token: ${err.message}` };
  }
}

// ── Honeypot and timing ─────────────────────────────────────────────────────

// A field hidden from people but present in the DOM. Anything that fills it in
// is automated.
const HONEYPOT_FIELD = 'contactPreference';

// Nobody completes a multi-field form this fast.
const MIN_FILL_SECONDS = 3;

function looksAutomated(body) {
  if (body?.[HONEYPOT_FIELD]) return 'honeypot filled';

  const loadedAt = Number(body?.formLoadedAt);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const seconds = (Date.now() - loadedAt) / 1000;
    // Negative means a clock skew or a forged value; only reject the too-fast
    // case, so a user with a wrong system clock is never locked out.
    if (seconds >= 0 && seconds < MIN_FILL_SECONDS) return `submitted in ${seconds.toFixed(1)}s`;
  }
  return null;
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// In-memory, so the window is per warm instance rather than global. With
// maxInstances: 10 a determined attacker gets roughly 10x the limit — this
// blunts bursts, it does not stop a distributed flood. Firestore would make it
// global; it is not enabled on this project, and the cost/benefit did not
// justify turning it on for a pantry form.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function clientKey(req) {
  const forwarded = req.header('X-Forwarded-For') || '';
  return forwarded.split(',')[0].trim() || req.ip || 'unknown';
}

function rateLimit(req) {
  const key = clientKey(req);
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic sweep so the map cannot grow without bound on a long-lived
  // instance.
  if (hits.size > 500) {
    for (const [k, times] of hits) {
      if (times.every(t => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return recent.length > MAX_PER_WINDOW
    ? { ok: false, reason: `${recent.length} submissions in ${WINDOW_MS / 60000}m` }
    : { ok: true };
}

// ── Input caps ──────────────────────────────────────────────────────────────
// Nothing on these forms is legitimately long, and every value ends up in a
// spreadsheet cell or an email. Truncating server-side keeps a single request
// from writing a megabyte into either.

const DEFAULT_MAX = 500;

function capString(value, max = DEFAULT_MAX) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

function capStringArray(value, max = DEFAULT_MAX, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(v => capString(v, max));
}

// ── Combined gate ───────────────────────────────────────────────────────────

// Runs every layer that applies to a form post. Returns null to proceed, or a
// response description for the caller to send.
//
// `silent` endpoints answer a bot with the same success shape a person gets, so
// spam tooling has nothing to tune against; the submission is simply dropped.
async function screenRequest(req, { checkAutomation = true } = {}) {
  const appCheck = await verifyAppCheck(req);
  if (!appCheck.ok) {
    console.warn('App Check rejected:', appCheck.reason);
    return { status: 403, body: { error: 'Request could not be verified. Please reload the page and try again.' } };
  }

  const limit = rateLimit(req);
  if (!limit.ok) {
    console.warn('Rate limited:', clientKey(req), limit.reason);
    return { status: 429, body: { error: 'Too many submissions. Please wait a few minutes and try again.' } };
  }

  if (checkAutomation) {
    const automated = looksAutomated(req.body);
    if (automated) {
      console.warn('Dropped automated submission:', automated);
      return { status: 200, body: { success: true }, dropped: true };
    }
  }

  return null;
}

module.exports = {
  ALLOWED_ORIGINS,
  corsMiddleware,
  screenRequest,
  verifyAppCheck,
  looksAutomated,
  rateLimit,
  capString,
  capStringArray,
  HONEYPOT_FIELD,
  MIN_FILL_SECONDS,
  __testing: { hits },
};
