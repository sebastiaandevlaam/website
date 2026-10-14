import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
    normalizeCampaign, isOpen, processingFeeCents, priceOrder,
    availability, applyHold, releaseHold, applySale, formatNumbers, makeOrderId,
} = require('./campaignOrder.js');
const { NUMBERED_HEADER, TICKETS_HEADER, buildCampaignRows } = require('./campaignRow.js');
const { renderCampaignEmail } = require('./campaignEmail.js');
const { formatDateEastern } = require('./donationRow.js');
const { _internal: { validateBuyer } } = require('./campaigns.js');

const item = (id, fields) => ({ sys: { id }, fields });

const ducks = normalizeCampaign({
    fields: {
        campaignId: 'duck-drop-2026', name: 'Duck Drop 2026', campaignType: 'Numbered',
        items: [
            item('duck', { name: 'Duck', price: 10 }),
            item('pack', { name: '5-pack', price: 40, unitsPerItem: 5 }),
        ],
    },
});

const gala = normalizeCampaign({
    fields: {
        campaignId: 'gala-2027', name: 'Gala', campaignType: 'Tickets',
        totalCap: 100, reservedSpots: 10, maxPerOrder: 8,
        items: [
            item('adult', { name: 'Adult', price: 40, fairMarketValue: 25, maxPerOrder: 6 }),
            item('family', { name: 'Family', price: 100, unitsPerItem: 4, fairMarketValue: 60, totalCap: 5 }),
            item('free', { name: 'Broken', price: 0 }),
        ],
    },
});

describe('normalizeCampaign', () => {
    it('reads the type, caps and items', () => {
        expect(ducks.numbered).toBe(true);
        expect(gala.numbered).toBe(false);
        expect(gala.totalCap).toBe(100);
        expect(ducks.totalCap).toBeNull();
        expect(gala.items.find(i => i.id === 'family')).toMatchObject({ priceCents: 10000, unitsPerItem: 4, totalCap: 5 });
    });

    // An item with no price must never be sold for $0.
    it('drops items without a price', () => {
        expect(gala.items.map(i => i.id)).toEqual(['adult', 'family']);
    });
});

describe('isOpen', () => {
    const c = { openDate: '2027-01-01T00:00:00Z', closeDate: '2027-02-01T00:00:00Z' };
    it('respects the window', () => {
        expect(isOpen(c, new Date('2026-12-31T00:00:00Z'))).toBe(false);
        expect(isOpen(c, new Date('2027-01-15T00:00:00Z'))).toBe(true);
        expect(isOpen(c, new Date('2027-02-02T00:00:00Z'))).toBe(false);
        expect(isOpen({}, new Date())).toBe(true);
    });
});

describe('processingFeeCents', () => {
    // Must equal the donation form's formula, so the pantry nets the subtotal.
    it('grosses up for 2.9% + 30c', () => {
        for (const subtotal of [1000, 4000, 12345, 100000]) {
            const fee = processingFeeCents(subtotal);
            const gross = subtotal + fee;
            expect(gross - Math.round(gross * 0.029) - 30).toBeGreaterThanOrEqual(subtotal);
            expect(fee).toBe(Math.ceil((subtotal / 100 + 0.30) / (1 - 0.029) * 100) - subtotal);
        }
    });
});

describe('priceOrder', () => {
    it('prices from Contentful, never from the request', () => {
        const { order } = priceOrder(gala, { adult: 2, family: 1 }, false);
        expect(order.subtotalCents).toBe(18000);
        expect(order.units).toBe(6);
        expect(order.itemCount).toBe(3);
        expect(order.feeCents).toBe(0);
        expect(order.fairMarketValueCents).toBe(11000);
    });

    it('adds the fee only when asked', () => {
        const { order } = priceOrder(ducks, { duck: 3 }, true);
        expect(order.feeCents).toBe(processingFeeCents(3000));
        expect(order.totalCents).toBe(3000 + order.feeCents);
        expect(order.fairMarketValueCents).toBeNull();
    });

    it('rejects unknown items, bad quantities and empty orders', () => {
        expect(priceOrder(gala, { nope: 1 }, false).error).toMatch(/no longer available/);
        expect(priceOrder(gala, { adult: 1.5 }, false).error).toMatch(/valid quantity/);
        expect(priceOrder(gala, { adult: -1 }, false).error).toMatch(/valid quantity/);
        expect(priceOrder(gala, { adult: 0 }, false).error).toMatch(/at least one/);
        expect(priceOrder(gala, null, false).error).toMatch(/at least one/);
    });

    it('enforces per-item and per-order caps', () => {
        expect(priceOrder(gala, { adult: 7 }, false).error).toMatch(/up to 6 × Adult/);
        expect(priceOrder(gala, { adult: 6, family: 3 }, false).error).toMatch(/up to 8 per order/);
    });
});

