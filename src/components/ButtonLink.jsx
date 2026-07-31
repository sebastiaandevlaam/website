import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import Icon from "./Icon"

// Last-resort accessible name for a link an editor left unlabelled, so the
// markup can never contain a nameless link (WCAG 2.4.4 / 4.1.2).
const labelFromUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('mailto:')) return url.slice('mailto:'.length);
  if (url.startsWith('tel:')) return url.slice('tel:'.length);
  return url;
};

const ButtonLink = ({ textLabel, url, style, openInNewTab, arrow = true, entryId }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  const target = openInNewTab ? "_blank" : "_self";
  const rel = openInNewTab ? "noopener noreferrer" : null;

  const label = textLabel?.trim() ? textLabel : labelFromUrl(url);
  // Nothing to link to and nothing to say — render nothing rather than an
  // empty tab stop.
  if (!label) return null;

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
      {label}{(style === 'Subtle Link' && arrow === true) && <> <Icon name="ArrowRight" aria-hidden="true" /></>}
    </a>
  );
};

export default ButtonLink;