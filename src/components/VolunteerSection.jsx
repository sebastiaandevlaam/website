import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { useFunctionSubmit } from '@/hooks/useFunctionSubmit';
import { backgroundClass } from '@/utils/contentful';
import { trimMarkdown } from '@/utils/markdown';
import HoneypotField from './form/HoneypotField';
import SuccessCard from './form/SuccessCard';

const CONTACT_TIMES = ['Morning', 'Afternoon', 'Evening'];

const EMPTY_FORM = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    contactTimes: [],
    opportunities: [],
    availability: [],
    languages: '',
    isStudent: '',
};

const VolunteerSection = ({
    title,
    introText,
    volunteerOpportunities,
    availabilityShifts,
    availabilityHint,
    studentOptions,
    successHeadline,
    successBody,
    backgroundStyle,
    entryId,
    titleTag,
}) => {
    const TitleTag = titleTag || 'h2';
    const [form, setForm] = useState(EMPTY_FORM);
    const { submit, isLoading, isSubmitted, error, setError, honeypotProps } =
        useFunctionSubmit('submitVolunteerApplication');

    const inspectorProps = useContentfulInspectorMode({ entryId });
    const bgClass = backgroundClass(backgroundStyle);

    const opportunities = volunteerOpportunities?.map(o => o.fields?.label).filter(Boolean) || [];
    const shifts = availabilityShifts?.map(s => s.fields?.label).filter(Boolean) || [];
    const studentOpts = studentOptions || [];

    const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleCheckbox = (field, value) =>
        setForm(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(v => v !== value)
                : [...prev[field], value],
        }));

    const validate = () => {
        if (!form.firstName.trim()) return 'First name is required.';
        if (!form.lastName.trim()) return 'Last name is required.';
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            return 'A valid email address is required.';
        if (!form.phone.trim()) return 'Phone number is required.';
        if (form.contactTimes.length === 0)
            return 'Please select at least one contact time.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        await submit(form);
    };

    if (isSubmitted) {
        return (
            <section className={`volunteer-section ${bgClass}`}>
                <div className="container form-container">
                    <SuccessCard
                        headline={successHeadline || 'Thank you for applying!'}
                        body={successBody}
                    />
                </div>
            </section>
        );
    }

    return (
        <section className={`volunteer-section ${bgClass}`}>
            <div className="container form-container">
                {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}
                {introText && (
                    <div className="markdown-content form-intro" {...inspectorProps({ fieldId: 'introText' })}>
                        <ReactMarkdown>{trimMarkdown(introText)}</ReactMarkdown>
                    </div>
                )}

                <form className="form" onSubmit={handleSubmit} noValidate>
                    <HoneypotField {...honeypotProps} />

                    {/* Name */}
                    <fieldset className="form-fieldset">
                        <legend className="form-sublegend">Name</legend>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label" htmlFor="vol-first-name">
                                    First Name <span className="form-required">(required)</span>
                                </label>
                                <input id="vol-first-name" type="text" className="form-input"
                                    autoComplete="given-name"
                                    value={form.firstName} onChange={e => setField('firstName', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="vol-last-name">
                                    Last Name <span className="form-required">(required)</span>
                                </label>
                                <input id="vol-last-name" type="text" className="form-input"
                                    autoComplete="family-name"
                                    value={form.lastName} onChange={e => setField('lastName', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>

                    {/* Email */}
                    <div className="form-field">
                        <label className="form-label" htmlFor="vol-email">
                            Email Address <span className="form-required">(required)</span>
                        </label>
                        <input id="vol-email" type="email" className="form-input" autoComplete="email"
                            value={form.email} onChange={e => setField('email', e.target.value)} />
                    </div>

                    {/* Phone */}
                    <div className="form-field">
                        <label className="form-label" htmlFor="vol-phone">
                            Phone <span className="form-required">(required)</span>
                        </label>
                        <input id="vol-phone" type="tel" className="form-input" autoComplete="tel"
                            value={form.phone} onChange={e => setField('phone', e.target.value)} />
                    </div>

                    {/* Contact Times */}
                    <fieldset className="form-fieldset">
                        <legend className="form-sublegend">
                            When is a good time to reach you? <span className="form-required">(required)</span>
                        </legend>
                        {CONTACT_TIMES.map(time => (
                            <label key={time} className="form-choice">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={form.contactTimes.includes(time)}
                                    onChange={() => toggleCheckbox('contactTimes', time)}
                                />
                                {time}
                            </label>
                        ))}
                    </fieldset>

                    {/* Volunteer Opportunities */}
                    {opportunities.length > 0 && (
                        <fieldset className="form-fieldset" {...inspectorProps({ fieldId: 'volunteerOpportunities' })}>
                            <legend className="form-sublegend">
                                Which volunteer opportunities are you interested in?
                            </legend>
                            {opportunities.map(label => (
                                <label key={label} className="form-choice">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={form.opportunities.includes(label)}
                                        onChange={() => toggleCheckbox('opportunities', label)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                    )}

                    {/* Availability */}
                    {shifts.length > 0 && (
                        <fieldset className="form-fieldset" {...inspectorProps({ fieldId: 'availabilityShifts' })}>
                            <legend className="form-sublegend">What's your availability?</legend>
                            {availabilityHint && (
                                <p className="form-hint" {...inspectorProps({ fieldId: 'availabilityHint' })}>
                                    {availabilityHint}
                                </p>
                            )}
                            {shifts.map(label => (
                                <label key={label} className="form-choice">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={form.availability.includes(label)}
                                        onChange={() => toggleCheckbox('availability', label)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                    )}

                    {/* Languages */}
                    <div className="form-field">
                        <label className="form-label" htmlFor="vol-languages">Languages Spoken</label>
                        <input id="vol-languages" type="text" className="form-input"
                            value={form.languages} onChange={e => setField('languages', e.target.value)} />
                    </div>

                    {/* Student */}
                    {studentOpts.length > 0 && (
                        <div className="form-field" {...inspectorProps({ fieldId: 'studentOptions' })}>
                            <label className="form-label" htmlFor="vol-student">
                                Are you currently a student?
                            </label>
                            <select id="vol-student" className="form-select"
                                value={form.isStudent} onChange={e => setField('isStudent', e.target.value)}>
                                <option value="">Select an option</option>
                                {studentOpts.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button
                        type="submit"
                        className="button primary-button form-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Submitting…' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default VolunteerSection;
