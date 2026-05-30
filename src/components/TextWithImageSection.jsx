import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import RichTextRenderer from "./RichTextRenderer";
import ButtonLink from "./ButtonLink";
import { toHttpsUrl } from '@/utils/url';

const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const short = url.match(/youtu\.be\/([^?&]+)/);
    if (short) return `https://www.youtube.com/embed/${short[1]}`;
    const watch = url.match(/[?&]v=([^&]+)/);
    if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
    if (url.includes('youtube.com/embed/')) return url;
    return null;
};

const TextWithImageSection = ({ title, leadParagraph, body, image, imagePosition, videoUrl, optionalLink, backgroundStyle, entryId }) => {

    const imageAlt = image?.fields?.description || image?.fields?.title || title || 'Section image';
    const fullImageUrl = toHttpsUrl(image?.fields?.file?.url);
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    const hasMedia = embedUrl || fullImageUrl;

    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";
    const imagePosClass = imagePosition === 'Left' ? 'image-left' : 'image-right';
    const sectionId = optionalLink?.url?.startsWith('#') ? optionalLink.url.substring(1)
        : title ? title.toLowerCase().replace(/\s+/g, '-')
            : 'text-image';

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`text-image-section ${bgClass}`} id={sectionId}>
            <div className={`container content-wrapper ${imagePosClass}${!hasMedia ? ' no-image' : ''}`}>
                <div className="text-content">
                    <h2 {...inspectorProps({ fieldId: 'title' })}>{title}</h2>
                    {leadParagraph && <p className="lead-paragraph" {...inspectorProps({ fieldId: 'leadParagraph' })}>{leadParagraph}</p>}
                    <div className="body-text" {...inspectorProps({ fieldId: 'body' })}>
                        <RichTextRenderer body={body} />
                    </div>
                    {optionalLink && <div className="section-link"><ButtonLink {...optionalLink.fields} entryId={optionalLink.sys?.id} /></div>}
                </div>
                {embedUrl ? (
                    <div className="image-content" {...inspectorProps({ fieldId: 'videoUrl' })}>
                        <div className="video-embed">
                            <iframe
                                src={embedUrl}
                                title={title || 'Video'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                ) : fullImageUrl && (
                    <div className="image-content">
                        <img
                            src={fullImageUrl}
                            alt={imageAlt}
                            loading="lazy"
                            className="section-image"
                            {...inspectorProps({ fieldId: 'image' })}
                        />
                    </div>
                )}
            </div>
        </section>
    );
};

export default TextWithImageSection;
