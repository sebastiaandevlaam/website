import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { isWithinWindow } from '@/utils/contentful';
import ReactMarkdown from 'react-markdown'
import Icon from './Icon';

const AnnouncementHeader = ({ text, linkUrl, linkText, startDate, endDate, isActive, entryId }) => {
    const inspectorProps = useContentfulInspectorMode({ entryId });

    // Plain derivation rather than state + an effect: this is a pure function of
    // the props, and the effect version rendered one frame hidden before
    // correcting itself.
    const isVisible = Boolean(isActive && text) && isWithinWindow(startDate, endDate);

    if (!isVisible) return null;

    return (
        // <aside> makes the bar a complementary landmark; it previously sat
        // outside every landmark region, so screen-reader users navigating by
        // landmark skipped past it entirely.
        <aside className="announcement-header" aria-label="Announcement">
            <div className="container">
                <Icon name="Megaphone" className="icon" aria-hidden="true" />
                {text && (
                    // A <div> rather than a <span>: this wraps ReactMarkdown's
                    // <p>, which a <span> may not contain. Kept visually inline
                    // by .announcement-text.
                    <div className="announcement-text" {...inspectorProps({ fieldId: 'text' })}>
                        <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                )}
                {linkUrl && (
                    <a href={linkUrl} {...inspectorProps({ fieldId: 'linkUrl' })}>
                        {linkText || "Details"}
                    </a>
                )}
                {/* Optional: Add a close button here with state to hide */}
            </div>
        </aside>
    );
};

export default AnnouncementHeader;