describe('capacity', () => {
    const now = 1_000_000;
    const { order } = priceOrder(gala, { family: 2 }, false); // 8 places

    it('subtracts reserved spots, sales and live holds', () => {
        const state = { soldUnits: 50, soldItems: { family: 1 }, holds: { A: { units: 8, items: { family: 2 }, expiresAt: now + 1 } } };
        const a = availability(gala, state, now);
        expect(a.remainingUnits).toBe(100 - 10 - 50 - 8);
        expect(a.items.family).toBe(2); // item cap 5 − 1 sold − 2 held
        expect(a.items.adult).toBe(32);
    });

    // A hold whose expiry webhook never came must not lock stock away forever.
    it('ignores and prunes expired holds', () => {
        const state = { soldUnits: 0, holds: { old: { units: 90, items: {}, expiresAt: now - 1 } } };
        expect(availability(gala, state, now).remainingUnits).toBe(90);
        const held = applyHold(gala, state, 'B', order, now + 100, now);
        expect(Object.keys(held.state.holds)).toEqual(['B']);
    });

    it('refuses an order that no longer fits', () => {
        expect(applyHold(gala, { soldUnits: 85 }, 'C', order, now + 1, now).error).toMatch(/only 5 places/);
        expect(applyHold(gala, { soldUnits: 90 }, 'C', order, now + 1, now).error).toMatch(/sold out/);
        expect(applyHold(gala, { soldItems: { family: 4 } }, 'C', order, now + 1, now).error).toMatch(/only 1 × Family/);
    });

    it('is unlimited without caps', () => {
        expect(availability(ducks, {}, now)).toEqual({ remainingUnits: null, items: { duck: null, pack: null } });
    });

    it('releases a hold', () => {
        expect(releaseHold({ holds: { A: {}, B: {} } }, 'A').holds).toEqual({ B: {} });
    });
});

describe('applySale', () => {
    const { order } = priceOrder(ducks, { duck: 2, pack: 1 }, false); // 7 ducks

    it('hands out consecutive numbers from 1, one per unit', () => {
        const first = applySale(ducks, { holds: { A: { units: 7 } } }, 'A', order);
        expect(first.numbers).toEqual({ first: 1, count: 7 });
        expect(first.state.holds).toEqual({});
        expect(first.state.soldUnits).toBe(7);
        expect(first.holdLapsed).toBe(false);

        const second = applySale(ducks, first.state, 'B', order);
        expect(second.numbers).toEqual({ first: 8, count: 7 });
        expect(second.holdLapsed).toBe(true);
    });

    it('does not number tickets', () => {
        const { order: t } = priceOrder(gala, { adult: 1 }, false);
        expect(applySale(gala, {}, 'A', t).numbers).toBeNull();
    });
});

describe('formatNumbers', () => {
    it('lists short runs and ranges long ones', () => {
        expect(formatNumbers({ first: 4, count: 1 })).toBe('4');
        expect(formatNumbers({ first: 4, count: 3 })).toBe('4, 5, 6');
        expect(formatNumbers({ first: 1, count: 40 })).toBe('1–40');
        expect(formatNumbers(null)).toBe('');
    });

    it('mints distinct order ids', () => {
        expect(makeOrderId()).toMatch(/^HPS-[0-9A-Z]+-[0-9A-F]{4}$/);
        expect(makeOrderId()).not.toBe(makeOrderId());
    });
});

const record = (campaign, quantities, extra = {}) => {
    const { order } = priceOrder(campaign, quantities, true);
    return {
        orderId: 'HPS-TEST-0001',
        campaign: { name: campaign.name, numbered: campaign.numbered, spreadsheetId: 'x', email: campaign.email },
        buyer: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '508.555.0101' },
        order,
        numbers: null,
        createdAt: Date.parse('2026-11-02T18:30:00Z'),
        paidAt: Date.parse('2026-11-02T18:30:00Z'),
        stripeSessionId: 'cs_test_1',
        amountPaidCents: order.totalCents,
        ...extra,
    };
};

