import { Component } from 'react';

// One malformed Contentful entry used to blank the entire page: a throw
// anywhere in the tree unmounts everything above it. Wrapping each section
// means a bad entry costs that one section, and the rest of the page — the
// contact details, the opening hours, the donate button — still renders.
//
// Must be a class: React has no hook equivalent of componentDidCatch.
class SectionErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, info) {
        console.error(`Section "${this.props.contentType}" failed to render:`, error, info);
    }

    render() {
        if (!this.state.failed) return this.props.children;

        // Visitors get nothing rather than a broken shell — an error box would
        // only confuse them, and they cannot act on it. Editors working in
        // Contentful preview do get a marker, so a broken entry is obvious
        // while they are editing it.
        if (!import.meta.env.DEV) return null;

        return (
            <div className="container">
                <div style={{ margin: '2rem 0', padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                    Section “{this.props.contentType}” failed to render. See the console.
                </div>
            </div>
        );
    }
}

export default SectionErrorBoundary;
