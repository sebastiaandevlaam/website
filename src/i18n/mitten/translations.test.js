import { describe, it, expect } from 'vitest';
import { LANGUAGES, LOADERS, makeTranslator } from './index';
import en from './locale/en';

const locales = import.meta.glob('./locale/*.js', { eager: true, import: 'default' });
const byCode = Object.fromEntries(
    Object.entries(locales).map(([path, dict]) => [path.match(/([\w-]+)\.js$/)[1], dict]),
);
const translations = LANGUAGES.filter(l => l.value !== 'en').map(l => [l.value, byCode[l.value]]);

const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();
const markdownMarks = (text) => (text.match(/__|\*\*|\*/g) || []).length;

// The option values Contentful sends today, plus the hardcoded size types.
const OPTION_VALUES = [
    'Boy', 'Girl', 'Christmas', 'Hanukkah', 'Other', 'Youth', 'Adult',
    'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Turquoise', 'Brown', 'Black',
    'Sports', 'Music', 'Art', 'Reading', 'Computers', 'Video games', 'Legos', 'Board games',
    'Dolls', 'Trains', 'Trucks/cars', 'Dress-up',
];

describe('Operation Mitten translations', () => {
    it('has a locale file for every language in the picker', () => {
        for (const { value } of LANGUAGES) expect(byCode[value], value).toBeDefined();
    });

    it('can load every language in the picker', async () => {
        for (const { value } of LANGUAGES.filter(l => l.value !== 'en')) {
            expect((await LOADERS[value]?.())?.default, value).toBe(byCode[value]);
        }
    });

    it.each(translations)('%s translates every UI string with the same placeholders', (code, dict) => {
        expect(Object.keys(dict.ui).sort()).toEqual(Object.keys(en.ui).sort());
        for (const [key, text] of Object.entries(en.ui)) {
            expect(placeholders(dict.ui[key]), `${code}.ui.${key}`).toEqual(placeholders(text));
        }
    });

    it.each(translations)('%s translates every option and content field', (code, dict) => {
        for (const value of OPTION_VALUES) expect(dict.options[value], `${code}: ${value}`).toBeTruthy();
        expect(Object.keys(dict.content).sort()).toEqual(Object.keys(en.content).sort());
        // Bold/italic markers must survive translation in pairs.
        for (const [field, text] of Object.entries(en.content)) {
            expect(markdownMarks(dict.content[field]), `${code}.content.${field}`).toBe(markdownMarks(text));
        }
    });
});

describe('makeTranslator', () => {
    const { t, option, content } = makeTranslator(byCode.es);

    it('fills placeholders and falls back to English for a missing key', () => {
        expect(t('child', { n: 2 })).toBe('Niño/a 2');
        expect(makeTranslator({ ui: {} }).t('child', { n: 3 })).toBe('Child 3');
    });

    it('translates option labels and passes unknown values through', () => {
        expect(option('Christmas')).toBe('Navidad');
        expect(option('Kwanzaa')).toBe('Kwanzaa');
    });

    it('translates Contentful text only while it matches the source English', () => {
        expect(content('successHeadline', 'Thank you!')).toBe('¡Gracias!');
        expect(content('successHeadline', 'Thank you!\n')).toBe('¡Gracias!');
        // Spacing and line breaks don't matter — paste into Contentful adds them.
        expect(content('pickupInformation', `  ${en.content.pickupInformation.replace(' between ', '\nbetween  ')}\n`))
            .toBe(byCode.es.content.pickupInformation);
        // An editor changed the deadline — show the new English, not the old date.
        expect(content('introText', 'Submissions are due __November 20th__.'))
            .toBe('Submissions are due __November 20th__.');
        expect(content('closedMessage', undefined)).toBeUndefined();
    });
});
