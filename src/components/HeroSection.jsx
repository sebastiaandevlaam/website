import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from "./ButtonLink"
import { toHttpsUrl, backgroundClass, sectionId } from '@/utils/contentful'

const HeroSection = ({ headline, description, primaryButton, secondaryButton, backgroundStyle, backgroundImage, entryId }) => {
  const primaryButtonId = primaryButton?.sys?.id
  const secondaryButtonId = secondaryButton?.sys?.id
  primaryButton = primaryButton?.fields
  secondaryButton = secondaryButton?.fields

  const anchorUrl = primaryButton?.url?.startsWith('#') ? primaryButton.url : secondaryButton?.url;
  const id = sectionId(anchorUrl, null, 'hero');

  // The hero is the only section defaulting to red rather than the page bg.
  const bgClass = backgroundClass(backgroundStyle, 'bg-red');

  const fullImageUrl = toHttpsUrl(backgroundImage?.fields?.file?.url);
  const bgStyle = bgClass === 'bg-image' && fullImageUrl
    ? { backgroundImage: `url(${fullImageUrl})` }
    : undefined;

  const isLight = bgClass === 'bg-default' || bgClass === 'bg-beige';

  const inspectorProps = useContentfulInspectorMode({ entryId });

  return (
    <section className={`hero-section ${bgClass}${isLight ? ' hero-light' : ''}`} id={id} style={bgStyle}>
      {bgClass === 'bg-image' && <div className="hero-image-overlay" />}
      <div className="container hero-content">
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
