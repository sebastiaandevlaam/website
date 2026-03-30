import { useState, useEffect } from 'react';
import { createClient } from 'contentful';

// --- Contentful Client Initialization ---
const SPACE_ID = 'sm8a9cvs0gzu';
// Content Delivery API token (published content)
const DELIVERY_TOKEN = 'cDYhRs7L5ijvVgHUuXhHC6CHD-ebtJ5zJ47X_YjUhaE';
// Content Preview API token — find it in Contentful > Settings > API Keys > Content preview tokens
const PREVIEW_TOKEN = 'qa2FJPG8o-Y9tv02d0Zg289dXpeqzGdbbpOj_Whmdac';

// Detect if running inside Contentful's Live Preview iframe
const isInPreview = (() => {
  try {
    return typeof window !== 'undefined' && window.top !== window;
  } catch {
    return true; // Cross-origin iframe (e.g. Contentful editor)
  }
})();

const usePreviewApi = isInPreview && Boolean(PREVIEW_TOKEN);

const client = createClient({
  space: SPACE_ID,
  accessToken: usePreviewApi ? PREVIEW_TOKEN : DELIVERY_TOKEN,
  ...(usePreviewApi ? { host: 'preview.contentful.com' } : {}),
});

// Detect if the current URL is a news post route (/news/{slug})
const getNewsPostSlug = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'news' && parts.length === 2 ? parts[1] : null;
};

// --- Custom Hook for Fetching Contentful Data ---
// Returns full entry objects (not just .fields) so that useContentfulLiveUpdates
// can subscribe to live updates in the consuming component.
const useContentfulData = () => {
  const [pageEntry, setPageEntry] = useState(null);
  const [newsPostEntry, setNewsPostEntry] = useState(null);
  const [siteSettingsEntry, setSiteSettingsEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const SITE_SETTINGS_CONTENT_TYPE_ID = 'siteSettings';
    const newsPostSlug = getNewsPostSlug();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (newsPostSlug) {
          // News post route: fetch the newsPost entry directly by slug
          const postResults = await client.getEntries({
            content_type: 'newsPost',
            'fields.slug': newsPostSlug,
            include: 5,
            limit: 1,
          });

          if (postResults.items.length === 0) {
            throw new Error(`No news post found for slug '${newsPostSlug}'.`);
          }
          setNewsPostEntry(postResults.items[0]);
        } else {
          // Normal page route: fetch by slug
          const slug = window.location.pathname;
          const pageResults = await client.getEntries({
            content_type: 'page',
            'fields.slug': slug,
            include: 10,
            limit: 1,
          });

          if (pageResults.items.length === 0) {
            throw new Error(`No page found for slug '${slug}'.`);
          }
          setPageEntry(pageResults.items[0]);
        }

        // Always fetch site settings
        const settingsEntries = await client.getEntries({
          content_type: SITE_SETTINGS_CONTENT_TYPE_ID,
          include: 10,
          limit: 1,
        });

        if (settingsEntries.items.length > 0) {
          setSiteSettingsEntry(settingsEntries.items[0]);
        } else {
          console.warn(`No Site Settings entry found with content type ID '${SITE_SETTINGS_CONTENT_TYPE_ID}'.`);
          setSiteSettingsEntry(null);
        }

      } catch (err) {
        console.error("Error fetching Contentful data:", err);
        setError(err);
        setPageEntry(null);
        setNewsPostEntry(null);
        setSiteSettingsEntry(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { pageEntry, newsPostEntry, siteSettingsEntry, isLoading, error };
};

export { useContentfulData };
