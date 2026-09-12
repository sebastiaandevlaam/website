// Contentful connection settings, and the rule for when draft content is
// allowed to load.
//
// Both tokens are read-only and end up in the JavaScript bundle no matter what
// — that is inherent to a client-rendered site and is what Contentful's
// delivery/preview tokens are designed for. Moving them to env vars keeps them
// out of source control and lets a rotated token ship without a code change.

export const SPACE_ID = import.meta.env.VITE_CONTENTFUL_SPACE_ID;
export const ENVIRONMENT = import.meta.env.VITE_CONTENTFUL_ENVIRONMENT || 'master';
export const DELIVERY_TOKEN = import.meta.env.VITE_CONTENTFUL_DELIVERY_TOKEN;
export const PREVIEW_TOKEN = import.meta.env.VITE_CONTENTFUL_PREVIEW_TOKEN;

// Only these may frame us and get draft content. Kept in sync with the
// frame-ancestors directive in firebase.json.
export const CONTENTFUL_APP_ORIGINS = [
  'https://app.contentful.com',
  'https://app.eu.contentful.com',
];

// The old check was `window.top !== window` — true inside *any* iframe. Any
// site that framed us therefore got the preview API, and with it every
// unpublished draft in the space. Draft content is only for an editor working
// inside Contentful, so require that the framing page actually is Contentful.
//
// `ancestorOrigins` is browser-supplied and cannot be forged by the framing
// page. Firefox does not implement it, so fall back to the referrer, which in
// an iframe is the parent document — weaker, but the frame-ancestors CSP header
// independently blocks unknown framers, so this is defence in depth rather than
// the only lock.
export function isContentfulPreviewFrame() {
  if (typeof window === 'undefined') return false;

  let framed;
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true; // cross-origin parent
  }
  if (!framed) return false;

  const ancestors = window.location.ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    return CONTENTFUL_APP_ORIGINS.includes(ancestors[0]);
  }

  try {
    return CONTENTFUL_APP_ORIGINS.includes(new URL(document.referrer).origin);
  } catch {
    return false;
  }
}
