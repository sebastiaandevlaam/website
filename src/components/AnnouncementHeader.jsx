import { useState, useEffect } from 'react';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import ReactMarkdown from 'react-markdown'
import Icon from './Icon';

const AnnouncementHeader = ({ text, linkUrl, linkText, startDate, endDate, isActive, entryId }) => {
    const [isVisible, setIsVisible] = useState(false);
    const inspectorProps = useContentfulInspectorMode({ entryId });

    useEffect(() => {
        if (!isActive || !text) {
            setIsVisible(false);
            return;
        }

        const now = new Date();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        let shouldShow = true;
        if (start && now < start) {
            shouldShow = false; // Start date is in the future
        }
        if (end && now > end) {
            shouldShow = false; // End date has passed
        }

        setIsVisible(shouldShow);

    }, [text, linkUrl, linkText, startDate, endDate, isActive]); // Re-check if props change


    if (!isVisible) {
        return null; // Don't render anything if not active or outside date range
    }

    return (
        <div className="announcement-header">
            <div className="container">
                <Icon name="Megaphone" className="icon" />
                {text && (
                    <span {...inspectorProps({ fieldId: 'text' })}>
                        <ReactMarkdown>{text}</ReactMarkdown>
                    </span>
                )}
                {linkUrl && (
                    <a href={linkUrl} {...inspectorProps({ fieldId: 'linkUrl' })}>
                        {linkText || "Details"}
                    </a>
                )}
                {/* Optional: Add a close button here with state to hide */}
            </div>
        </div>
    );
};

export default AnnouncementHeader;