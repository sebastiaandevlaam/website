import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from "./ButtonLink"

const HeroSection = ({ headline, description, primaryButton, secondaryButton, backgroundStyle, entryId }) => {
  const primaryButtonId = primaryButton?.sys?.id
  const secondaryButtonId = secondaryButton?.sys?.id
  primaryButton = primaryButton.fields
  secondaryButton = secondaryButton.fields
  const bgClass = backgroundStyle === "Red Background" ? "bg-red" : "bg-gray";
  const sectionId = primaryButton?.url?.startsWith('#') ? primaryButton.url.substring(1)
    : secondaryButton?.url?.startsWith('#') ? secondaryButton.url.substring(1)
      : 'hero';

  const inspectorProps = useContentfulInspectorMode({ entryId });

  return (
    <section className={`hero-section ${bgClass}`} id={sectionId}>
      <div className="container">
        <h1 {...inspectorProps({ fieldId: 'headline' })}>{headline}</h1>
        <p {...inspectorProps({ fieldId: 'description' })}>{description}</p>
        <div className="button-group">
          {secondaryButton && <ButtonLink {...secondaryButton} style="Secondary Button" entryId={secondaryButtonId} />}
          {primaryButton && <ButtonLink {...primaryButton} style="Primary Button" entryId={primaryButtonId} />}
        </div>
      </div>
    </section>
  );
};

export default HeroSection
