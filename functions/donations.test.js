import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let safeReturnUrl;
beforeAll(() => {
    process.env.SITE_URL = 'https://hollistonpantryshelf.org';
    ({ safeReturnUrl } = require('./donations.js')._internal);
});

// Stripe redirects the donor to success_url from its own domain immediately
// after payment. Left unchecked, anyone can mint a session that lands a real
// donor on a page they control at the exact moment the donor expects a receipt.
describe('safeReturnUrl', () => {
    it('keeps our own origin', () => {
        expect(safeReturnUrl('https://hollistonpantryshelf.org/donate'))
            .toBe('https://hollistonpantryshelf.org/donate');
    });

    it('rejects another origin', () => {
        expect(safeReturnUrl('https://evil.example/thanks'))
            .toBe('https://hollistonpantryshelf.org/donate');
    });

    it('rejects a lookalike subdomain', () => {
        expect(safeReturnUrl('https://hollistonpantryshelf.org.evil.example/x'))
            .toBe('https://hollistonpantryshelf.org/donate');
    });

    it('rejects a javascript: url', () => {
        expect(safeReturnUrl('javascript:alert(1)'))
            .toBe('https://hollistonpantryshelf.org/donate');
    });

    it('rejects an unparseable value', () => {
        expect(safeReturnUrl('not a url')).toBe('https://hollistonpantryshelf.org/donate');
    });

    it('falls back when absent', () => {
        expect(safeReturnUrl(undefined)).toBe('https://hollistonpantryshelf.org/donate');
        expect(safeReturnUrl('')).toBe('https://hollistonpantryshelf.org/donate');
    });

    // Query and hash are dropped: we append our own ?payment=success&amount=…
    it('strips any query or fragment the caller supplied', () => {
        expect(safeReturnUrl('https://hollistonpantryshelf.org/donate?x=1#y'))
            .toBe('https://hollistonpantryshelf.org/donate');
    });

    it('still allows localhost so the emulator flow works', () => {
        expect(safeReturnUrl('http://localhost:5173/donate')).toBe('http://localhost:5173/donate');
    });
});
