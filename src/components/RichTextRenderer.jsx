// Helper to render basic rich text structure (Unchanged)
const RichTextRenderer = ({ body }) => {
    if (!body || !body.content) return null;
    return body.content.map((node, index) => {
        if (node.nodeType === 'paragraph') {
            // Add className for styling if needed
            return <p key={index}>{node.content.map(textNode => textNode.value).join('')}</p>;
        }
        return null;
    });
};

export default RichTextRenderer;