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
        return (
            <a
                key={index}
                href={href}
                {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {node.content?.map((child) => child.value)}
            </a>
        );
    }
    return null;
};

// Helper to render basic rich text structure
const RichTextRenderer = ({ body }) => {
    if (!body || !body.content) return null;
    return body.content.map((node, index) => {
        if (node.nodeType === 'paragraph') {
            return <p key={index}>{node.content?.map(renderInline)}</p>;
        }
        if (node.nodeType === 'heading-2') {
            return <h2 key={index}>{node.content?.map(renderInline)}</h2>;
        }
        if (node.nodeType === 'heading-3') {
            return <h3 key={index}>{node.content?.map(renderInline)}</h3>;
        }
        if (node.nodeType === 'heading-4') {
            return <h4 key={index}>{node.content?.map(renderInline)}</h4>;
        }
        if (node.nodeType === 'heading-5') {
            return <h5 key={index}>{node.content?.map(renderInline)}</h5>;
        }
        if (node.nodeType === 'heading-6') {
            return <h6 key={index}>{node.content?.map(renderInline)}</h6>;
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
            const url = file.url.startsWith('//') ? `https:${file.url}` : file.url;
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
