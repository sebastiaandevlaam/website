import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
    ALLOWED_ORIGINS, looksAutomated, rateLimit, capString, capStringArray,
    verifyAppCheck, HONEYPOT_FIELD, MIN_FILL_SECONDS, __testing,
} = require('./security.js');

const reqWithIp = (ip) => ({ header: (h) => (h === 'X-Forwarded-For' ? ip : undefined), ip });

beforeEach(() => {
    __testing.hits.clear();
    delete process.env.APP_CHECK_ENFORCED;
});

describe('CORS allowlist', () => {
    it('covers production, both Firebase domains and local dev', () => {
        expect(ALLOWED_ORIGINS).toContain('https://hollistonpantryshelf.org');
        expect(ALLOWED_ORIGINS).toContain('https://www.hollistonpantryshelf.org');
        expect(ALLOWED_ORIGINS).toContain('http://localhost:5173');
    });

    it('does not contain a wildcard', () => {
        expect(ALLOWED_ORIGINS).not.toContain('*');
    });
});

// Exercises the middleware itself rather than the constant. Note this cannot be
// verified against the Functions emulator: the emulator wraps every onRequest in
// permissive CORS for local convenience (firebase-functions enables it via the
// "enableCors" debug feature), which masks the allowlist. Deployed, that wrapper
// is not applied and only this middleware runs.
describe('corsMiddleware', () => {
    const { corsMiddleware } = require('./security.js');

    const preflight = (origin) => {
        const headers = {};
        const req = { method: 'OPTIONS', headers: { origin }, header: (h) => (h.toLowerCase() === 'origin' ? origin : undefined) };
        const res = { setHeader: (k, v) => { headers[k] = v; }, getHeader: (k) => headers[k], end: () => {}, statusCode: 200 };
        corsMiddleware(req, res, () => {});
        return headers['Access-Control-Allow-Origin'];
    };

    it('reflects an allowed origin', () => {
        expect(preflight('https://hollistonpantryshelf.org')).toBe('https://hollistonpantryshelf.org');
    });

    it('sends no allow-origin for an unknown site, so the browser blocks it', () => {
        expect(preflight('https://evil.example')).toBeUndefined();
    });

    it('is not fooled by a lookalike suffix', () => {
        expect(preflight('https://hollistonpantryshelf.org.evil.example')).toBeUndefined();
    });
});

describe('looksAutomated', () => {
    it('flags a filled honeypot', () => {
        expect(looksAutomated({ [HONEYPOT_FIELD]: 'http://spam' })).toMatch(/honeypot/);
    });

    it('ignores an empty honeypot', () => {
        expect(looksAutomated({ [HONEYPOT_FIELD]: '' })).toBeNull();
    });

    it('flags a submission faster than a person can type', () => {
        expect(looksAutomated({ formLoadedAt: Date.now() - 500 })).toMatch(/submitted in/);
    });

    it('accepts a realistic fill time', () => {
        expect(looksAutomated({ formLoadedAt: Date.now() - (MIN_FILL_SECONDS + 30) * 1000 })).toBeNull();
    });

    // A user whose system clock is ahead would otherwise be permanently blocked.
    it('does not reject a future timestamp from a skewed clock', () => {
        expect(looksAutomated({ formLoadedAt: Date.now() + 600000 })).toBeNull();
    });

    it('accepts a submission with no timing field at all', () => {
        expect(looksAutomated({})).toBeNull();
    });
});

describe('rateLimit', () => {
    it('allows a normal burst then blocks', () => {
        const req = reqWithIp('1.2.3.4');
        for (let i = 0; i < 8; i++) expect(rateLimit(req).ok).toBe(true);
        expect(rateLimit(req).ok).toBe(false);
    });

    it('tracks each client separately', () => {
        const a = reqWithIp('1.1.1.1'), b = reqWithIp('2.2.2.2');
        for (let i = 0; i < 9; i++) rateLimit(a);
        expect(rateLimit(a).ok).toBe(false);
        expect(rateLimit(b).ok).toBe(true);
    });

    it('uses the first X-Forwarded-For hop, not the whole chain', () => {
        const proxied = { header: () => '9.9.9.9, 10.0.0.1', ip: '10.0.0.1' };
        for (let i = 0; i < 9; i++) rateLimit(proxied);
        expect(rateLimit(reqWithIp('9.9.9.9')).ok).toBe(false);
    });
});

describe('input caps', () => {
    it('truncates rather than rejecting', () => {
        expect(capString('x'.repeat(9000)).length).toBe(500);
        expect(capString('x'.repeat(9000), 10)).toBe('x'.repeat(10));
    });

    it('coerces null and undefined to empty strings', () => {
        expect(capString(null)).toBe('');
        expect(capString(undefined)).toBe('');
    });

    it('caps both item length and item count', () => {
        expect(capStringArray(Array(200).fill('abc'), 2, 5)).toEqual(['ab', 'ab', 'ab', 'ab', 'ab']);
    });

    it('returns an empty array for a non-array', () => {
        expect(capStringArray('not an array')).toEqual([]);
        expect(capStringArray(null)).toEqual([]);
    });
});

describe('App Check', () => {
    it('is skipped while unconfigured, so deploying changes nothing', async () => {
        const r = await verifyAppCheck({ header: () => undefined });
        expect(r).toEqual({ ok: true, skipped: true });
    });

    it('rejects a request with no token once enforced', async () => {
        process.env.APP_CHECK_ENFORCED = 'true';
        const r = await verifyAppCheck({ header: () => undefined });
        expect(r.ok).toBe(false);
        expect(r.reason).toMatch(/missing/i);
    });
});
