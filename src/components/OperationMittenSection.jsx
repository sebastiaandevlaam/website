import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { isValidUsPhone, formatUsPhone } from '@/utils/phone';
import { useFunctionSubmit } from '@/hooks/useFunctionSubmit';
import { backgroundClass, isWithinWindow } from '@/utils/contentful';
import { trimMarkdown } from '@/utils/markdown';
import { LANGUAGES, useMittenTranslation } from '@/i18n/mitten';
import HoneypotField from './form/HoneypotField';
import SuccessCard from './form/SuccessCard';

// Structural choices that describe how children's clothing is sized, not
// editorial ones — these stay in code like the volunteer form's contact times.
const SIZE_TYPES = ['Youth', 'Adult'];
// Field name, input id and label key are listed explicitly rather than derived
// from one another — deriving them silently renamed the shoes input.
const SIZE_FIELDS = [
    { field: 'shirtSize', id: 'shirt', label: 'shirt' },
    { field: 'pantsSize', id: 'pants', label: 'pants' },
    { field: 'dressSize', id: 'dress', label: 'dress' },
    { field: 'shoeSize', id: 'shoes', label: 'shoes' },
];
const WISHES_PER_CHILD = 3;

// Matches the four child blocks on the paper form; raise it in Contentful
// via `maxChildren` when a larger family needs it.
const DEFAULT_MAX_CHILDREN = 4;
const DEFAULT_GENDER_OPTIONS = ['Boy', 'Girl'];
const DEFAULT_HOLIDAY_OPTIONS = ['Christmas', 'Hanukkah', 'Other'];

const EMPTY_CHILD = {
    gender: '',
    age: '',
    shirtSize: '',
    pantsSize: '',
    dressSize: '',
    shoeSize: '',
    sizeType: '',
    clothingPreference: '',
    favoriteColors: [],
    interests: [],
    interestsOther: '',
    favoriteCharacter: '',
    favoriteSportsTeam: '',
    wishes: Array(WISHES_PER_CHILD).fill(''),
};

const EMPTY_FAMILY = {
    shopperNumber: '',
    parentFirstName: '',
    phone: '',
    additionalPhone: '',
    holiday: '',
    holidayOther: '',
};

// Grow or shrink the child list to `count`, keeping whatever the family has
// already typed for the children that survive the change.
const resizeChildren = (children, count) =>
    Array.from({ length: count }, (_, i) => children[i] || { ...EMPTY_CHILD, wishes: Array(WISHES_PER_CHILD).fill('') });

