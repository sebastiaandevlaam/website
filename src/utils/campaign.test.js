import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { processingFeeCents, campaignItems } from './campaign';

const require = createRequire(import.meta.url);
const server = require('../../functions/campaignOrder.js');

// The browser shows a fee and the server charges one; they must never differ.
describe('processingFeeCents twin', () => {
    it('matches the server for every subtotal up to $2,000', () => {
        for (let cents = 0; cents <= 200000; cents += 7) {
            expect(processingFeeCents(cents)).toBe(server.processingFeeCents(cents));
        }
    });
});

describe('campaignItems', () => {
    it('offers exactly the items the server will price', () => {
        const fields = {
            items: [
                { sys: { id: 'a' }, fields: { name: 'Adult', price: 40, maxPerOrder: 6 } },
                { sys: { id: 'f' }, fields: { name: 'Family', price: 100, unitsPerItem: 4 } },
                { sys: { id: 'x' }, fields: { name: 'Free', price: 0 } },
                { sys: { id: 'u' } },
            ],
        };
        const client = campaignItems(fields).map(i => i.id);
        const serverIds = server.normalizeCampaign({ fields }).items.map(i => i.id);
        expect(client).toEqual(serverIds);
        expect(campaignItems(fields)[0].maxPerOrder).toBe(6);
        expect(campaignItems(fields)[1]).toMatchObject({ unitsPerItem: 4, maxPerOrder: null });
    });
});
