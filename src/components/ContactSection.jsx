import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from "./ButtonLink";
import Icon from "./Icon";

const ContactSection = ({ sectionIcon, title, leadParagraph, contactInfoSource, customPhone, customEmail, button, backgroundStyle, entryId, sitePhone, siteEmail }) => {
    const buttonId = button?.sys?.id
    button = button?.fields
    const bgClass = backgroundStyle === "Beige Background" ? "bg-beige" : "bg-default";
    const phone = contactInfoSource === 'Custom' ? customPhone : sitePhone;
    const email = contactInfoSource === 'Custom' ? customEmail : siteEmail;
    // Only build the mail button when the editor actually configured one —
    // spreading an absent `button` produced a link with no label and no
    // accessible name (WCAG 2.4.4 / 4.1.2).
    const emailButton = button && email ? { ...button, url: `mailto:${email}` } : null;
    const sectionId = button?.url?.startsWith('#') ? button.url.substring(1) : 'contact';

    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
        <section className={`contact-section ${bgClass}`} id={sectionId}>
            <div className="container">
                {sectionIcon && <Icon name={sectionIcon} className="section-icon" />}
                <h2 {...inspectorProps({ fieldId: 'title' })}>{title}</h2>
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
