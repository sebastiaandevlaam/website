import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { isValidUsPhone, formatUsPhone } from '@/utils/phone';
import { useFunctionSubmit } from '@/hooks/useFunctionSubmit';
import { backgroundClass, isWithinWindow } from '@/utils/contentful';
import { trimMarkdown } from '@/utils/markdown';
import HoneypotField from './form/HoneypotField';
import SuccessCard from './form/SuccessCard';

// Structural choices that describe how children's clothing is sized, not
// editorial ones — these stay in code like the volunteer form's contact times.
const SIZE_TYPES = ['Youth', 'Adult'];
// Field name, input id and label are listed explicitly rather than derived
// from one another — deriving them silently renamed the shoes input.
const SIZE_FIELDS = [
    { field: 'shirtSize', id: 'shirt', label: 'Shirt' },
    { field: 'pantsSize', id: 'pants', label: 'Pants' },
    { field: 'dressSize', id: 'dress', label: 'Dress' },
    { field: 'shoeSize', id: 'shoes', label: 'Shoes' },
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
    // Id of the field that failed validation — drives the inline message, the
    // red border and aria-invalid.
    const [invalidField, setInvalidField] = useState('');

    // The drive runs on a schedule; outside the window the form is replaced by
    // the closed message rather than accepting entries nobody will shop for.
    const isClosed = !isWithinWindow(openDate, closeDate);

    // Once the parent starts fixing things, clear the complaint.
    const clearError = () => { setError(''); setInvalidField(''); };

    // Spread onto an input to mark it as the field at fault.
    const invalidProps = (id) => (invalidField === id
        ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` }
        : {});

    // Inline message rendered directly beneath the offending field.
    const FieldError = ({ id }) => (invalidField === id
        ? <p className="form-field-error" id={`${id}-error`}>{error}</p>
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

    // Returns the first problem as { field, message }, where `field` is the id
    // of the input at fault. The form is long enough that a message alone reads
    // as "nothing happened" — we need to know where to send the user.
    const validate = () => {
        const problem = (field, message) => ({ field, message });

        if (!family.shopperNumber.trim())
            return problem('mitten-shopper-number', 'Please enter your Shopper number.');
        if (!family.parentFirstName.trim())
            return problem('mitten-parent-name', "Please enter the parent's or guardian's first name.");
        if (!family.phone.trim())
            return problem('mitten-phone', 'Please enter a phone number so we can reach you about pick-up.');
        if (!isValidUsPhone(family.phone))
            return problem('mitten-phone', 'Please enter a valid US phone number, for example (508) 555-0101.');
        if (family.additionalPhone.trim() && !isValidUsPhone(family.additionalPhone))
            return problem('mitten-phone-2', 'The additional phone number is not a valid US phone number.');
        if (!family.holiday)
            return problem('mitten-holiday-0', 'Please tell us which holiday these gifts are for.');
        if (family.holiday === 'Other' && !family.holidayOther.trim())
            return problem('mitten-holiday-other', 'Please tell us which holiday you celebrate.');

        for (const [i, child] of children.entries()) {
            const childField = (suffix) => `mitten-child-${i + 1}-${suffix}`;
            if (!child.gender)
                return problem(childField('gender'), `Please select a gender for child ${i + 1}.`);
            if (!String(child.age).trim())
                return problem(childField('age'), `Please enter an age for child ${i + 1}.`);
            const age = Number(child.age);
            if (!Number.isInteger(age) || age < 0 || age > 18)
                return problem(childField('age'), `Child ${i + 1} must be 18 years or younger to receive gifts.`);
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const problem = validate();
        if (problem) {
            setError(problem.message);
            setInvalidField(problem.field);
            // Scroll first, then focus without a second scroll, so the field
            // lands mid-screen instead of jammed under the sticky header.
            const el = document.getElementById(problem.field);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.focus({ preventScroll: true });
            return;
        }

        setInvalidField('');
        await submit({ ...family, children });
    };

    // ── Closed state ────────────────────────────────────────────────────────

    if (isClosed) {
        return (
            <section className={`mitten-section ${bgClass}`}>
                <div className="container form-container">
                    {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}
                    <div className="mitten-closed markdown-content" {...inspectorProps({ fieldId: 'closedMessage' })}>
                        <ReactMarkdown>
                            {trimMarkdown(closedMessage) || 'Sign-ups for Operation Mitten are closed right now. Please check back next season.'}
                        </ReactMarkdown>
                    </div>
                </div>
            </section>
        );
    }

    // ── Success state ───────────────────────────────────────────────────────

    if (isSubmitted) {
        return (
            <section className={`mitten-section ${bgClass}`}>
                <div className="container form-container">
                    <SuccessCard
                        headline={successHeadline || 'Thank you — your form has been received!'}
                        body={successBody}
                        inspectorProps={inspectorProps}
                    />
                </div>
            </section>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────

    return (
        <section className={`mitten-section ${bgClass}`}>
            <div className="container form-container">
                {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}

                {introText && (
                    <div className="markdown-content form-intro" {...inspectorProps({ fieldId: 'introText' })}>
                        <ReactMarkdown>{trimMarkdown(introText)}</ReactMarkdown>
                    </div>
                )}

                {eligibilityNote && (
                    <div className="form-callout markdown-content" {...inspectorProps({ fieldId: 'eligibilityNote' })}>
                        <ReactMarkdown>{trimMarkdown(eligibilityNote)}</ReactMarkdown>
                    </div>
                )}

                <form className="form mitten-form" onSubmit={handleSubmit} noValidate>
                    <HoneypotField {...honeypotProps} />

                    {/* Family details */}
                    <fieldset className="form-fieldset">
                        <legend className="form-legend">Family Information</legend>

                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-shopper-number">
                                    Shopper # <span className="form-required">(required)</span>
                                </label>
                                <input id="mitten-shopper-number" type="text" className="form-input"
                                    {...invalidProps('mitten-shopper-number')}
                                    value={family.shopperNumber}
                                    onChange={e => setFamilyField('shopperNumber', e.target.value)} />
                                <FieldError id="mitten-shopper-number" />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-parent-name">
                                    Parent&rsquo;s / Guardian&rsquo;s First Name <span className="form-required">(required)</span>
                                </label>
                                <input id="mitten-parent-name" type="text" className="form-input"
                                    {...invalidProps('mitten-parent-name')}
                                    value={family.parentFirstName}
                                    onChange={e => setFamilyField('parentFirstName', e.target.value)} />
                                <FieldError id="mitten-parent-name" />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-phone">
                                    Phone Number <span className="form-required">(required)</span>
                                </label>
                                <input id="mitten-phone" type="tel" className="form-input"
                                    inputMode="tel" autoComplete="tel" placeholder="(508) 555-0101"
                                    value={family.phone}
                                    {...invalidProps('mitten-phone')}
                                    onChange={e => setFamilyField('phone', e.target.value)}
                                    onBlur={() => normalizePhoneField('phone')} />
                                <FieldError id="mitten-phone" />
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="mitten-phone-2">
                                    Additional Phone Number
                                </label>
                                <input id="mitten-phone-2" type="tel" className="form-input"
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
                            Are these gifts for&hellip; <span className="form-required">(required)</span>
                        </legend>
                        <div className="form-choice-row">
                            {holidays.map((option, i) => (
                                <label key={option} className="form-choice">
                                    <input type="radio" name="mitten-holiday" className="form-radio"
                                        id={`mitten-holiday-${i}`}
                                        {...(i === 0 ? invalidProps('mitten-holiday-0') : {})}
                                        checked={family.holiday === option}
                                        onChange={() => setFamilyField('holiday', option)} />
                                    {option}
                                </label>
                            ))}
                        </div>
                        <FieldError id="mitten-holiday-0" />
                        {family.holiday === 'Other' && (
                            <div className="form-field mitten-other-field">
                                <label className="form-label" htmlFor="mitten-holiday-other">
                                    Which holiday? <span className="form-required">(required)</span>
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
                            Total number of children in family <span className="form-required">(required)</span>
                        </label>
                        <select id="mitten-child-count" className="form-select mitten-count-select"
                            value={children.length}
                            onChange={e => handleChildCountChange(Number(e.target.value))}>
                            {Array.from({ length: childLimit }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <p className="form-hint">
                            We&rsquo;ll ask for details about each child below. Change this number and the
                            list updates &mdash; anything you have already filled in is kept.
                        </p>
                    </div>

                    {/* One block per child */}
                    {children.map((child, index) => {
                        const id = (suffix) => `mitten-child-${index + 1}-${suffix}`;
                        return (
                            <fieldset key={index} className="mitten-child-card">
                                <legend className="mitten-child-legend">
                                    <span className="mitten-child-number" aria-hidden="true">{index + 1}</span>
                                    Child {index + 1}
                                </legend>

                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('gender')}>
                                            Gender <span className="form-required">(required)</span>
                                        </label>
                                        <select id={id('gender')} className="form-select"
                                            {...invalidProps(id('gender'))}
                                            value={child.gender}
                                            onChange={e => setChildField(index, 'gender', e.target.value)}>
                                            <option value="">Select</option>
                                            {genders.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                        <FieldError id={id('gender')} />
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('age')}>
                                            Age <span className="form-required">(required)</span>
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
                                        Sizes <span className="form-legend-hint">&mdash; as specific as you can, these buy clothes that fit</span>
                                    </legend>
                                    <div className="mitten-size-row">
                                        {SIZE_FIELDS.map(({ field, id: sizeId, label }) => (
                                            <div key={field} className="mitten-size-item">
                                                <label className="form-label" htmlFor={id(sizeId)}>{label}</label>
                                                <input id={id(sizeId)} type="text" className="form-input mitten-size-input"
                                                    value={child[field]}
                                                    onChange={e => setChildField(index, field, e.target.value)} />
                                            </div>
                                        ))}
                                        <div className="mitten-size-item mitten-size-type">
                                            <label className="form-label" htmlFor={id('size-type')}>Youth / adult</label>
                                            <select id={id('size-type')} className="form-select"
                                                value={child.sizeType}
                                                onChange={e => setChildField(index, 'sizeType', e.target.value)}>
                                                <option value="">Select</option>
                                                {SIZE_TYPES.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="form-field">
                                    <label className="form-label" htmlFor={id('clothing')}>
                                        Preferred article(s) of clothing
                                    </label>
                                    <input id={id('clothing')} type="text" className="form-input"
                                        placeholder="e.g. hoodies, leggings, warm socks"
                                        value={child.clothingPreference}
                                        onChange={e => setChildField(index, 'clothingPreference', e.target.value)} />
                                </div>

                                {/* Favourite colours — a child rarely has just one, and the
                                    shoppers can use any of them. */}
                                {colors.length > 0 && (
                                    <fieldset className="form-subfieldset" {...inspectorProps({ fieldId: 'colorOptions' })}>
                                        <legend className="form-sublegend">
                                            Favorite colors <span className="form-legend-hint">&mdash; select all that apply</span>
                                        </legend>
                                        {/* Colour names are single short words, so they pack more
                                            densely than the interest labels. */}
                                        <div className="form-checkbox-grid mitten-color-grid">
                                            {colors.map(option => (
                                                <label key={option} className="form-choice">
                                                    <input type="checkbox" className="form-checkbox"
                                                        checked={child.favoriteColors.includes(option)}
                                                        onChange={() => toggleChildValue(index, 'favoriteColors', option)} />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}

                                {/* Interests */}
                                {interests.length > 0 && (
                                    <fieldset className="form-subfieldset" {...inspectorProps({ fieldId: 'interestOptions' })}>
                                        <legend className="form-sublegend">
                                            Favorite activities or interests <span className="form-legend-hint">&mdash; select all that apply</span>
                                        </legend>
                                        <div className="form-checkbox-grid">
                                            {interests.map(option => (
                                                <label key={option} className="form-choice">
                                                    <input type="checkbox" className="form-checkbox"
                                                        checked={child.interests.includes(option)}
                                                        onChange={() => toggleChildValue(index, 'interests', option)} />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="form-field mitten-other-field">
                                            <label className="form-label" htmlFor={id('interests-other')}>
                                                Other interests
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
                                            Favorite character or person
                                        </label>
                                        <input id={id('character')} type="text" className="form-input"
                                            placeholder="e.g. Elsa, Spider-Man"
                                            value={child.favoriteCharacter}
                                            onChange={e => setChildField(index, 'favoriteCharacter', e.target.value)} />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label" htmlFor={id('sports')}>
                                            Favorite sports team or figure
                                        </label>
                                        <input id={id('sports')} type="text" className="form-input"
                                            value={child.favoriteSportsTeam}
                                            onChange={e => setChildField(index, 'favoriteSportsTeam', e.target.value)} />
                                    </div>
                                </div>

                                {/* Specific gift ideas */}
                                <fieldset className="form-subfieldset">
                                    <legend className="form-sublegend">
                                        Specific books, games, toys or gift cards this child would like
                                        <span className="form-legend-hint"> &mdash; up to {WISHES_PER_CHILD}</span>
                                    </legend>
                                    {/* Three near-identical labels would cost a row each, so the
                                        number lives in the placeholder and the accessible name. */}
                                    <div className="mitten-wish-list">
                                        {child.wishes.map((wish, wishIndex) => (
                                            <input key={wishIndex} id={id(`wish-${wishIndex + 1}`)}
                                                type="text" className="form-input"
                                                placeholder={`Item ${wishIndex + 1}`}
                                                aria-label={`Gift idea ${wishIndex + 1} for child ${index + 1}`}
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
                            <ReactMarkdown>{trimMarkdown(pickupInformation)}</ReactMarkdown>
                        </div>
                    )}

                    {/* Field problems are reported inline at the field itself, which
                        also takes focus — the summary is for everything else,
                        such as a failed request. */}
                    {error && !invalidField && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" className="button primary-button form-submit" disabled={isLoading}>
                        {isLoading ? 'Submitting…' : 'Submit Form'}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default OperationMittenSection;
