import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import RichTextRenderer from "./RichTextRenderer";
import ButtonLink from "./ButtonLink";

const TextWithImageSection = ({ title, leadParagraph, body, image, imagePosition, optionalLink, backgroundStyle, entryId }) => {

    const imageUrl = image?.fields?.file?.url;
    const imageDescription = image?.fields?.description;
    const imageTitle = image?.fields?.title;
    const imageAlt = imageDescription || imageTitle || title || 'Section image';
    const fullImageUrl = imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl;

    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";
    const imagePosClass = imagePosition === 'Left' ? 'image-left' : 'image-right';
    const sectionId = optionalLink?.url?.startsWith('#') ? optionalLink.url.substring(1)
        : title ? title.toLowerCase().replace(/\s+/g, '-')
            : 'text-image';

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`text-image-section ${bgClass}`} id={sectionId}>
            <div className={`container content-wrapper ${imagePosClass}${!fullImageUrl ? ' no-image' : ''}`}>
                <div className="text-content">
                    <h2 {...inspectorProps({ fieldId: 'title' })}>{title}</h2>
                    {leadParagraph && <p className="lead-paragraph" {...inspectorProps({ fieldId: 'leadParagraph' })}>{leadParagraph}</p>}
                    <div className="body-text" {...inspectorProps({ fieldId: 'body' })}>
                        <RichTextRenderer body={body} />
                    </div>
                    {optionalLink && <div className="section-link"><ButtonLink {...optionalLink.fields} entryId={optionalLink.sys?.id} /></div>}
                </div>
                {fullImageUrl && (
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
