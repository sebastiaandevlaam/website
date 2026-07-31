import { toHttpsUrl } from '@/utils/url';

// Renders inline content nodes (text, hyperlinks) within a block
const renderInline = (node, index) => {
    if (node.nodeType === 'text') {
        let content = node.value;
        if (!content) return null;
        if (node.marks?.some(m => m.type === 'bold')) content = <strong key={index}>{content}</strong>;
        else if (node.marks?.some(m => m.type === 'italic')) content = <em key={index}>{content}</em>;
        else content = <span key={index}>{content}</span>;
        return content;
    }
    if (node.nodeType === 'hyperlink') {
        const href = node.data?.uri || '#';
        const isExternal = href.startsWith('http') || href.startsWith('//');
        const text = node.content?.map((child) => child.value).join('') ?? '';
        return (
            <a
                key={index}
                href={href}
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {/* Fall back to the href so an editor linking whitespace can't
                    produce a link with no accessible name. */}
                {text.trim() ? text : href}
            </a>
        );
    }
    return null;
};

const HEADING_LEVELS = { 'heading-2': 2, 'heading-3': 3, 'heading-4': 4, 'heading-5': 5, 'heading-6': 6 };

// A rich-text body always sits beneath its section's <h2>, so its headings have
// to start at <h3> and may not skip a level. Editors reach for "Heading 4"
// freely, which produced an h2 -> h4 jump on /volunteer. Rather than police the
// content, shift every heading in the body by the same amount so the shallowest
// authored level lands on h3; relative depth is preserved.
const headingShift = (content) => {
    const levels = content
        .filter((n) => n.nodeType in HEADING_LEVELS)
        .map((n) => HEADING_LEVELS[n.nodeType]);
    return levels.length ? 3 - Math.min(...levels) : 0;
};

// Helper to render basic rich text structure
const RichTextRenderer = ({ body }) => {
    if (!body || !body.content) return null;
    const shift = headingShift(body.content);
    return body.content.map((node, index) => {
        if (node.nodeType === 'paragraph') {
            return <p key={index}>{node.content?.map(renderInline)}</p>;
        }
        if (node.nodeType in HEADING_LEVELS) {
            const authored = HEADING_LEVELS[node.nodeType];
            const Tag = `h${Math.min(6, Math.max(3, authored + shift))}`;
            // The rt-h* class keeps the size the editor picked, so re-levelling
            // is a semantic change only.
            return <Tag key={index} className={`rt-h${authored}`}>{node.content?.map(renderInline)}</Tag>;
        }
        if (node.nodeType === 'unordered-list') {
            return <ul key={index}>{node.content?.map((item, i) => <li key={i}>{item.content?.map((p) => p.content?.map(renderInline))}</li>)}</ul>;
        }
        if (node.nodeType === 'ordered-list') {
            return <ol key={index}>{node.content?.map((item, i) => <li key={i}>{item.content?.map((p) => p.content?.map(renderInline))}</li>)}</ol>;
        }
        if (node.nodeType === 'embedded-asset-block') {
            const file = node.data?.target?.fields?.file;
            const title = node.data?.target?.fields?.title;
            const description = node.data?.target?.fields?.description;
            if (!file?.url) return null;
            const url = toHttpsUrl(file.url);
            const contentType = file.contentType || '';
            if (contentType.startsWith('image/')) {
                return (
                    <figure key={index} className="rich-text-image">
                        <img src={url} alt={description || title || ''} loading="lazy" />
                        {description && <figcaption>{description}</figcaption>}
                    </figure>
                );
            }
            // Non-image asset — render as a download link
            return (
                <p key={index}>
                    <a href={url} target="_blank" rel="noopener noreferrer">{title || 'Download'}</a>
                </p>
            );
        }
        return null;
    });
};

export default RichTextRenderer;
