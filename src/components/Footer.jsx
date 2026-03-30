// Footer Component
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import SocialIcon from './SocialIcon';

const Footer = ({ copyrightText, tagline, socialLinks, entryId }) => {
    const currentYear = new Date().getFullYear();
    const inspectorProps = useContentfulInspectorMode({ entryId });

    return (
      <footer className="footer">
        <div className="container">
          <p className="copyright" {...inspectorProps({ fieldId: 'footerCopyrightText' })}>&copy; {currentYear} {copyrightText}</p>
          {tagline && <p className="tagline" {...inspectorProps({ fieldId: 'footerTagline' })}>{tagline}</p>}
          {socialLinks && socialLinks.length > 0 && (
              <div className="social-links">
                  {socialLinks.map(link => (
                      <a key={link.platformName} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.platformName}>
                          <SocialIcon platform={link.platformName} size={24} />
                      </a>
                  ))}
              </div>
          )}
        </div>
      </footer>
    );
  };
  
  export default Footer;
  