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

// --- Custom Hook for Fetching Contentful Data ---
// Returns full entry objects (not just .fields) so that useContentfulLiveUpdates
// can subscribe to live updates in the consuming component.
const useContentfulData = () => {
  const [pageEntry, setPageEntry] = useState(null);
  const [siteSettingsEntry, setSiteSettingsEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const PAGE_CONTENT_TYPE_ID = 'page';
    const SITE_SETTINGS_CONTENT_TYPE_ID = 'siteSettings';
    const slug = window.location.pathname;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const pageResults = await client.getEntries({
          content_type: PAGE_CONTENT_TYPE_ID,
          'fields.slug': slug,
          include: 10,
          limit: 1
        });

        if (pageResults.items.length === 0) {
          throw new Error(`No page found for slug '${slug}'.`);
        }
        setPageEntry(pageResults.items[0]);

        const settingsEntries = await client.getEntries({
          content_type: SITE_SETTINGS_CONTENT_TYPE_ID,
          include: 10,
          limit: 1
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
        setSiteSettingsEntry(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { pageEntry, siteSettingsEntry, isLoading, error };
};

export { useContentfulData };
