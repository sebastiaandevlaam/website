import { useState, useEffect } from 'react';
import { createClient } from 'contentful';
import {
  SPACE_ID,
  ENVIRONMENT,
  DELIVERY_TOKEN,
  PREVIEW_TOKEN,
  isContentfulPreviewFrame,
} from '@/utils/contentfulConfig';

// Draft content loads only inside a real Contentful preview frame — see
// isContentfulPreviewFrame for why "am I in an iframe?" was not enough.
const usePreviewApi = isContentfulPreviewFrame() && Boolean(PREVIEW_TOKEN);

const client = createClient({
  space: SPACE_ID,
  environment: ENVIRONMENT,
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
    const newsPostSlug = getNewsPostSlug();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const contentPromise = newsPostSlug
          ? client.getEntries({ content_type: 'newsPost', 'fields.slug': newsPostSlug, include: 5, limit: 1 })
          : client.getEntries({ content_type: 'page', 'fields.slug': window.location.pathname, include: 10, limit: 1 });

        const settingsPromise = client.getEntries({ content_type: 'siteSettings', include: 10, limit: 1 });

        const [contentResult, settingsResult] = await Promise.all([contentPromise, settingsPromise]);

        if (contentResult.items.length === 0) {
          const type = newsPostSlug ? 'news post' : 'page';
          const slug = newsPostSlug || window.location.pathname;
          const err = new Error(`No ${type} found for slug '${slug}'.`);
          err.notFound = true;
          throw err;
        }

        if (newsPostSlug) {
          setNewsPostEntry(contentResult.items[0]);
        } else {
          setPageEntry(contentResult.items[0]);
        }

        if (settingsResult.items.length > 0) {
          setSiteSettingsEntry(settingsResult.items[0]);
        } else {
          console.warn('No Site Settings entry found.');
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
