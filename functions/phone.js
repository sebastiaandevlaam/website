// Server-side twin of `src/utils/phone.js`. The site and the functions are
// deployed separately and cannot import across that boundary, so the rules
// live in both places — change one, change the other.

// Strips formatting and drops a leading country code. Returns the 10 national
// digits, or null when the input can't be one.
function toNationalDigits(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length === 10 ? digits : null;
}

// NANP rules: area code and exchange code both start 2-9, and neither may be
// an N11 service code (411, 911, …).
function isValidUsPhone(value) {
  const national = toNationalDigits(value);
  if (!national) return false;
  const areaCode = national.slice(0, 3);
  const exchange = national.slice(3, 6);
  if (!/^[2-9]\d{2}$/.test(areaCode) || areaCode.endsWith('11')) return false;
  if (!/^[2-9]\d{2}$/.test(exchange) || exchange.endsWith('11')) return false;
  return true;
}

// "(508) 555-0101", so every row in the sheet dials the same way. Anything we
// can't parse is returned untouched rather than mangled.
function formatUsPhone(value) {
  const national = toNationalDigits(value);
  if (!national || !isValidUsPhone(national)) return String(value == null ? '' : value);
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

module.exports = { toNationalDigits, isValidUsPhone, formatUsPhone };
