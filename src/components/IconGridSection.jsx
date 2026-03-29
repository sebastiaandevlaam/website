import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from './ButtonLink';
import CardComponent from './CardComponent';
import Icon from './Icon';

const IconGridSection = ({ sectionIcon, title, leadParagraph, gridItems, optionalBottomButton, backgroundStyle, entryId }) => {
    const optionalBottomButtonId = optionalBottomButton?.sys?.id
    optionalBottomButton = optionalBottomButton?.fields
    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";
    const gridColsClass = gridItems?.length === 2 ? 'grid-cols-md-2' : 'grid-cols-md-3';
    const sectionId = optionalBottomButton?.url?.startsWith('#') ? optionalBottomButton.url.substring(1)
                    : title ? title.toLowerCase().replace(/\s+/g, '-')
                    : 'icon-grid';

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`icon-grid-section ${bgClass}`} id={sectionId}>
            <div className="container">
                {sectionIcon && <Icon name={sectionIcon} className="section-icon" />}
                <h2 {...inspectorProps({ fieldId: 'title' })}>{title}</h2>
                {leadParagraph && <p className="lead-paragraph" {...inspectorProps({ fieldId: 'leadParagraph' })}>{leadParagraph}</p>}

                {gridItems && gridItems.length > 0 && (
                    <div className={`grid ${gridColsClass}`}>
                        {gridItems.map(item => (
                            <CardComponent key={item.sys.id} entryId={item.sys.id} {...item.fields} />
                        ))}
                    </div>
                )}

                {optionalBottomButton && (
                    <div className="bottom-button">
                        <ButtonLink {...optionalBottomButton} entryId={optionalBottomButtonId} />
                    </div>
                )}
            </div>
        </section>
    );
};

export default IconGridSection;
