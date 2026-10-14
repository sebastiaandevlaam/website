import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { _internal } = require('./mailer.js');
const { buildMimeMessage, encodeHeaderText, formatMailbox, parseAddressList, resolveSender } = _internal;

const decodeBody = (message) =>
    Buffer.from(message.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');

const header = (message, name) =>
    message.split('\r\n\r\n')[0].split('\r\n').find(line => line.startsWith(`${name}: `));

describe('buildMimeMessage', () => {
    const base = {
        from: 'website@hollistonpantryshelf.org',
        fromName: 'Holliston Pantry Shelf',
        to: 'staff@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
    };

    it('builds the headers and an HTML body', () => {
        const message = buildMimeMessage(base);
        expect(header(message, 'From')).toBe('From: "Holliston Pantry Shelf" <website@hollistonpantryshelf.org>');
        expect(header(message, 'To')).toBe('To: staff@example.com');
        expect(header(message, 'Content-Type')).toBe('Content-Type: text/html; charset=UTF-8');
        expect(decodeBody(message)).toBe('<p>Hi</p>');
    });

    // The attack: a form value ends up in a header and adds a Bcc to anyone.
    it('cannot be made to inject a header through the subject or reply-to', () => {
        const message = buildMimeMessage({
            ...base,
            subject: 'Hi\r\nBcc: victim@example.com',
            replyTo: 'a@example.com\r\nBcc: victim@example.com',
        });
        const headerLines = message.split('\r\n\r\n')[0].split('\r\n');
        expect(headerLines.some(line => line.startsWith('Bcc:'))).toBe(false);
        expect(header(message, 'Reply-To')).toBeUndefined();
    });

    it('accepts several recipients from a comma-separated env var', () => {
        const message = buildMimeMessage({ ...base, to: 'a@example.com, b@example.com' });
        expect(header(message, 'To')).toBe('To: a@example.com, b@example.com');
    });

    it('refuses a message with no valid recipient', () => {
        expect(() => buildMimeMessage({ ...base, to: '' })).toThrow(/recipient/);
        expect(() => buildMimeMessage({ ...base, to: 'not an address' })).toThrow(/recipient/);
    });

    it('keeps non-ASCII body text intact and wraps base64 lines', () => {
        const html = `<p>Café — ${'x'.repeat(200)}</p>`;
        const message = buildMimeMessage({ ...base, html });
        expect(decodeBody(message)).toBe(html);
        const bodyLines = message.split('\r\n\r\n')[1].split('\r\n');
        expect(bodyLines.every(line => line.length <= 76)).toBe(true);
    });
});

describe('encodeHeaderText', () => {
    it('leaves plain ASCII alone', () => {
        expect(encodeHeaderText('New Donation - $25')).toBe('New Donation - $25');
    });

    it('encodes the em dash our subjects use', () => {
        const encoded = encodeHeaderText('New Volunteer Application — Ann');
        expect(encoded).toMatch(/^=\?UTF-8\?B\?/);
        const decoded = encoded
            .split('\r\n ')
            .map(word => Buffer.from(word.slice(10, -2), 'base64'))
            .reduce((all, part) => Buffer.concat([all, part]), Buffer.alloc(0))
            .toString('utf8');
        expect(decoded).toBe('New Volunteer Application — Ann');
    });

    it('keeps every encoded word within the 75-character limit', () => {
        const encoded = encodeHeaderText(`${'é'.repeat(80)} — end`);
        for (const word of encoded.split('\r\n ')) expect(word.length).toBeLessThanOrEqual(75);
    });
});

describe('formatMailbox', () => {
    it('quotes a name so a comma cannot become a second address', () => {
        expect(formatMailbox('a@example.com', 'Pantry, Inc "HQ"'))
            .toBe('"Pantry, Inc \\"HQ\\"" <a@example.com>');
    });
});

describe('parseAddressList', () => {
    it('drops invalid entries', () => {
        expect(parseAddressList(['ok@example.com', 'nope', ' two@example.com '])).toEqual(['ok@example.com', 'two@example.com']);
    });
});

describe('resolveSender', () => {
    const mailbox = 'website@hollistonpantryshelf.org';

    it('uses the mailbox when nothing is requested', () => {
        expect(resolveSender(undefined, mailbox, '')).toBe(mailbox);
    });

    it('allows a listed alias, case-insensitively', () => {
        expect(resolveSender('Fundraising@HollistonPantryShelf.org', mailbox, 'fundraising@hollistonpantryshelf.org'))
            .toBe('fundraising@hollistonpantryshelf.org');
    });

    // Content editors can set a campaign's sender; the service account could
    // send as anyone in the domain, so an unlisted address must not get through.
    it('falls back to the mailbox for an unlisted address', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(resolveSender('president@hollistonpantryshelf.org', mailbox, 'fundraising@hollistonpantryshelf.org'))
            .toBe(mailbox);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});
