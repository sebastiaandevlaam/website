import { useContentfulInspectorMode } from '@contentful/live-preview/react'
import ButtonLink from "./ButtonLink"
import { toHttpsUrl } from '@/utils/url'

const HeroSection = ({ headline, description, primaryButton, secondaryButton, backgroundStyle, backgroundImage, entryId }) => {
  const primaryButtonId = primaryButton?.sys?.id
  const secondaryButtonId = secondaryButton?.sys?.id
  primaryButton = primaryButton?.fields
  secondaryButton = secondaryButton?.fields

  const sectionId = primaryButton?.url?.startsWith('#') ? primaryButton.url.substring(1)
    : secondaryButton?.url?.startsWith('#') ? secondaryButton.url.substring(1)
      : 'hero';

  const bgMap = {
    'Red Background': 'bg-red',
    'Gray Background': 'bg-gray',
    'Default Background': 'bg-default',
    'Beige Background': 'bg-beige',
    'Image Background': 'bg-image',
  };
  const bgClass = bgMap[backgroundStyle] || 'bg-red';

  const fullImageUrl = toHttpsUrl(backgroundImage?.fields?.file?.url);
  const bgStyle = bgClass === 'bg-image' && fullImageUrl
    ? { backgroundImage: `url(${fullImageUrl})` }
    : undefined;

  const isLight = bgClass === 'bg-default' || bgClass === 'bg-beige';

  const inspectorProps = useContentfulInspectorMode({ entryId });

  return (
    <section className={`hero-section ${bgClass}${isLight ? ' hero-light' : ''}`} id={sectionId} style={bgStyle}>
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
