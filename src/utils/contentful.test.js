import { describe, it, expect } from 'vitest';
import { backgroundClass, sectionId, formatPostDate, isWithinWindow, toHttpsUrl, safeHref } from './contentful';

describe('backgroundClass', () => {
    it('maps the Contentful values', () => {
        expect(backgroundClass('Beige Background')).toBe('bg-beige');
        expect(backgroundClass('Image Background')).toBe('bg-image');
    });

    // The field is free text, so an editor typo must degrade to the default
    // rather than produce a section with no background class at all.
    it('falls back for an unknown or missing value', () => {
        expect(backgroundClass('beige background')).toBe('bg-default');
        expect(backgroundClass(undefined)).toBe('bg-default');
        expect(backgroundClass('Red Background', 'bg-red')).toBe('bg-red');
        expect(backgroundClass(undefined, 'bg-red')).toBe('bg-red');
    });
});

describe('sectionId', () => {
    it('prefers an anchor from the button url', () => {
        expect(sectionId('#donate', 'Some Title', 'fallback')).toBe('donate');
    });

    it('ignores a non-anchor url and slugifies the title', () => {
        expect(sectionId('https://example.com', 'How Kids Can Help', 'x')).toBe('how-kids-can-help');
    });

    it('collapses runs of whitespace in a title', () => {
        expect(sectionId(null, 'Get   Help  Now', 'x')).toBe('get-help-now');
    });

    it('uses the fallback when there is neither', () => {
        expect(sectionId(undefined, undefined, 'contact')).toBe('contact');
    });
});

describe('formatPostDate', () => {
    it('formats a publish date', () => {
        expect(formatPostDate('2026-02-14T00:00:00Z')).toMatch(/February 1[34], 2026/);
    });

    it('returns null for no date rather than "Invalid Date"', () => {
        expect(formatPostDate(null)).toBeNull();
        expect(formatPostDate(undefined)).toBeNull();
    });
});

describe('isWithinWindow', () => {
    const now = new Date('2026-06-15T12:00:00Z');

    it('is open when unbounded', () => {
        expect(isWithinWindow(null, null, now)).toBe(true);
    });

    it('is closed before the start and after the end', () => {
        expect(isWithinWindow('2026-07-01', null, now)).toBe(false);
        expect(isWithinWindow(null, '2026-06-01', now)).toBe(false);
    });

    it('is open inside the window', () => {
        expect(isWithinWindow('2026-06-01', '2026-07-01', now)).toBe(true);
    });
});

describe('toHttpsUrl', () => {
    it('upgrades Contentful protocol-relative urls', () => {
        expect(toHttpsUrl('//images.ctfassets.net/a.png')).toBe('https://images.ctfassets.net/a.png');
    });

    it('leaves absolute urls and empty values alone', () => {
        expect(toHttpsUrl('https://x/a.png')).toBe('https://x/a.png');
        expect(toHttpsUrl(undefined)).toBeUndefined();
    });
});

// Editors are trusted, but a compromised CMS account should not be able to put
// script behind a button on the live site.
describe('safeHref', () => {
    it('allows the schemes a link on this site needs', () => {
        ['https://x.example', 'http://x.example', 'mailto:a@b.c', 'tel:+15085550101', '/news', '#contact']
            .forEach(u => expect(safeHref(u)).toBe(u));
    });

    it('blocks javascript: in any casing or padding', () => {
        expect(safeHref('javascript:alert(1)')).toBe('#');
        expect(safeHref('  JavaScript:alert(1)')).toBe('#');
        expect(safeHref('JaVaScRiPt:alert(1)')).toBe('#');
    });

    it('blocks data: and vbscript:', () => {
        expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
        expect(safeHref('vbscript:msgbox(1)')).toBe('#');
    });

    it('passes through empty values unchanged', () => {
        expect(safeHref(undefined)).toBeUndefined();
        expect(safeHref('')).toBe('');
    });
});
