import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL;

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
}) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const inspectorProps = useContentfulInspectorMode({ entryId });
    const bgClass = backgroundStyle === 'Beige Background' ? 'bg-beige' : 'bg-default';

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

        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${FUNCTIONS_BASE_URL}/submitVolunteerApplication`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
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

    if (isSubmitted) {
        return (
            <section className={`volunteer-section ${bgClass}`}>
                <div className="container volunteer-container">
                    <div className="volunteer-success">
                        <div className="volunteer-success-icon" aria-hidden="true">✓</div>
                        <h2>{successHeadline || 'Thank you for applying!'}</h2>
                        {successBody && (
                            <div className="markdown-content">
                                <ReactMarkdown>{successBody}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={`volunteer-section ${bgClass}`}>
            <div className="container volunteer-container">
                {title && <h2 {...inspectorProps({ fieldId: 'title' })}>{title}</h2>}
                {introText && (
                    <div className="markdown-content volunteer-intro" {...inspectorProps({ fieldId: 'introText' })}>
                        <ReactMarkdown>{introText}</ReactMarkdown>
                    </div>
                )}

                <form className="volunteer-form" onSubmit={handleSubmit} noValidate>

                    {/* Name */}
                    <fieldset className="volunteer-fieldset">
                        <legend className="volunteer-legend">Name</legend>
                        <div className="volunteer-name-grid">
                            <div className="volunteer-field">
                                <label className="volunteer-label" htmlFor="vol-first-name">
                                    First Name <span className="volunteer-required">(required)</span>
                                </label>
                                <input id="vol-first-name" type="text" className="volunteer-input"
                                    value={form.firstName} onChange={e => setField('firstName', e.target.value)} />
                            </div>
                            <div className="volunteer-field">
                                <label className="volunteer-label" htmlFor="vol-last-name">
                                    Last Name <span className="volunteer-required">(required)</span>
                                </label>
                                <input id="vol-last-name" type="text" className="volunteer-input"
                                    value={form.lastName} onChange={e => setField('lastName', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>

                    {/* Email */}
                    <div className="volunteer-field">
                        <label className="volunteer-label" htmlFor="vol-email">
                            Email Address <span className="volunteer-required">(required)</span>
                        </label>
                        <input id="vol-email" type="email" className="volunteer-input"
                            value={form.email} onChange={e => setField('email', e.target.value)} />
                    </div>

                    {/* Phone */}
                    <div className="volunteer-field">
                        <label className="volunteer-label" htmlFor="vol-phone">
                            Phone <span className="volunteer-required">(required)</span>
                        </label>
                        <input id="vol-phone" type="tel" className="volunteer-input"
                            value={form.phone} onChange={e => setField('phone', e.target.value)} />
                    </div>

                    {/* Contact Times */}
                    <fieldset className="volunteer-fieldset">
                        <legend className="volunteer-legend">
                            When is a good time to reach you? <span className="volunteer-required">(required)</span>
                        </legend>
                        {CONTACT_TIMES.map(time => (
                            <label key={time} className="volunteer-checkbox-label">
                                <input
                                    type="checkbox"
                                    className="volunteer-checkbox"
                                    checked={form.contactTimes.includes(time)}
                                    onChange={() => toggleCheckbox('contactTimes', time)}
                                />
                                {time}
                            </label>
                        ))}
                    </fieldset>

                    {/* Volunteer Opportunities */}
                    {opportunities.length > 0 && (
                        <fieldset className="volunteer-fieldset" {...inspectorProps({ fieldId: 'volunteerOpportunities' })}>
                            <legend className="volunteer-legend">
                                Which volunteer opportunities are you interested in?
                            </legend>
                            {opportunities.map(label => (
                                <label key={label} className="volunteer-checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="volunteer-checkbox"
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
                        <fieldset className="volunteer-fieldset" {...inspectorProps({ fieldId: 'availabilityShifts' })}>
                            <legend className="volunteer-legend">What's your availability?</legend>
                            {availabilityHint && (
                                <p className="volunteer-field-hint" {...inspectorProps({ fieldId: 'availabilityHint' })}>
                                    {availabilityHint}
                                </p>
                            )}
                            {shifts.map(label => (
                                <label key={label} className="volunteer-checkbox-label">
                                    <input
                                        type="checkbox"
                                        className="volunteer-checkbox"
                                        checked={form.availability.includes(label)}
                                        onChange={() => toggleCheckbox('availability', label)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>
                    )}

                    {/* Languages */}
                    <div className="volunteer-field">
                        <label className="volunteer-label" htmlFor="vol-languages">Languages Spoken</label>
                        <input id="vol-languages" type="text" className="volunteer-input"
                            value={form.languages} onChange={e => setField('languages', e.target.value)} />
                    </div>

                    {/* Student */}
                    {studentOpts.length > 0 && (
                        <div className="volunteer-field" {...inspectorProps({ fieldId: 'studentOptions' })}>
                            <label className="volunteer-label" htmlFor="vol-student">
                                Are you currently a student?
                            </label>
                            <select id="vol-student" className="volunteer-select"
                                value={form.isStudent} onChange={e => setField('isStudent', e.target.value)}>
                                <option value="">Select an option</option>
                                {studentOpts.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && <p className="volunteer-error">{error}</p>}

                    <button
                        type="submit"
                        className="button primary-button volunteer-submit"
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
