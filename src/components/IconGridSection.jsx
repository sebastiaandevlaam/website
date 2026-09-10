import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from './ButtonLink';
import CardComponent from './CardComponent';
import Icon from './Icon';
import { backgroundClass, sectionId } from '@/utils/contentful';

const IconGridSection = ({ sectionIcon, title, leadParagraph, gridItems, optionalBottomButton, backgroundStyle, entryId, titleTag }) => {
    const TitleTag = titleTag || 'h2';
    const optionalBottomButtonId = optionalBottomButton?.sys?.id
    optionalBottomButton = optionalBottomButton?.fields
    const bgClass = backgroundClass(backgroundStyle);
    const gridColsClass = gridItems?.length === 2 ? 'grid-cols-md-2' : 'grid-cols-md-3';
    const id = sectionId(optionalBottomButton?.url, title, 'icon-grid');

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`icon-grid-section ${bgClass}`} id={id}>
            <div className="container">
                {sectionIcon && <Icon name={sectionIcon} className="section-icon" />}
                <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>
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
