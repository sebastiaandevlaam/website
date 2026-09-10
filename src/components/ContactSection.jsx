import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from "./ButtonLink";
import Icon from "./Icon";
import { backgroundClass, sectionId } from '@/utils/contentful';

const ContactSection = ({ sectionIcon, title, leadParagraph, contactInfoSource, customPhone, customEmail, button, backgroundStyle, entryId, titleTag, sitePhone, siteEmail }) => {
    const TitleTag = titleTag || 'h2';
    const buttonId = button?.sys?.id
    button = button?.fields
    const bgClass = backgroundClass(backgroundStyle);
    const phone = contactInfoSource === 'Custom' ? customPhone : sitePhone;
    const email = contactInfoSource === 'Custom' ? customEmail : siteEmail;
    // Only build the mail button when the editor actually configured one —
    // spreading an absent `button` produced a link with no label and no
    // accessible name (WCAG 2.4.4 / 4.1.2).
    const emailButton = button && email ? { ...button, url: `mailto:${email}` } : null;
    const id = sectionId(button?.url, null, 'contact');

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`contact-section ${bgClass}`} id={id}>
            <div className="container">
                {sectionIcon && <Icon name={sectionIcon} className="section-icon" />}
                <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>
                {leadParagraph && <p className="lead-paragraph" {...inspectorProps({ fieldId: 'leadParagraph' })}>{leadParagraph}</p>}
                <div className="contact-info">
                    {phone && <p {...inspectorProps({ fieldId: 'customPhone' })}>Phone: {phone}</p>}
                    {email && <p {...inspectorProps({ fieldId: 'customEmail' })}>Email: <a href={`mailto:${email}`}>{email}</a></p>}
                </div>
                {emailButton && <ButtonLink {...emailButton} entryId={buttonId} />}
            </div>
        </section>
    );
};

export default ContactSection;
