import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DONATION_HEADER, buildDonationRow, formatDateEastern } = require('./donationRow.js');
const { OPERATION_MITTEN_HEADER, buildOperationMittenRows, makeSubmissionId } = require('./operationMittenRow.js');
const { columnLetter } = require('./sheets.js');

describe('formatDateEastern', () => {
    it('renders sortable Eastern local time', () => {
        // 2026-11-02 18:30 UTC is 13:30 EST.
        expect(formatDateEastern(Math.floor(Date.parse('2026-11-02T18:30:00Z') / 1000)))
            .toBe('2026-11-02 13:30');
    });
});

describe('donation rows', () => {
    const session = {
        id: 'cs_test_1', created: Math.floor(Date.parse('2026-11-02T18:30:00Z') / 1000),
        amount_total: 10300, customer_details: { name: 'Ada', email: 'ada@example.com' },
    };

    it('produces exactly one cell per header column', () => {
        expect(buildDonationRow(session, { donation_amount: '100' })).toHaveLength(DONATION_HEADER.length);
    });

    it('separates the chosen amount from the total charged', () => {
        const row = buildDonationRow(session, { donation_amount: '100', cover_fees: 'true' });
        expect(row[DONATION_HEADER.indexOf('Donation Amount (USD)')]).toBe(100);
        expect(row[DONATION_HEADER.indexOf('Amount Paid (USD)')]).toBe(103);
        expect(row[DONATION_HEADER.indexOf('Fees Covered')]).toBe('Yes');
    });

    it('falls back to the total for donations predating the metadata', () => {
        const row = buildDonationRow(session, {});
        expect(row[DONATION_HEADER.indexOf('Donation Amount (USD)')]).toBe(103);
    });
});

describe('Operation Mitten rows', () => {
    const at = new Date('2026-11-02T18:30:00Z');
    const submission = {
        shopperNumber: ' 1234 ', parentFirstName: 'Maria', phone: '508-555-0101',
        additionalPhone: '', holiday: 'Other', holidayOther: 'Three Kings Day',
        children: [
            { gender: 'Girl', age: '7', shirtSize: '7', interests: ['art', 'reading'],
              interestsOther: 'baking', wishes: ['Lego set', 'books', ''] },
            { gender: 'Boy', age: '11', shirtSize: 'M', interests: [], wishes: ['Nerf'] },
        ],
    };
    const rows = buildOperationMittenRows(submission, 'OM-TEST', at, formatDateEastern);
    const col = (name) => OPERATION_MITTEN_HEADER.indexOf(name);

    it('writes one row per child', () => {
        expect(rows).toHaveLength(2);
    });

    it('gives every row the full set of columns', () => {
        rows.forEach(r => expect(r).toHaveLength(OPERATION_MITTEN_HEADER.length));
    });

    it('repeats the family columns and shares one submission id', () => {
        expect(rows[0][col('Shopper #')]).toBe('1234');
        expect(rows[1][col('Shopper #')]).toBe('1234');
        expect(rows[0][col('Submission ID')]).toBe(rows[1][col('Submission ID')]);
    });

    it('numbers the children and records the family size', () => {
        expect(rows.map(r => r[col('Child #')])).toEqual([1, 2]);
        expect(rows[0][col('Children in Family')]).toBe(2);
    });

    // "Other" is a prompt, not an answer — the named holiday is what the
    // shoppers need to read.
    it('writes the named holiday rather than the word Other', () => {
        expect(rows[0][col('Holiday')]).toBe('Three Kings Day');
    });

    it('merges the free-text interest into the interests column', () => {
        expect(rows[0][col('Interests')]).toBe('art, reading, baking');
    });

    it('normalises phone numbers so every row dials the same way', () => {
        expect(rows[0][col('Phone Number')]).toBe('(508) 555-0101');
        expect(rows[0][col('Additional Phone Number')]).toBe('');
    });

    it('pads missing gift ideas to keep columns aligned', () => {
        expect(rows[1][col('Gift Idea 1')]).toBe('Nerf');
        expect(rows[1][col('Gift Idea 3')]).toBe('');
    });

    it('mints readable, distinct submission ids', () => {
        expect(makeSubmissionId(at)).toMatch(/^OM-[0-9A-Z]+-[0-9A-Z]{4}$/);
        expect(makeSubmissionId(at)).not.toBe(makeSubmissionId(at));
    });
});

describe('columnLetter', () => {
    it('maps header lengths to the right last column', () => {
        expect(columnLetter(DONATION_HEADER.length)).toBe('S');
        expect(columnLetter(OPERATION_MITTEN_HEADER.length)).toBe('X');
    });

    it('handles the two-letter boundary', () => {
        expect([1, 26, 27, 52].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AZ']);
    });
});
