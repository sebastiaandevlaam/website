// Contentful long-text fields often arrive with leading or trailing blank
// lines. react-markdown turns those into empty paragraphs, which show up as
// unexplained gaps with real CMS content but never with hand-written test copy.
export const trimMarkdown = (value) => String(value ?? '').trim();
