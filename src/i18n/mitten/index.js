import { useEffect, useMemo, useState } from 'react';
import en from './locale/en';

// The same languages, labels and order as the shopper application at
// shoppers.hollistonpantryshelf.org/apply, so a family meets one familiar
// picker on both.
export const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'zh', label: '中文' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'te', label: 'తెలుగు' },
    { value: 'ar', label: 'العربية' },
    { value: 'ko', label: '한국어' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'ht', label: 'Kreyòl ayisyen' },
    { value: 'sq', label: 'Shqip' },
    { value: 'el', label: 'Ελληνικά' },
];

export const RTL_LANGUAGES = ['ar'];

// Each translation is its own chunk, fetched only when a family picks it, so
// visitors who never open the dropdown don't download thirteen languages.
// Listed explicitly rather than via import.meta.glob: a glob is resolved once,
// so a dev server that saw it before a locale file existed silently had no
// loader for it and the dropdown did nothing.
export const LOADERS = {
    es: () => import('./locale/es.js'),
    pt: () => import('./locale/pt.js'),
    ru: () => import('./locale/ru.js'),
    zh: () => import('./locale/zh.js'),
    hi: () => import('./locale/hi.js'),
    te: () => import('./locale/te.js'),
    ar: () => import('./locale/ar.js'),
    ko: () => import('./locale/ko.js'),
    nl: () => import('./locale/nl.js'),
    ht: () => import('./locale/ht.js'),
    sq: () => import('./locale/sq.js'),
    el: () => import('./locale/el.js'),
};

// Contentful text is compared ignoring spacing and line breaks, so text pasted
// into the editor with a stray newline or double space still matches.
const normalize = (text) => text.replace(/\s+/g, ' ').trim();

const interpolate = (text, vars) =>
    text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));

// Builds the three lookups the form uses from one language's dictionary.
// Exported for the tests; components use `useMittenTranslation`.
export function makeTranslator(dict) {
    return {
        // Hardcoded UI text, falling back to English for a missing key.
        t: (key, vars = {}) => interpolate(dict.ui?.[key] ?? en.ui[key] ?? key, vars),
        // Label for a Contentful option value; the value itself is unchanged.
        option: (value) => dict.options?.[value] ?? value,
        // Contentful prose — translated only while it still matches the
        // English the translation was made from. See locale/en.js.
        content: (field, value) => {
            if (!value || !en.content[field] || normalize(value) !== normalize(en.content[field])) return value;
            return dict.content?.[field] ?? value;
        },
    };
}

export function useMittenTranslation(lang) {
    const [loaded, setLoaded] = useState({ en });

    useEffect(() => {
        if (loaded[lang]) return undefined;
        if (!LOADERS[lang]) {
            console.error(`No translation loader for "${lang}" — add it to LOADERS`);
            return undefined;
        }
        let current = true;
        LOADERS[lang]()
            .then(module => {
                if (current) setLoaded(prev => ({ ...prev, [lang]: module.default }));
            })
            // Offline or a failed chunk: the form simply stays in English.
            .catch(err => console.error(`Could not load the ${lang} translation`, err));
        return () => { current = false; };
    }, [lang, loaded]);

    // English is shown for the moment it takes the chunk to arrive, so `lang`
    // and `dir` follow the text actually on screen, not the dropdown.
    const activeLang = loaded[lang] ? lang : 'en';
    const translator = useMemo(() => makeTranslator(loaded[activeLang]), [loaded, activeLang]);

    return {
        ...translator,
        lang: activeLang,
        dir: RTL_LANGUAGES.includes(activeLang) ? 'rtl' : 'ltr',
    };
}
