import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { escapeHtml, escapeSubject, row, mailtoCell } = require('./email.js');

describe('escapeHtml', () => {
    it('neutralises a script tag', () => {
        expect(escapeHtml('<script>alert(1)</script>'))
            .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    // The actual attack this guards: a volunteer types a link into the name
    // field and the coordinator receives a live phishing link from our own
    // verified sending domain.
    it('neutralises an injected anchor', () => {
        const out = escapeHtml('<a href="https://evil.example">Approve now</a>');
        expect(out).not.toContain('<a ');
        expect(out).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;');
    });

    it('escapes attribute-breaking quotes', () => {
        expect(escapeHtml(`" onmouseover="alert(1)`))
            .toBe('&quot; onmouseover=&quot;alert(1)');
        expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('escapes ampersands first so entities are not double-decoded', () => {
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('renders empty for null and undefined rather than the words', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(0)).toBe('0');
    });
});

describe('escapeSubject', () => {
    it('strips newlines that could inject extra mail headers', () => {
        expect(escapeSubject('Hi\r\nBcc: victim@example.com'))
            .toBe('Hi Bcc: victim@example.com');
    });
});

describe('row', () => {
    it('escapes the value by default', () => {
        expect(row('Name', '<b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;');
    });

    it('escapes the label too', () => {
        expect(row('<b>L</b>', 'v')).toContain('&lt;b&gt;L&lt;/b&gt;');
    });

    it('omits the row entirely when the value is empty', () => {
        expect(row('Name', '')).toBe('');
        expect(row('Name', null)).toBe('');
    });

    it('passes markup through only when explicitly asked', () => {
        expect(row('Email', '<a href="#">e</a>', { html: true })).toContain('<a href="#">e</a>');
    });
});

describe('mailtoCell', () => {
    it('escapes the visible address', () => {
        expect(mailtoCell('a<b>@example.com')).toContain('a&lt;b&gt;@example.com');
    });

    it('encodes the href so a quote cannot break out of the attribute', () => {
        const out = mailtoCell('x"@example.com');
        expect(out).not.toMatch(/href="mailto:x"@/);
    });
});
