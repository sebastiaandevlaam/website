import { useState, useRef, useCallback } from 'react';
import { appCheckHeaders } from '@/utils/appCheck';

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL;

// Name of the honeypot input. Must match HONEYPOT_FIELD in functions/security.js.
export const HONEYPOT_FIELD = 'contactPreference';

// One place for the POST-to-Cloud-Function dance the three forms all do:
// loading state, error state, App Check header, and the two anti-bot fields.
// Each form keeps its own validation and markup; only the plumbing is shared.
export function useFunctionSubmit(functionName) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  // When this form first rendered, used server-side to reject submissions that
  // arrive faster than a person could type. A ref so re-renders don't reset it.
  const loadedAt = useRef(Date.now());
  const honeypot = useRef('');

  const submit = useCallback(async (payload) => {
    setIsLoading(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(await appCheckHeaders()) };
      const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          formLoadedAt: loadedAt.current,
          [HONEYPOT_FIELD]: honeypot.current,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setIsSubmitted(true);
        return { ok: true, data };
      }
      setError(data.error || 'Something went wrong. Please try again.');
      return { ok: false, data };
    } catch {
      setError('Unable to submit the form. Please try again.');
      return { ok: false, data: {} };
    } finally {
      setIsLoading(false);
    }
  }, [functionName]);

  return {
    submit,
    isLoading,
    isSubmitted,
    error,
    setError,
    setIsSubmitted,
    honeypotProps: {
      name: HONEYPOT_FIELD,
      onChange: (e) => { honeypot.current = e.target.value; },
    },
  };
}
