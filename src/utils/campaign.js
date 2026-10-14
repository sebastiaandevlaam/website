// Browser-side helpers for paid campaigns (see CampaignSection).
//
// processingFeeCents is the twin of the one in functions/campaignOrder.js —
// the site and the functions deploy separately and cannot import across that
// boundary, so change both together. The server recomputes everything; this
// copy only exists so the fee shown is the fee charged.

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL;

export function processingFeeCents(subtotalCents) {
    if (subtotalCents <= 0) return 0;
    const gross = Math.floor(((subtotalCents + 30) * 1000 + 970) / 971);
    return gross - subtotalCents;
}

export const formatMoney = (cents) => `$${(cents / 100).toFixed(2)}`;

// Empty means "no cap", as on the server.
const optionalCount = (value) => {
    const n = Number(value);
    return value === undefined || value === null || value === '' || !Number.isFinite(n) || n < 0
        ? null
        : Math.floor(n);
};

// The sellable items of a Contentful `campaign` entry, matching what the
// server's normalizeCampaign will accept.
export function campaignItems(campaignFields) {
    return (campaignFields?.items || [])
        .filter(item => item?.sys?.id && item.fields?.name && Number(item.fields.price) > 0)
        .map(item => ({
            id: item.sys.id,
            name: item.fields.name,
            description: item.fields.description || '',
            priceCents: Math.round(Number(item.fields.price) * 100),
            unitsPerItem: Math.max(1, Math.floor(Number(item.fields.unitsPerItem) || 1)),
            maxPerOrder: optionalCount(item.fields.maxPerOrder),
        }));
}

async function getJson(path) {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/${path}`);
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
}

export const fetchAvailability = (campaignId) =>
    getJson(`getCampaignAvailability?campaign=${encodeURIComponent(campaignId)}`);

export const fetchOrder = (sessionId) =>
    getJson(`getCampaignOrder?session=${encodeURIComponent(sessionId)}`);

export const cancelCheckout = (orderId) =>
    fetch(`${FUNCTIONS_BASE_URL}/cancelCampaignCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
    }).catch(() => {});
