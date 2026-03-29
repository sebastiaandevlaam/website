import React, { useEffect } from 'react';
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';

//import styles
import './App.css'

//import components
import SectionRenderer from './components/SectionRenderer';
import Header from './components/Header';
import Footer from './components/Footer';
import AnnouncementHeader from './components/AnnouncementHeader';

import { useContentfulData } from './hooks/useContentfulData';

// Main App Component
function App() {

    const { pageEntry, siteSettingsEntry, isLoading, error } = useContentfulData();

    // Subscribe to live updates from the Contentful editor
    const livePageEntry = useContentfulLiveUpdates(pageEntry);
    const liveSiteSettingsEntry = useContentfulLiveUpdates(siteSettingsEntry);

    const pageData = livePageEntry?.fields;
    const siteSettings = liveSiteSettingsEntry?.fields;

    // Set SEO data (using fetched data)
    useEffect(() => {
        document.title = pageData?.seoTitle || siteSettings?.siteName || 'Website';
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = "description";
            document.head.appendChild(metaDesc);
        }
        if (pageData?.seoDescription) {
            metaDesc.setAttribute('content', pageData.seoDescription);
        } else {
            metaDesc.setAttribute('content', '');
        }
    }, [pageData, siteSettings]);

    // Handle Loading State
    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Content...</div>;
    }

    // Handle Error State
    if (error) {
        return <div style={{ padding: '2rem', color: 'red' }}>Error loading content: {error.message}</div>;
    }

    // Handle case where data might still be missing after load/error handling
    if (!pageData || !siteSettings) {
        return <div style={{ padding: '2rem', color: 'orange' }}>Content could not be fully loaded.</div>;
    }

    // Render the app with fetched data
    return (
        <div>
            {siteSettings.announcementHeader?.map((item) => {
                return (<AnnouncementHeader key={item.sys.id} {...item.fields} entryId={item.sys.id} />)
            })}

            <Header
                siteName={siteSettings.siteName}
                logoText={siteSettings.logoText}
                navigationMenu={siteSettings.headerNavigationMenu?.fields || siteSettings.headerNavigationMenu}
                entryId={liveSiteSettingsEntry?.sys?.id}
            />
            <main>
                {pageData.sections?.map((section) => {
                    section.fields.contentType = section.sys.contentType.sys.id
                    return (
                        <SectionRenderer
                            key={section.sys.id}
                            entryId={section.sys.id}
                            section={section.fields}
                        />
                    )
                })}
            </main>
            <Footer
                copyrightText={siteSettings.footerCopyrightText}
                tagline={siteSettings.footerTagline}
                socialLinks={siteSettings.socialMediaLinks?.map(link => link.fields) || []}
                entryId={liveSiteSettingsEntry?.sys?.id}
            />
        </div>
    )
}

export default App;
