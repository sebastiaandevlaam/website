// Footer Component
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { MapPin, Phone, Mail } from 'lucide-react';
import SocialIcon from './SocialIcon';
import gbfbLogo from '@/assets/gbfb-affiliate-logo.png';

const Footer = ({ siteName, copyrightText, tagline, socialLinks, entryId, address, phone, email }) => {
    const currentYear = new Date().getFullYear();
    const inspectorProps = useContentfulInspectorMode({ entryId });
    const hasContact = address || phone || email;

    return (
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            {siteName && <h3 className="footer-sitename" {...inspectorProps({ fieldId: 'siteName' })}>{siteName}</h3>}
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

          {hasContact && (
            <div className="footer-contact">
              <h4 className="footer-heading">Visit &amp; Contact</h4>
              <ul>
                {address && (
                  <li {...inspectorProps({ fieldId: 'footerAddress' })}>
                    <MapPin size={16} aria-hidden="true" />
                    <span>{address}</span>
                  </li>
                )}
                {phone && (
                  <li>
                    <Phone size={16} aria-hidden="true" />
                    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
                  </li>
                )}
                {email && (
                  <li>
                    <Mail size={16} aria-hidden="true" />
                    <a href={`mailto:${email}`}>{email}</a>
                  </li>
                )}
              </ul>
            </div>
          )}

          <a
            className="footer-affiliate"
            href="https://www.gbfb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by The Greater Boston Food Bank"
          >
            <img src={gbfbLogo} alt="Powered by The Greater Boston Food Bank" />
          </a>
        </div>
        <div className="container footer-bar">
          <p className="copyright" {...inspectorProps({ fieldId: 'footerCopyrightText' })}>&copy; {currentYear} {copyrightText}</p>
        </div>
      </footer>
    );
  };

  export default Footer;
