// Small helpers over Contentful field conventions, each of which was repeated
// across several section components.

// `backgroundStyle` is a plain text field, so an editor typo should degrade to
// the default rather than produce an unstyled section.
const BACKGROUND_CLASSES = {
    'Beige Background': 'bg-beige',
    'Default Background': 'bg-default',
    'Red Background': 'bg-red',
    'Gray Background': 'bg-gray',
    'Image Background': 'bg-image',
};

export const backgroundClass = (style, fallback = 'bg-default') =>
    BACKGROUND_CLASSES[style] || fallback;

// Sections are linked with in-page anchors, so each needs a stable id. Editors
// don't set one: it comes from the button URL when that is an anchor, else from
// the title, else a per-section-type default.
export const sectionId = (buttonUrl, title, fallback) => {
    if (buttonUrl?.startsWith('#')) return buttonUrl.substring(1);
    if (title) return title.toLowerCase().replace(/\s+/g, '-');
    return fallback;
};

export const formatPostDate = (publishDate) =>
    publishDate
        ? new Date(publishDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
        })
        : null;

// Shared by the announcement bar and the Operation Mitten form: is now inside
// the optional [start, end] window? Absent bounds mean unbounded.
export const isWithinWindow = (startDate, endDate, now = new Date()) => {
    if (startDate && now < new Date(startDate)) return false;
    if (endDate && now > new Date(endDate)) return false;
    return true;
};

// Contentful asset URLs come back protocol-relative.
export const toHttpsUrl = (url) => (url?.startsWith('//') ? `https:${url}` : url);

// Editors are trusted, but a compromised CMS account should not be able to put
// `javascript:` behind a button. Allow only schemes a link on this site needs.
const SAFE_SCHEME = /^(https?:|mailto:|tel:|\/|#|$)/i;

export const safeHref = (url) => {
    if (!url) return url;
    const trimmed = String(url).trim();
    if (SAFE_SCHEME.test(trimmed)) return trimmed;
    console.warn('Blocked unsafe href from Contentful:', trimmed);
    return '#';
};
