// Firebase App Check — proves a form post came from our own site rather than
// a script. This is the only bot defence that actually verifies origin; the
// honeypot, timing and rate limits are all best-effort.
//
// Entirely inert until VITE_RECAPTCHA_SITE_KEY is set, and the Firebase SDK is
// imported dynamically so it is not in the main bundle until then. Turning it
// on before registering App Check in the console would make every submission
// fail, so the switch is deliberately explicit — see functions/README-SECURITY.md.

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export const isAppCheckConfigured = Boolean(SITE_KEY);

let tokenPromise;

async function initAppCheck() {
  const { initializeApp } = await import('firebase/app');
  const { initializeAppCheck, ReCaptchaV3Provider, getToken } = await import('firebase/app-check');

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  });

  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });

  return { appCheck, getToken };
}

// Returns a header object to spread into fetch, or {} when App Check is off or
// unavailable. Never throws: a failure here must not stop a family submitting a
// form — the server decides whether a missing token is fatal, via
// APP_CHECK_ENFORCED.
export async function appCheckHeaders() {
  if (!isAppCheckConfigured) return {};
  try {
    tokenPromise = tokenPromise || initAppCheck();
    const { appCheck, getToken } = await tokenPromise;
    const { token } = await getToken(appCheck, /* forceRefresh */ false);
    return token ? { 'X-Firebase-AppCheck': token } : {};
  } catch (err) {
    console.warn('App Check token unavailable:', err);
    return {};
  }
}
