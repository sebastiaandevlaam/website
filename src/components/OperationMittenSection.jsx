import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL;

// Structural choices that describe how children's clothing is sized, not
// editorial ones — these stay in code like the volunteer form's contact times.
const SIZE_TYPES = ['Youth', 'Adult'];
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
    favoriteColor: '',
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
    const bgClass = backgroundStyle === 'Beige Background' ? 'bg-beige' : 'bg-default';

    const childLimit = Math.min(maxChildren || DEFAULT_MAX_CHILDREN, 12);
    const genders = genderOptions?.length ? genderOptions : DEFAULT_GENDER_OPTIONS;
    const holidays = holidayOptions?.length ? holidayOptions : DEFAULT_HOLIDAY_OPTIONS;
    const colors = colorOptions || [];
    const interests = interestOptions || [];

    const [family, setFamily] = useState(EMPTY_FAMILY);
    const [children, setChildren] = useState(() => resizeChildren([], 1));
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // The drive runs on a schedule; outside the window the form is replaced by
    // the closed message rather than accepting entries nobody will shop for.
    const now = new Date();
    const notYetOpen = openDate && now < new Date(openDate);
    const alreadyClosed = closeDate && now > new Date(closeDate);
    const isClosed = notYetOpen || alreadyClosed;

    const setFamilyField = (field, value) => {
        setFamily(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const setChildField = (index, field, value) => {
        setChildren(prev => prev.map((child, i) => (i === index ? { ...child, [field]: value } : child)));
        setError('');
    };

    const setWish = (index, wishIndex, value) => {
        setChildren(prev => prev.map((child, i) => (
            i === index
                ? { ...child, wishes: child.wishes.map((w, j) => (j === wishIndex ? value : w)) }
                : child
        )));
    };

    const toggleInterest = (index, value) => {
        setChildren(prev => prev.map((child, i) => (
            i === index
                ? {
                    ...child,
                    interests: child.interests.includes(value)
                        ? child.interests.filter(v => v !== value)
                        : [...child.interests, value],
                }
                : child
        )));
    };

    const handleChildCountChange = (count) => {
        setChildren(prev => resizeChildren(prev, count));
        setError('');
    };

    const validate = () => {
        if (!family.shopperNumber.trim()) return 'Please enter your Shopper number.';
        if (!family.parentFirstName.trim()) return "Please enter the parent's or guardian's first name.";
        if (!family.phone.trim()) return 'Please enter a phone number so we can reach you about pick-up.';
        if (!family.holiday) return 'Please tell us which holiday these gifts are for.';
        if (family.holiday === 'Other' && !family.holidayOther.trim())
            return 'Please tell us which holiday you celebrate.';

        for (const [i, child] of children.entries()) {
            if (!child.gender) return `Please select a gender for child ${i + 1}.`;
            if (!String(child.age).trim()) return `Please enter an age for child ${i + 1}.`;
            const age = Number(child.age);
            if (!Number.isInteger(age) || age < 0 || age > 18)
                return `Child ${i + 1} must be 18 years or younger to receive gifts.`;
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${FUNCTIONS_BASE_URL}/submitOperationMitten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...family, children }),
            });
            const data = await response.json();
            if (response.ok) {
                setIsSubmitted(true);
            } else {
                setError(data.error || 'Something went wrong. Please try again.');
            }
        } catch {
            setError('Unable to submit the form. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Closed state ────────────────────────────────────────────────────────

    if (isClosed) {
        return (
            <section className={`mitten-section ${bgClass}`}>
                <div className="container mitten-container">
                    {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}
                    <div className="mitten-closed markdown-content" {...inspectorProps({ fieldId: 'closedMessage' })}>
                        <ReactMarkdown>
                            {closedMessage || 'Sign-ups for Operation Mitten are closed right now. Please check back next season.'}
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
                <div className="container mitten-container">
                    <div className="mitten-success">
                        <div className="mitten-success-icon" aria-hidden="true">✓</div>
                        <h2 {...inspectorProps({ fieldId: 'successHeadline' })}>
                            {successHeadline || 'Thank you — your form has been received!'}
                        </h2>
                        {successBody && (
                            <div className="markdown-content" {...inspectorProps({ fieldId: 'successBody' })}>
                                <ReactMarkdown>{successBody}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────

    return (
        <section className={`mitten-section ${bgClass}`}>
            <div className="container mitten-container">
                {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}

                {introText && (
                    <div className="markdown-content mitten-intro" {...inspectorProps({ fieldId: 'introText' })}>
                        <ReactMarkdown>{introText}</ReactMarkdown>
                    </div>
                )}

                {eligibilityNote && (
                    <div className="mitten-callout markdown-content" {...inspectorProps({ fieldId: 'eligibilityNote' })}>
                        <ReactMarkdown>{eligibilityNote}</ReactMarkdown>
                    </div>
                )}

                <form className="mitten-form" onSubmit={handleSubmit} noValidate>

                    {/* Family details */}
                    <fieldset className="mitten-fieldset">
                        <legend className="mitten-legend">Family Information</legend>

                        <div className="mitten-grid">
                            <div className="mitten-field">
                                <label className="mitten-label" htmlFor="mitten-shopper-number">
                                    Shopper # <span className="mitten-required">(required)</span>
                                </label>
                                <input id="mitten-shopper-number" type="text" className="mitten-input"
                                    value={family.shopperNumber}
                                    onChange={e => setFamilyField('shopperNumber', e.target.value)} />
                            </div>

                            <div className="mitten-field">
                                <label className="mitten-label" htmlFor="mitten-parent-name">
                                    Parent&rsquo;s / Guardian&rsquo;s First Name <span className="mitten-required">(required)</span>
                                </label>
                                <input id="mitten-parent-name" type="text" className="mitten-input"
                                    value={family.parentFirstName}
                                    onChange={e => setFamilyField('parentFirstName', e.target.value)} />
                            </div>

                            <div className="mitten-field">
                                <label className="mitten-label" htmlFor="mitten-phone">
                                    Phone Number <span className="mitten-required">(required)</span>
                                </label>
                                <input id="mitten-phone" type="tel" className="mitten-input"
                                    value={family.phone}
                                    onChange={e => setFamilyField('phone', e.target.value)} />
                            </div>

                            <div className="mitten-field">
                                <label className="mitten-label" htmlFor="mitten-phone-2">
                                    Additional Phone Number
                                </label>
                                <input id="mitten-phone-2" type="tel" className="mitten-input"
                                    value={family.additionalPhone}
                                    onChange={e => setFamilyField('additionalPhone', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>

                    {/* Holiday */}
                    <fieldset className="mitten-fieldset" {...inspectorProps({ fieldId: 'holidayOptions' })}>
                        <legend className="mitten-legend">
                            Are these gifts for&hellip; <span className="mitten-required">(required)</span>
                        </legend>
                        <div className="mitten-choice-row">
                            {holidays.map(option => (
                                <label key={option} className="mitten-choice">
                                    <input type="radio" name="mitten-holiday" className="mitten-radio"
                                        checked={family.holiday === option}
                                        onChange={() => setFamilyField('holiday', option)} />
                                    {option}
                                </label>
                            ))}
                        </div>
                        {family.holiday === 'Other' && (
                            <div className="mitten-field mitten-other-field">
                                <label className="mitten-label" htmlFor="mitten-holiday-other">
                                    Which holiday? <span className="mitten-required">(required)</span>
                                </label>
                                <input id="mitten-holiday-other" type="text" className="mitten-input"
                                    value={family.holidayOther}
                                    onChange={e => setFamilyField('holidayOther', e.target.value)} />
                            </div>
                        )}
                    </fieldset>

                    {/* Number of children — drives how many child blocks render */}
                    <div className="mitten-field mitten-count-field">
                        <label className="mitten-label" htmlFor="mitten-child-count">
                            Number of children in family <span className="mitten-required">(required)</span>
                        </label>
                        <select id="mitten-child-count" className="mitten-select mitten-count-select"
                            value={children.length}
                            onChange={e => handleChildCountChange(Number(e.target.value))}>
                            {Array.from({ length: childLimit }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <p className="mitten-hint">
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

                                <div className="mitten-grid">
                                    <div className="mitten-field">
                                        <label className="mitten-label" htmlFor={id('gender')}>
                                            Gender <span className="mitten-required">(required)</span>
                                        </label>
                                        <select id={id('gender')} className="mitten-select"
                                            value={child.gender}
                                            onChange={e => setChildField(index, 'gender', e.target.value)}>
                                            <option value="">Select</option>
                                            {genders.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mitten-field">
                                        <label className="mitten-label" htmlFor={id('age')}>
                                            Age <span className="mitten-required">(required)</span>
                                        </label>
                                        <input id={id('age')} type="number" min="0" max="18" className="mitten-input"
                                            value={child.age}
                                            onChange={e => setChildField(index, 'age', e.target.value)} />
                                    </div>
                                </div>

                                {/* Sizes */}
                                <fieldset className="mitten-subfieldset">
                                    <legend className="mitten-sublegend">Sizes</legend>
                                    <p className="mitten-hint">
                                        Please be as specific as you can &mdash; these are used to buy clothing that fits.
                                    </p>
                                    <div className="mitten-size-grid">
                                        <div className="mitten-field">
                                            <label className="mitten-label" htmlFor={id('shirt')}>Shirt</label>
                                            <input id={id('shirt')} type="text" className="mitten-input"
                                                value={child.shirtSize}
                                                onChange={e => setChildField(index, 'shirtSize', e.target.value)} />
                                        </div>
                                        <div className="mitten-field">
                                            <label className="mitten-label" htmlFor={id('pants')}>Pants</label>
                                            <input id={id('pants')} type="text" className="mitten-input"
                                                value={child.pantsSize}
                                                onChange={e => setChildField(index, 'pantsSize', e.target.value)} />
                                        </div>
                                        <div className="mitten-field">
                                            <label className="mitten-label" htmlFor={id('dress')}>Dress</label>
                                            <input id={id('dress')} type="text" className="mitten-input"
                                                value={child.dressSize}
                                                onChange={e => setChildField(index, 'dressSize', e.target.value)} />
                                        </div>
                                        <div className="mitten-field">
                                            <label className="mitten-label" htmlFor={id('shoes')}>Shoes</label>
                                            <input id={id('shoes')} type="text" className="mitten-input"
                                                value={child.shoeSize}
                                                onChange={e => setChildField(index, 'shoeSize', e.target.value)} />
                                        </div>
                                        <div className="mitten-field">
                                            <label className="mitten-label" htmlFor={id('size-type')}>Youth or adult sizes</label>
                                            <select id={id('size-type')} className="mitten-select"
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

                                <div className="mitten-field">
                                    <label className="mitten-label" htmlFor={id('clothing')}>
                                        Preferred article(s) of clothing
                                    </label>
                                    <input id={id('clothing')} type="text" className="mitten-input"
                                        placeholder="e.g. hoodies, leggings, warm socks"
                                        value={child.clothingPreference}
                                        onChange={e => setChildField(index, 'clothingPreference', e.target.value)} />
                                </div>

                                {/* Favourite colour */}
                                {colors.length > 0 && (
                                    <div className="mitten-field" {...inspectorProps({ fieldId: 'colorOptions' })}>
                                        <label className="mitten-label" htmlFor={id('color')}>Favorite color</label>
                                        <select id={id('color')} className="mitten-select"
                                            value={child.favoriteColor}
                                            onChange={e => setChildField(index, 'favoriteColor', e.target.value)}>
                                            <option value="">Select</option>
                                            {colors.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Interests */}
                                {interests.length > 0 && (
                                    <fieldset className="mitten-subfieldset" {...inspectorProps({ fieldId: 'interestOptions' })}>
                                        <legend className="mitten-sublegend">Favorite activities or interests</legend>
                                        <p className="mitten-hint">Select all that apply.</p>
                                        <div className="mitten-checkbox-grid">
                                            {interests.map(option => (
                                                <label key={option} className="mitten-choice">
                                                    <input type="checkbox" className="mitten-checkbox"
                                                        checked={child.interests.includes(option)}
                                                        onChange={() => toggleInterest(index, option)} />
                                                    {option}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mitten-field mitten-other-field">
                                            <label className="mitten-label" htmlFor={id('interests-other')}>
                                                Other interests
                                            </label>
                                            <input id={id('interests-other')} type="text" className="mitten-input"
                                                value={child.interestsOther}
                                                onChange={e => setChildField(index, 'interestsOther', e.target.value)} />
                                        </div>
                                    </fieldset>
                                )}

                                <div className="mitten-grid">
                                    <div className="mitten-field">
                                        <label className="mitten-label" htmlFor={id('character')}>
                                            Favorite character or person
                                        </label>
                                        <input id={id('character')} type="text" className="mitten-input"
                                            placeholder="e.g. Elsa, Spider-Man"
                                            value={child.favoriteCharacter}
                                            onChange={e => setChildField(index, 'favoriteCharacter', e.target.value)} />
                                    </div>
                                    <div className="mitten-field">
                                        <label className="mitten-label" htmlFor={id('sports')}>
                                            Favorite sports team or figure
                                        </label>
                                        <input id={id('sports')} type="text" className="mitten-input"
                                            value={child.favoriteSportsTeam}
                                            onChange={e => setChildField(index, 'favoriteSportsTeam', e.target.value)} />
                                    </div>
                                </div>

                                {/* Specific gift ideas */}
                                <fieldset className="mitten-subfieldset">
                                    <legend className="mitten-sublegend">
                                        Specific books, games, toys or gift cards this child would like
                                    </legend>
                                    <p className="mitten-hint">Up to {WISHES_PER_CHILD} items.</p>
                                    {child.wishes.map((wish, wishIndex) => (
                                        <div key={wishIndex} className="mitten-field">
                                            <label className="mitten-label" htmlFor={id(`wish-${wishIndex + 1}`)}>
                                                Item {wishIndex + 1}
                                            </label>
                                            <input id={id(`wish-${wishIndex + 1}`)} type="text" className="mitten-input"
                                                value={wish}
                                                onChange={e => setWish(index, wishIndex, e.target.value)} />
                                        </div>
                                    ))}
                                </fieldset>
                            </fieldset>
                        );
                    })}

                    {pickupInformation && (
                        <div className="mitten-callout markdown-content" {...inspectorProps({ fieldId: 'pickupInformation' })}>
                            <ReactMarkdown>{pickupInformation}</ReactMarkdown>
                        </div>
                    )}

                    {error && <p className="mitten-error" role="alert">{error}</p>}

                    <button type="submit" className="button primary-button mitten-submit" disabled={isLoading}>
                        {isLoading ? 'Submitting…' : 'Submit Form'}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default OperationMittenSection;