const OperationMittenSection = ({
    title,
    introText,
    eligibilityNote,
    pickupInformation,
    maxChildren,
    genderOptions,
    holidayOptions,
    colorOptions,
    interestOptions,
    openDate,
    closeDate,
    closedMessage,
    successHeadline,
    successBody,
    backgroundStyle,
    entryId,
    titleTag,
}) => {
    const TitleTag = titleTag || 'h2';
    const inspectorProps = useContentfulInspectorMode({ entryId });
    const bgClass = backgroundClass(backgroundStyle);

    const childLimit = Math.min(maxChildren || DEFAULT_MAX_CHILDREN, 12);
    const genders = genderOptions?.length ? genderOptions : DEFAULT_GENDER_OPTIONS;
    const holidays = holidayOptions?.length ? holidayOptions : DEFAULT_HOLIDAY_OPTIONS;
    const colors = colorOptions || [];
    const interests = interestOptions || [];

    const [family, setFamily] = useState(EMPTY_FAMILY);
    const [children, setChildren] = useState(() => resizeChildren([], 1));
    const { submit, isLoading, isSubmitted, error, setError, honeypotProps } =
        useFunctionSubmit('submitOperationMitten');
    // The validation problem being shown, as { field, key, vars }: `field` is
    // the id that gets the inline message, red border and aria-invalid. The
    // message is kept as a key rather than text so it follows a language
    // change made while it is on screen.
    const [invalid, setInvalid] = useState(null);
    const invalidField = invalid?.field;

    const [language, setLanguage] = useState('en');
    const { t, option, content, lang, dir } = useMittenTranslation(language);

    // The drive runs on a schedule; outside the window the form is replaced by
    // the closed message rather than accepting entries nobody will shop for.
    const isClosed = !isWithinWindow(openDate, closeDate);

    // Once the parent starts fixing things, clear the complaint.
    const clearError = () => { setError(''); setInvalid(null); };

    // Spread onto an input to mark it as the field at fault.
    const invalidProps = (id) => (invalidField === id
        ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
        : {});

    // Inline message rendered directly beneath the offending field.
    const FieldError = ({ id }) => (invalidField === id
        ? <p className="form-field-error" id={`${id}-error`}>{t(invalid.key, invalid.vars)}</p>
        : null);

    const setFamilyField = (field, value) => {
        setFamily(prev => ({ ...prev, [field]: value }));
        clearError();
    };

    // Tidy a valid number into one shape on blur, so the parent can see we
    // understood what they typed. Invalid input is left alone for them to fix.
    const normalizePhoneField = (field) =>
        setFamily(prev => ({ ...prev, [field]: formatUsPhone(prev[field]) }));

    const setChildField = (index, field, value) => {
        setChildren(prev => prev.map((child, i) => (i === index ? { ...child, [field]: value } : child)));
        clearError();
    };

    const setWish = (index, wishIndex, value) => {
        setChildren(prev => prev.map((child, i) => (
            i === index
                ? { ...child, wishes: child.wishes.map((w, j) => (j === wishIndex ? value : w)) }
                : child
        )));
    };

    // Adds or removes one value from a child's multi-select list. Shared by
    // interests and favourite colours.
    const toggleChildValue = (index, field, value) => {
        setChildren(prev => prev.map((child, i) => (
            i === index
                ? {
                    ...child,
                    [field]: child[field].includes(value)
                        ? child[field].filter(v => v !== value)
                        : [...child[field], value],
                }
                : child
        )));
    };

    const handleChildCountChange = (count) => {
        setChildren(prev => resizeChildren(prev, count));
        clearError();
    };

    // Returns the first problem as { field, key, vars }, where `field` is the
    // id of the input at fault and `key` the message in the translations. The
    // form is long enough that a message alone reads as "nothing happened" —
    // we need to know where to send the user.
    const validate = () => {
        const problem = (field, key, vars) => ({ field, key, vars });

        if (!family.shopperNumber.trim())
            return problem('mitten-shopper-number', 'errorShopperNumber');
        if (!family.parentFirstName.trim())
            return problem('mitten-parent-name', 'errorParentName');
        if (!family.phone.trim())
            return problem('mitten-phone', 'errorPhoneRequired');
        if (!isValidUsPhone(family.phone))
            return problem('mitten-phone', 'errorPhoneInvalid');
        if (family.additionalPhone.trim() && !isValidUsPhone(family.additionalPhone))
            return problem('mitten-phone-2', 'errorAdditionalPhone');
        if (!family.holiday)
            return problem('mitten-holiday-0', 'errorHoliday');
        if (family.holiday === 'Other' && !family.holidayOther.trim())
            return problem('mitten-holiday-other', 'errorHolidayOther');

        for (const [i, child] of children.entries()) {
            const childField = (suffix) => `mitten-child-${i + 1}-${suffix}`;
            const n = { n: i + 1 };
            if (!child.gender)
                return problem(childField('gender'), 'errorChildGender', n);
            if (!String(child.age).trim())
                return problem(childField('age'), 'errorChildAge', n);
            const age = Number(child.age);
            if (!Number.isInteger(age) || age < 0 || age > 18)
                return problem(childField('age'), 'errorChildAgeRange', n);
            if (!child.clothingPreference.trim())
                return problem(childField('clothing'), 'errorChildClothing', n);
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const problem = validate();
        if (problem) {
            setError('');
            setInvalid(problem);
            // Scroll first, then focus without a second scroll, so the field
            // lands mid-screen instead of jammed under the sticky header.
            const el = document.getElementById(problem.field);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus({ preventScroll: true });
            return;
        }

        setInvalid(null);
        await submit({ ...family, children });
    };

    // Request failures carry the server's English message, which is the most
    // specific thing to show an English reader; anyone else gets it generically.
    const requestError = lang === 'en' ? error : t('submitFailed');

    // Same picker as the shopper application. `lang` and `dir` go on the whole
    // section so screen readers pronounce it right and Arabic reads RTL.
    const languagePicker = (
        <div className="form-language-row">
            <label className="form-label" htmlFor="mitten-language">{t('languageLabel')}</label>
            <select id="mitten-language" className="form-select form-language-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value} lang={l.value}>{l.label}</option>
                ))}
            </select>
        </div>
    );

    const sectionProps = { className: `mitten-section ${bgClass}`, lang, dir };
    const titleText = content('title', title);

    // ── Closed state ────────────────────────────────────────────────────────

    if (isClosed) {
        return (
            <section {...sectionProps}>
                <div className="container form-container">
                    {titleText && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{titleText}</TitleTag>}
                    {languagePicker}
                    <div className="mitten-closed markdown-content" {...inspectorProps({ fieldId: 'closedMessage' })}>
                        <ReactMarkdown>
                            {trimMarkdown(content('closedMessage', closedMessage)) || t('closedDefault')}
                        </ReactMarkdown>
                    </div>
                </div>
            </section>
        );
    }

    // ── Success state ───────────────────────────────────────────────────────

    if (isSubmitted) {
        return (
            <section {...sectionProps}>
                <div className="container form-container">
                    <SuccessCard
                        headline={content('successHeadline', successHeadline) || t('successDefault')}
                        body={content('successBody', successBody)}
                        inspectorProps={inspectorProps}
                    />
                </div>
            </section>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────

    const required = <span className="form-required">{t('required')}</span>;

    return (
        <section {...sectionProps}>
            <div className="container form-container">
                {titleText && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{titleText}</TitleTag>}

                {languagePicker}

                {introText && (
                    <div className="markdown-content form-intro" {...inspectorProps({ fieldId: 'introText' })}>
                        <ReactMarkdown>{trimMarkdown(content('introText', introText))}</ReactMarkdown>
                    </div>
                )}

                {eligibilityNote && (
                    <div className="form-callout markdown-content" {...inspectorProps({ fieldId: 'eligibilityNote' })}>
                        <ReactMarkdown>{trimMarkdown(content('eligibilityNote', eligibilityNote))}</ReactMarkdown>
                    </div>
                )}

                <form className="form mitten-form" onSubmit={handleSubmit} noValidate>
                    <HoneypotField {...honeypotProps} />

                    {/* Family details */}
                    <fieldset className="form-fieldset">
                        <legend className="form-legend">{t('familyInformation')}</legend>

                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-shopper-number">
                                    {t('shopperNumber')} {required}
                                </label>
                                <input id="mitten-shopper-number" type="text" className="form-input"
                                    {...invalidProps('mitten-shopper-number')}
                                    value={family.shopperNumber}
                                    onChange={e => setFamilyField('shopperNumber', e.target.value)} />
                                <FieldError id="mitten-shopper-number" />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-parent-name">
                                    {t('parentName')} {required}
                                </label>
                                <input id="mitten-parent-name" type="text" className="form-input"
                                    {...invalidProps('mitten-parent-name')}
                                    value={family.parentFirstName}
                                    onChange={e => setFamilyField('parentFirstName', e.target.value)} />
                                <FieldError id="mitten-parent-name" />
                            </div>

                            {/* Phone numbers are US-formatted digits, so they stay
                                left-to-right even when the page is not. */}
                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-phone">
                                    {t('phone')} {required}
                                </label>
                                <input id="mitten-phone" type="tel" className="form-input" dir="ltr"
                                    inputMode="tel" autoComplete="tel" placeholder="(508) 555-0101"
                                    value={family.phone}
                                    {...invalidProps('mitten-phone')}
                                    onChange={e => setFamilyField('phone', e.target.value)}
                                    onBlur={() => normalizePhoneField('phone')} />
                                <FieldError id="mitten-phone" />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-phone-2">
                                    {t('additionalPhone')}
                                </label>
                                <input id="mitten-phone-2" type="tel" className="form-input" dir="ltr"
                                    inputMode="tel" autoComplete="tel" placeholder="(508) 555-0199"
                                    value={family.additionalPhone}
                                    {...invalidProps('mitten-phone-2')}
                                    onChange={e => setFamilyField('additionalPhone', e.target.value)}
                                    onBlur={() => normalizePhoneField('additionalPhone')} />
                                <FieldError id="mitten-phone-2" />
                            </div>
                        </div>
                    </fieldset>

                    {/* Holiday */}
                    <fieldset className="form-fieldset" {...inspectorProps({ fieldId: 'holidayOptions' })}>
                        <legend className="form-legend">
                            {t('holidayLegend')} {required}
                        </legend>
                        <div className="form-choice-row">
                            {holidays.map((holiday, i) => (
                                <label key={holiday} className="form-choice">
                                    <input type="radio" name="mitten-holiday" className="form-radio"
                                        id={`mitten-holiday-${i}`}
                                        {...(i === 0 ? invalidProps('mitten-holiday-0') : {})}
                                        checked={family.holiday === holiday}
                                        onChange={() => setFamilyField('holiday', holiday)} />
                                    {option(holiday)}
                                </label>
                            ))}
                        </div>
                        <FieldError id="mitten-holiday-0" />
                        {family.holiday === 'Other' && (
                            <div className="form-field mitten-other-field">
                                <label className="form-label" htmlFor="mitten-holiday-other">
                                    {t('whichHoliday')} {required}
                                </label>
                                <input id="mitten-holiday-other" type="text" className="form-input"
                                    {...invalidProps('mitten-holiday-other')}
                                    value={family.holidayOther}
                                    onChange={e => setFamilyField('holidayOther', e.target.value)} />
                                <FieldError id="mitten-holiday-other" />
                            </div>
                        )}
                    </fieldset>

                    {/* Number of children — drives how many child blocks render */}
                    <div className="form-field mitten-count-field">
                        <label className="form-label" htmlFor="mitten-child-count">
                            {t('childCount')} {required}
                        </label>
                        <select id="mitten-child-count" className="form-select mitten-count-select"
                            value={children.length}
                            onChange={e => handleChildCountChange(Number(e.target.value))}>
                            {Array.from({ length: childLimit }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <p className="form-hint">{t('childCountHint')}</p>
                    </div>

                    {/* One block per child */}
                    {children.map((child, index) => {
                        const id = (suffix) => `mitten-child-${index + 1}-${suffix}`;
                        return (
                            <fieldset key={index} className="mitten-child-card">
                                <legend className="mitten-child-legend">
                                    <span className="mitten-child-number" aria-hidden="true">{index + 1}</span>
                                    {t('child', { n: index + 1 })}
                                </legend>

                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('gender')}>
                                            {t('gender')} {required}
                                        </label>
                                        <select id={id('gender')} className="form-select"
                                            {...invalidProps(id('gender'))}
                                            value={child.gender}
                                            onChange={e => setChildField(index, 'gender', e.target.value)}>
                                            <option value="">{t('select')}</option>
                                            {genders.map(gender => (
                                                <option key={gender} value={gender}>{option(gender)}</option>
                                            ))}
                                        </select>
                                        <FieldError id={id('gender')} />
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('age')}>
                                            {t('age')} {required}
                                        </label>
                                        <input id={id('age')} type="number" min="0" max="18" className="form-input"
                                            {...invalidProps(id('age'))}
                                            value={child.age}
                                            onChange={e => setChildField(index, 'age', e.target.value)} />
                                        <FieldError id={id('age')} />
                                    </div>
                                </div>

                                {/* Sizes — sizes are one or two characters, so they all fit on
                                    one row with the youth/adult choice beside them. */}
                                <fieldset className="form-subfieldset">
                                    <legend className="form-sublegend">
                                        {t('sizes')} <span className="form-legend-hint">{t('sizesHint')}</span>
                                    </legend>
                                    <div className="mitten-size-row">
                                        {SIZE_FIELDS.map(({ field, id: sizeId, label }) => (
                                            <div key={field} className="mitten-size-item">
                                                <label className="form-label" htmlFor={id(sizeId)}>{t(label)}</label>
                                                <input id={id(sizeId)} type="text" className="form-input mitten-size-input"
                                                    value={child[field]}
                                                    onChange={e => setChildField(index, field, e.target.value)} />
                                            </div>
                                        ))}
                                        <div className="mitten-size-item mitten-size-type">
                                            <label className="form-label" htmlFor={id('size-type')}>{t('youthAdult')}</label>
                                            <select id={id('size-type')} className="form-select"
                                                value={child.sizeType}
                                                onChange={e => setChildField(index, 'sizeType', e.target.value)}>
                                                <option value="">{t('select')}</option>
                                                {SIZE_TYPES.map(sizeType => (
                                                    <option key={sizeType} value={sizeType}>{option(sizeType)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="form-field">
                                    <label className="form-label" htmlFor={id('clothing')}>
                                        {t('clothing')} {required}
                                    </label>
                                    <input id={id('clothing')} type="text" className="form-input"
                                        {...invalidProps(id('clothing'))}
                                        placeholder={t('clothingPlaceholder')}
                                        value={child.clothingPreference}
                                        onChange={e => setChildField(index, 'clothingPreference', e.target.value)} />
                                    <FieldError id={id('clothing')} />
                                </div>

                                {/* Favourite colours — a child rarely has just one, and the
                                    shoppers can use any of them. */}
                                {colors.length > 0 && (
                                    <fieldset className="form-subfieldset" {...inspectorProps({ fieldId: 'colorOptions' })}>
                                        <legend className="form-sublegend">
                                            {t('favoriteColors')} <span className="form-legend-hint">{t('selectAll')}</span>
                                        </legend>
                                        {/* Colour names are single short words, so they pack more
                                            densely than the interest labels. */}
                                        <div className="form-checkbox-grid mitten-color-grid">
                                            {colors.map(color => (
                                                <label key={color} className="form-choice">
                                                    <input type="checkbox" className="form-checkbox"
                                                        checked={child.favoriteColors.includes(color)}
                                                        onChange={() => toggleChildValue(index, 'favoriteColors', color)} />
                                                    {option(color)}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}

                                {/* Interests */}
                                {interests.length > 0 && (
                                    <fieldset className="form-subfieldset" {...inspectorProps({ fieldId: 'interestOptions' })}>
                                        <legend className="form-sublegend">
                                            {t('interests')} <span className="form-legend-hint">{t('selectAll')}</span>
                                        </legend>
                                        <div className="form-checkbox-grid">
                                            {interests.map(interest => (
                                                <label key={interest} className="form-choice">
                                                    <input type="checkbox" className="form-checkbox"
                                                        checked={child.interests.includes(interest)}
                                                        onChange={() => toggleChildValue(index, 'interests', interest)} />
                                                    {option(interest)}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="form-field mitten-other-field">
                                            <label className="form-label" htmlFor={id('interests-other')}>
                                                {t('otherInterests')}
                                            </label>
                                            <input id={id('interests-other')} type="text" className="form-input"
                                                value={child.interestsOther}
                                                onChange={e => setChildField(index, 'interestsOther', e.target.value)} />
                                        </div>
                                    </fieldset>
                                )}

                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('character')}>
                                            {t('character')}
                                        </label>
                                        <input id={id('character')} type="text" className="form-input"
                                            placeholder={t('characterPlaceholder')}
                                            value={child.favoriteCharacter}
                                            onChange={e => setChildField(index, 'favoriteCharacter', e.target.value)} />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('sports')}>
                                            {t('sports')}
                                        </label>
                                        <input id={id('sports')} type="text" className="form-input"
                                            value={child.favoriteSportsTeam}
                                            onChange={e => setChildField(index, 'favoriteSportsTeam', e.target.value)} />
                                    </div>
                                </div>

                                {/* Specific gift ideas */}
                                <fieldset className="form-subfieldset">
                                    <legend className="form-sublegend">
                                        {t('wishes')}
                                        <span className="form-legend-hint"> {t('wishesHint', { n: WISHES_PER_CHILD })}</span>
                                    </legend>
                                    {/* Three near-identical labels would cost a row each, so the
                                        number lives in the placeholder and the accessible name. */}
                                    <div className="mitten-wish-list">
                                        {child.wishes.map((wish, wishIndex) => (
                                            <input key={wishIndex} id={id(`wish-${wishIndex + 1}`)}
                                                type="text" className="form-input"
                                                placeholder={t('wishPlaceholder', { n: wishIndex + 1 })}
                                                aria-label={t('wishLabel', { wish: wishIndex + 1, child: index + 1 })}
                                                value={wish}
                                                onChange={e => setWish(index, wishIndex, e.target.value)} />
                                        ))}
                                    </div>
                                </fieldset>
                            </fieldset>
                        );
                    })}

                    {pickupInformation && (
                        <div className="form-callout markdown-content" {...inspectorProps({ fieldId: 'pickupInformation' })}>
                            <ReactMarkdown>{trimMarkdown(content('pickupInformation', pickupInformation))}</ReactMarkdown>
                        </div>
                    )}

                    {/* Field problems are reported inline at the field itself, which
                        also takes focus — the summary is for everything else,
                        such as a failed request. */}
                    {error && !invalid && <p className="form-error" role="alert">{requestError}</p>}

                    <button type="submit" className="button primary-button form-submit" disabled={isLoading}>
                        {isLoading ? t('submitting') : t('submit')}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default OperationMittenSection;