describe('campaign rows', () => {
    it('writes one row per duck, tagged with its item', () => {
        const rows = buildCampaignRows(record(ducks, { duck: 1, pack: 1 }, { numbers: { first: 11, count: 6 } }), formatDateEastern);
        expect(rows).toHaveLength(6);
        rows.forEach(r => expect(r).toHaveLength(NUMBERED_HEADER.length));
        const col = (name) => NUMBERED_HEADER.indexOf(name);
        expect(rows.map(r => r[col('Number')])).toEqual([11, 12, 13, 14, 15, 16]);
        expect(rows[0][col('Item')]).toBe('Duck');
        expect(rows[5][col('Item')]).toBe('5-pack');
        expect(rows[0][col('Phone')]).toBe('(508) 555-0101');
        expect(rows[0][col('Date (ET)')]).toBe('2026-11-02 13:30');
    });

    it('writes one row per ticket order with the people count', () => {
        const rows = buildCampaignRows(record(gala, { adult: 2, family: 1 }), formatDateEastern);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveLength(TICKETS_HEADER.length);
        const col = (name) => TICKETS_HEADER.indexOf(name);
        expect(rows[0][col('Order')]).toBe('2 × Adult, 1 × Family');
        expect(rows[0][col('People')]).toBe(6);
        expect(rows[0][col('Fair Market Value (USD)')]).toBe(110);
    });
});

describe('renderCampaignEmail', () => {
    it('uses the Contentful template and fills placeholders', () => {
        const r = record(gala, { adult: 2 });
        r.campaign.email = { subject: 'Tickets for {campaignName}, {firstName}', body: 'Dear **{firstName}**,\n\n{orderSummary}\n\nSee you there!' };
        const { subject, html } = renderCampaignEmail(r);
        expect(subject).toBe('Tickets for Gala, Ada');
        expect(html).toContain('<strong>Ada</strong>');
        expect(html).toContain('2 × Adult');
        expect(html).not.toContain('{orderSummary}');
        expect(html).not.toMatch(/<p>\s*<table/);
    });

    // The point of escaping: buyer input must never become live markup in an
    // email sent from our own domain.
    it('escapes what the buyer typed', () => {
        const r = record(gala, { adult: 1 });
        r.buyer.firstName = '<a href="https://evil.example">Ada</a>';
        const { html } = renderCampaignEmail(r);
        expect(html).not.toContain('<a href="https://evil.example">');
        expect(html).toContain('&lt;a href=');
    });

    it('neutralises raw HTML and unsafe links in the Contentful text', () => {
        const r = record(gala, { adult: 1 });
        r.campaign.email = { body: 'Hi <script>x()</script> [click](javascript:alert(1)) [site](https://hollistonpantryshelf.org)' };
        const { html } = renderCampaignEmail(r);
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('javascript:');
        expect(html).toContain('href="https://hollistonpantryshelf.org"');
    });

    it('always tells a duck buyer their numbers', () => {
        const r = record(ducks, { duck: 3 }, { numbers: { first: 41, count: 3 } });
        r.campaign.email = { body: 'Thanks {firstName}!' };
        expect(renderCampaignEmail(r).html).toContain('41, 42, 43');
    });

    it('adds the tax statement only when a fair market value is set', () => {
        const withFmv = renderCampaignEmail(record(gala, { adult: 2 })).html;
        expect(withFmv).toMatch(/estimate that value at\s+\$50\.00/);
        expect(renderCampaignEmail(record(ducks, { duck: 1 }, { numbers: { first: 1, count: 1 } })).html)
            .not.toContain('deductible');
    });

    it('falls back to a default when Contentful has no text', () => {
        const { subject, html } = renderCampaignEmail(record(gala, { adult: 1 }));
        expect(subject).toBe('Your order for Gala');
        expect(html).toContain('HPS-TEST-0001');
    });
});

describe('validateBuyer', () => {
    const ok = { firstName: 'Ada', lastName: 'L', email: 'a@b.co', phone: '508-555-0101' };
    it('requires name, email and a valid US phone', () => {
        expect(validateBuyer(ok)).toBeNull();
        expect(validateBuyer({ ...ok, lastName: '' })).toMatch(/name/);
        expect(validateBuyer({ ...ok, email: 'nope' })).toMatch(/email/);
        expect(validateBuyer({ ...ok, phone: '555-0101' })).toMatch(/phone/);
    });
});
