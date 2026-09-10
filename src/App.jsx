import { useEffect } from 'react';
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';

//import styles
import './App.css'
// After App.css: these rules intentionally override the generic .container.
import './styles/forms.css'

//import components
import SectionRenderer from './components/SectionRenderer';
import Header from './components/Header';
import Footer from './components/Footer';
import AnnouncementHeader from './components/AnnouncementHeader';
import NewsPostSection from './components/NewsPostSection';
import NotFoundSection from './components/NotFoundSection';
import SectionErrorBoundary from './components/SectionErrorBoundary';

import { useContentfulData } from './hooks/useContentfulData';

// First focusable element on the page, so keyboard users can jump the header
// and nav straight to the content (WCAG 2.4.1). Visually hidden until focused.
const SkipLink = () => (
    <a className="skip-link" href="#main-content">Skip to main content</a>
);

// tabIndex -1 lets the skip link actually move focus here, not just scroll.
const Main = ({ children }) => (
    <main id="main-content" tabIndex={-1}>{children}</main>
);

// Main App Component
function App() {

    const { pageEntry, newsPostEntry, siteSettingsEntry, isLoading, error } = useContentfulData();

    // Subscribe to live updates from the Contentful editor
    const livePageEntry = useContentfulLiveUpdates(pageEntry);
    const liveNewsPostEntry = useContentfulLiveUpdates(newsPostEntry);
    const liveSiteSettingsEntry = useContentfulLiveUpdates(siteSettingsEntry);

    const pageData = livePageEntry?.fields;
    const siteSettings = liveSiteSettingsEntry?.fields;

    // Set SEO data
    useEffect(() => {
        const setMeta = (title, description) => {
            document.title = title;
            let el = document.querySelector('meta[name="description"]');
            if (!el) {
                el = document.createElement('meta');
                el.name = 'description';
                document.head.appendChild(el);
            }
            el.setAttribute('content', description || '');
        };
        if (liveNewsPostEntry) {
            const post = liveNewsPostEntry.fields;
            const title = post?.title ? `${post.title} | ${siteSettings?.siteName || 'News'}` : siteSettings?.siteName || 'News';
            setMeta(title, post?.summary);
        } else {
            setMeta(pageData?.seoTitle || siteSettings?.siteName || 'Website', pageData?.seoDescription);
        }
    }, [pageData, liveNewsPostEntry, siteSettings]);

    // Handle Loading State
    if (isLoading) {
        return (
            <Main>
                {/* role/aria-live go on a child, not on <main> — putting them on
                    <main> would replace the landmark role and leave the page
                    with no main region at all. */}
                <div
                    role="status"
                    aria-live="polite"
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
                >
                    Loading Content...
                </div>
            </Main>
        );
    }

    // Handle Error State
    if (error) {
        if (error.notFound) {
            return (
                <div>
                    <SkipLink />
                    <Main><NotFoundSection /></Main>
                </div>
            );
        }
        // The SDK message can name internal hosts and request details, which
        // helps nobody who is looking at this page. Log it, show a sentence.
        console.error('Error loading Contentful content:', error);
        return (
            <Main>
                <p role="alert" style={{ padding: '2rem', color: 'var(--pantry-red)' }}>
                    Sorry, this page could not be loaded right now. Please try again shortly.
                </p>
            </Main>
        );
    }

    if (!siteSettings) {
        return (
            <Main>
                <p role="alert" style={{ padding: '2rem', color: 'var(--pantry-red)' }}>
                    Content could not be fully loaded.
                </p>
            </Main>
        );
    }

    const sharedHeader = (
        <>
            {siteSettings.announcementHeader?.map((item) => (
                <AnnouncementHeader key={item.sys.id} {...item.fields} entryId={item.sys.id} />
            ))}
            <Header
                siteName={siteSettings.siteName}
                logoText={siteSettings.logoText}
                tagline={siteSettings.tagline}
                navigationMenu={siteSettings.headerNavigationMenu?.fields || siteSettings.headerNavigationMenu}
                entryId={liveSiteSettingsEntry?.sys?.id}
            />
        </>
    );

    const sharedFooter = (
        <Footer
            siteName={siteSettings.siteName}
            copyrightText={siteSettings.footerCopyrightText}
            tagline={siteSettings.footerTagline}
            socialLinks={siteSettings.socialMediaLinks?.map(link => link.fields) || []}
            address={siteSettings.footerAddress}
            phone={siteSettings.defaultContactPhone}
            email={siteSettings.defaultContactEmail}
            entryId={liveSiteSettingsEntry?.sys?.id}
        />
    );

    // News post page — auto-rendered from newsPost entry, no page entry needed
    if (liveNewsPostEntry) {
        return (
            <div>
                <SkipLink />
                {sharedHeader}
                <Main>
                    <NewsPostSection
                        post={liveNewsPostEntry}
                        entryId={liveNewsPostEntry.sys?.id}
                    />
                </Main>
                {sharedFooter}
            </div>
        );
    }

    // The hero supplies the page's <h1>. Pages built without one (e.g. /about,
    // /news) would otherwise have no level-one heading, so the first section's
    // title is promoted instead of adding a second, hidden heading.
    const hasHero = pageData?.sections?.some(
        (s) => s.sys?.contentType?.sys?.id === 'sectionHero'
    );

    // Normal page — requires a matching page entry in Contentful
    if (!pageData) {
        return (
            <div>
                <SkipLink />
                {sharedHeader}
                <Main><NotFoundSection /></Main>
                {sharedFooter}
            </div>
        );
    }

    return (
        <div>
            <SkipLink />
            {sharedHeader}
            <Main>
                {pageData.sections?.map((section, i) => {
                    // Was `section.fields.contentType = …` — assigning into the
                    // Contentful response mid-render, which mutates the object
                    // live preview also holds. Pass it as a prop instead.
                    const contentType = section.sys?.contentType?.sys?.id;
                    return (
                        <SectionErrorBoundary key={section.sys.id} contentType={contentType}>
                            <SectionRenderer
                                entryId={section.sys.id}
                                contentType={contentType}
                                section={section.fields}
                                titleTag={!hasHero && i === 0 ? 'h1' : 'h2'}
                                sitePhone={siteSettings.defaultContactPhone}
                                siteEmail={siteSettings.defaultContactEmail}
                            />
                        </SectionErrorBoundary>
                    )
                })}
            </Main>
            {sharedFooter}
        </div>
    )
}

export default App;
