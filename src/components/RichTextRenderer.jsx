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
        if (node.nodeType === 'unordered-list') {
            return <ul key={index}>{node.content?.map((item, i) => <li key={i}>{item.content?.map((p) => p.content?.map(renderInline))}</li>)}</ul>;
        }
        if (node.nodeType === 'ordered-list') {
            return <ol key={index}>{node.content?.map((item, i) => <li key={i}>{item.content?.map((p) => p.content?.map(renderInline))}</li>)}</ol>;
        }
        return null;
    });
};

export default RichTextRenderer;
