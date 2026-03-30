// Header Component
import { useState } from "react";
import { useContentfulInspectorMode } from '@contentful/live-preview/react';

// import components
import ButtonLink from "./ButtonLink";
import Icon from "./Icon";

//import assets
import logo from '../assets/hps_logo.png'

const NavMenuItem = ({ item, isMobile, onMobileClick }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId: item.sys.id });

  if (isMobile) {
    return (
      <li>
        <a
          href={item.fields.url}
          onClick={onMobileClick}
          className={item.fields.style === 'Primary Button' ? 'mobile-contact-link' : ''}
          {...inspectorProps({ fieldId: 'textLabel' })}
        >
          {item.fields.textLabel}
        </a>
      </li>
    );
  }

  return (
    <li {...inspectorProps({ fieldId: 'textLabel' })}>
      <ButtonLink {...item.fields} arrow={false} />
    </li>
  );
};

const Header = ({ siteName, logoText, navigationMenu, entryId }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const inspectorProps = useContentfulInspectorMode({ entryId });

  const logoAltText = siteName || "Holliston Pantry Shelf Logo";

  return (
    <header className="header">
      <nav className="container">
        {/* Logo — flex row, never wraps */}
        <a href="/" className="logo">
          <img
            src={logo}
            alt={logoAltText}
            className="logo-image"
          />
          <span {...inspectorProps({ fieldId: 'logoText' })}>{logoText || siteName}</span>
        </a>

        {/* Desktop Navigation Links */}
        <ul className="nav-links-desktop">
          {navigationMenu?.menuItems?.map((item) => (
            <NavMenuItem key={item.sys.id} item={item} />
          ))}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <Icon name="X" size={28} /> : <Icon name="Menu" size={28} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul>
          {navigationMenu?.menuItems?.map((item) => (
            <NavMenuItem key={item.sys.id} item={item} isMobile onMobileClick={() => setIsMobileMenuOpen(false)} />
          ))}
        </ul>
      </div>
    </header>
  );
};

export default Header;