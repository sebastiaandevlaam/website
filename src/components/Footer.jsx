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
            {/* The footer columns are siblings of the page's top-level content,
                so both headings are h2. They were h3/h4, which skipped a level
                on pages whose main content has no h2 at all — a news post, for
                instance, went h1 straight to the footer's h3. Both classes set
                their own size, weight and colour, so the tag change is
                visually inert. */}
            {siteName && <h2 className="footer-sitename" {...inspectorProps({ fieldId: 'siteName' })}>{siteName}</h2>}
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
              <h2 className="footer-heading">Visit &amp; Contact</h2>
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
          {/* An accessibility statement has to be findable; the footer is where
              people look for it. Requires the /accessibility page entry to be
              published in Contentful — see docs/accessibility-statement.md. */}
          <p className="footer-legal">
            <a href="/accessibility">Accessibility Statement</a>
          </p>
        </div>
      </footer>
    );
  };

  export default Footer;
