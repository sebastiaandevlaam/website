import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import Icon from "./Icon"

const ButtonLink = ({ textLabel, url, style, openInNewTab, arrow = true, entryId }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  const target = openInNewTab ? "_blank" : "_self";
  const rel = openInNewTab ? "noopener noreferrer" : null;

  // Determine base and style-specific classes
  let className = "";
  switch (style) {
    case "Primary Button":
      // Check if it's the specific contact button in nav
      if (url === "#contact") {
          className = "button primary-button nav-contact-button";
      } else {
          className = "button primary-button";
      }
      break;
    case "Secondary Button":
      className = "button secondary-button";
      break;
    case "Subtle Link":
      className = "link-subtle";
      break;
    default:
       className = "link-subtle";
  }

  return (
    <a href={url} target={target} rel={rel} className={className} {...inspectorProps({ fieldId: 'textLabel' })}>
      {textLabel} {(style === 'Subtle Link' && arrow === true) && <Icon name="ArrowRight" />}
    </a>
  );
};

export default ButtonLink;