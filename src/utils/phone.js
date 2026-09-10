// US / NANP phone helpers.
//
// Families type phone numbers every way imaginable — 5085550101,
// (508) 555-0101, 508.555.0101, +1 508 555 0101 — so we validate on the
// digits and store one consistent format for the volunteers doing callbacks.
//
// `functions/phone.js` is the server-side twin of this file; the two are
// deployed separately and cannot import each other, so keep them in step.

// Strips formatting and drops a leading country code. Returns the 10 national
// digits, or null when the input can't be one.
export function toNationalDigits(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits.length === 10 ? digits : null;
}

// NANP rules: area code and exchange code both start 2-9, and neither may be
// an N11 service code (411, 911, …).
export function isValidUsPhone(value) {
    const national = toNationalDigits(value);
    if (!national) return false;
    const [areaCode, exchange] = [national.slice(0, 3), national.slice(3, 6)];
    if (!/^[2-9]\d{2}$/.test(areaCode) || areaCode.endsWith('11')) return false;
    if (!/^[2-9]\d{2}$/.test(exchange) || exchange.endsWith('11')) return false;
    return true;
}

// "(508) 555-0101". Anything we can't parse is returned untouched rather than
// mangled, so an unexpected value stays visible instead of silently changing.
export function formatUsPhone(value) {
    const national = toNationalDigits(value);
    if (!national || !isValidUsPhone(national)) return String(value ?? '');
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}
