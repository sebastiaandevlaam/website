import React, { useEffect } from 'react';
import { useContentfulLiveUpdates } from '@contentful/live-preview/react';

//import styles
import './App.css'

//import components
import SectionRenderer from './components/SectionRenderer';
import Header from './components/Header';
import Footer from './components/Footer';
import AnnouncementHeader from './components/AnnouncementHeader';
import NewsPostSection from './components/NewsPostSection';

import { useContentfulData } from './hooks/useContentfulData';

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
        if (liveNewsPostEntry) {
            const post = liveNewsPostEntry.fields;
            document.title = post?.title
                ? `${post.title} | ${siteSettings?.siteName || 'News'}`
                : siteSettings?.siteName || 'News';
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', post?.summary || '');
        } else {
            document.title = pageData?.seoTitle || siteSettings?.siteName || 'Website';
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', pageData?.seoDescription || '');
        }
    }, [pageData, liveNewsPostEntry, siteSettings]);

    // Handle Loading State
    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading Content...</div>;
    }

    // Handle Error State
    if (error) {
        return <div style={{ padding: '2rem', color: 'red' }}>Error loading content: {error.message}</div>;
    }

    if (!siteSettings) {
        return <div style={{ padding: '2rem', color: 'orange' }}>Content could not be fully loaded.</div>;
    }

    const sharedHeader = (
        <>
            {siteSettings.announcementHeader?.map((item) => (
                <AnnouncementHeader key={item.sys.id} {...item.fields} entryId={item.sys.id} />
            ))}
            <Header
                siteName={siteSettings.siteName}
                logoText={siteSettings.logoText}
                navigationMenu={siteSettings.headerNavigationMenu?.fields || siteSettings.headerNavigationMenu}
                entryId={liveSiteSettingsEntry?.sys?.id}
            />
        </>
    );

    const sharedFooter = (
        <Footer
            copyrightText={siteSettings.footerCopyrightText}
            tagline={siteSettings.footerTagline}
            socialLinks={siteSettings.socialMediaLinks?.map(link => link.fields) || []}
            entryId={liveSiteSettingsEntry?.sys?.id}
        />
    );

    // News post page — auto-rendered from newsPost entry, no page entry needed
    if (liveNewsPostEntry) {
        return (
            <div>
                {sharedHeader}
                <main>
                    <NewsPostSection
                        post={liveNewsPostEntry}
                        entryId={liveNewsPostEntry.sys?.id}
                    />
                </main>
                {sharedFooter}
            </div>
        );
    }

    // Normal page — requires a matching page entry in Contentful
    if (!pageData) {
        return <div style={{ padding: '2rem', color: 'orange' }}>Content could not be fully loaded.</div>;
    }

    return (
        <div>
            {sharedHeader}
            <main>
                {pageData.sections?.map((section) => {
                    section.fields.contentType = section.sys.contentType.sys.id
                    return (
                        <SectionRenderer
                            key={section.sys.id}
                            entryId={section.sys.id}
                            section={section.fields}
                            sitePhone={siteSettings.defaultContactPhone}
                            siteEmail={siteSettings.defaultContactEmail}
                        />
                    )
                })}
            </main>
            {sharedFooter}
        </div>
    )
}

export default App;
