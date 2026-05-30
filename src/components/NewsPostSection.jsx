import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import RichTextRenderer from './RichTextRenderer';
import { toHttpsUrl } from '@/utils/url';

const handleBack = (e) => {
    e.preventDefault();
    const referrer = document.referrer;
    const isSameOrigin = referrer && new URL(referrer).origin === window.location.origin;
    if (isSameOrigin) {
        window.history.back();
    } else {
        window.location.href = '/news';
    }
};

const NewsPostSection = ({ post, backgroundStyle, entryId }) => {
    const { title, summary, publishDate, featuredImage, body, author } = post?.fields || {};

    const imageAlt = featuredImage?.fields?.description || featuredImage?.fields?.title || title || 'Post image';
    const fullImageUrl = toHttpsUrl(featuredImage?.fields?.file?.url);

    const formattedDate = publishDate
        ? new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";

    // entryId is the newsPost entry ID (either from sectionNewsPost or auto-routed directly)
    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`news-post-section ${bgClass}`}>
            <div className="container news-post-container">
                <a href="/news" onClick={handleBack} className="link-subtle news-post-back">← Back to Previous Page</a>

                <header className="news-post-header">
                    {formattedDate && (
                        <time className="news-date" dateTime={publishDate} {...inspectorProps({ fieldId: 'publishDate' })}>
                            {formattedDate}
                        </time>
                    )}
                    <h1 className="news-post-title" {...inspectorProps({ fieldId: 'title' })}>{title}</h1>
                    {author && (
                        <p className="news-post-author" {...inspectorProps({ fieldId: 'author' })}>By {author}</p>
                    )}
                    {summary && (
                        <p className="news-post-summary lead" {...inspectorProps({ fieldId: 'summary' })}>{summary}</p>
                    )}
                </header>

                {fullImageUrl && (
                    <div className="news-post-image" {...inspectorProps({ fieldId: 'featuredImage' })}>
                        <img src={fullImageUrl} alt={imageAlt} loading="lazy" />
                    </div>
                )}

                <div className="news-post-body" {...inspectorProps({ fieldId: 'body' })}>
                    <RichTextRenderer body={body} />
                </div>
            </div>
        </section>
    );
};

export default NewsPostSection;
