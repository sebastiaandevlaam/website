import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import RichTextRenderer from './RichTextRenderer';

const NewsPostSection = ({ post, backgroundStyle, entryId }) => {
    const { title, summary, publishDate, featuredImage, body, author } = post?.fields || {};

    const imageUrl = featuredImage?.fields?.file?.url;
    const imageAlt = featuredImage?.fields?.description || featuredImage?.fields?.title || title || 'Post image';
    const fullImageUrl = imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl;

    const formattedDate = publishDate
        ? new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";

    // entryId is the newsPost entry ID (either from sectionNewsPost or auto-routed directly)
    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`news-post-section ${bgClass}`}>
            <div className="container news-post-container">
                <a href="/#news" className="link-subtle news-post-back">← Back to News</a>

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
