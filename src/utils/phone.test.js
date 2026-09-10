import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { isValidUsPhone, formatUsPhone, toNationalDigits } from './phone';

const require = createRequire(import.meta.url);
const server = require('../../functions/phone.js');

const VALID = ['5085550101', '508-555-0101', '(508) 555-0101', '508.555.0101',
    '+1 508 555 0101', '1-508-555-0101', '  508 555 0101  ', '2085550101'];

// Rejected for a reason, not by accident: too short/long, an area or exchange
// code starting 0 or 1, an N11 service code, or simply not a US number.
const INVALID = ['', 'abc', '555', '50855501', '50855501011', '1085550101',
    '0085550101', '508-155-0101', '911-555-0101', '411-555-0101',
    '508-911-0101', '+44 20 7946 0958'];

describe('isValidUsPhone', () => {
    it.each(VALID)('accepts %s', (v) => expect(isValidUsPhone(v)).toBe(true));
    it.each(INVALID)('rejects %s', (v) => expect(isValidUsPhone(v)).toBe(false));
});

describe('formatUsPhone', () => {
    it('normalises every accepted spelling to one shape', () => {
        VALID.filter(v => v.includes('508')).forEach(v =>
            expect(formatUsPhone(v)).toBe('(508) 555-0101'));
    });

    it('leaves input it cannot parse untouched rather than mangling it', () => {
        expect(formatUsPhone('555')).toBe('555');
        expect(formatUsPhone('abc')).toBe('abc');
        expect(formatUsPhone('')).toBe('');
        expect(formatUsPhone(null)).toBe('');
    });
});

describe('toNationalDigits', () => {
    it('drops a leading country code', () => {
        expect(toNationalDigits('1-508-555-0101')).toBe('5085550101');
    });

    it('returns null when the digit count cannot be a US number', () => {
        expect(toNationalDigits('12345')).toBeNull();
        expect(toNationalDigits('25085550101')).toBeNull(); // 11 digits not starting with 1
    });
});

// The site and the Cloud Functions deploy separately and cannot import across
// that boundary, so the rules exist twice. If they ever drift, a number the
// form accepts would be rejected by the server (or worse, the reverse).
describe('client and server implementations agree', () => {
    const inputs = [...VALID, ...INVALID, null, undefined, '  ', '508 555 0101'];

    it('agree on validity and formatting for every case', () => {
        inputs.forEach(v => {
            expect([isValidUsPhone(v), formatUsPhone(v)])
                .toEqual([server.isValidUsPhone(v), server.formatUsPhone(v)]);
        });
    });
});
