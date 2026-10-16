import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useContentfulInspectorMode } from '@contentful/live-preview/react';
import { useFunctionSubmit } from '@/hooks/useFunctionSubmit';
import { backgroundClass, isWithinWindow, sectionId } from '@/utils/contentful';
import { trimMarkdown } from '@/utils/markdown';
import { isValidUsPhone, formatUsPhone } from '@/utils/phone';
import { campaignItems, processingFeeCents, formatMoney, fetchAvailability, fetchOrder, cancelCheckout } from '@/utils/campaign';
import HoneypotField from './form/HoneypotField';
import SuccessCard from './form/SuccessCard';

// A paid campaign — the Duck Drop, event tickets — sold from a Contentful
// `campaign` entry referenced by this section. The buyer picks quantities and
// enters their details here, pays on Stripe Checkout, and comes back to the
// same page with ?order=success&session_id=…, where the thank-you view picks
// up the paid order (and, for the Duck Drop, its numbers).
//
// Prices shown here are for display only: the server re-prices every order
// from Contentful.

const EMPTY_BUYER = { firstName: '', lastName: '', email: '', phone: '' };

// Shown when a number is low enough to be worth knowing about.
const LOW_STOCK = 20;

// The webhook usually lands within a second or two of the redirect; this
// gives it about 15 seconds before falling back to "check your email".
const ORDER_POLL_MS = 1500;
const ORDER_POLL_TRIES = 10;

const Markdown = ({ children, ...props }) => (
    <div className="markdown-content" {...props}>
        <ReactMarkdown>{trimMarkdown(children)}</ReactMarkdown>
    </div>
);

const CampaignSuccess = ({ sessionId, campaign, inspectorProps }) => {
    const [order, setOrder] = useState(null);
    const [gaveUp, setGaveUp] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let tries = 0;
        let timer;
        const poll = async () => {
            tries += 1;
            const { ok, data } = await fetchOrder(sessionId).catch(() => ({ ok: false, data: {} }));
            if (cancelled) return;
            if (ok && data.status === 'paid') { setOrder(data); return; }
            if (tries >= ORDER_POLL_TRIES) { setGaveUp(true); return; }
            timer = setTimeout(poll, ORDER_POLL_MS);
        };
        poll();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [sessionId]);

    const numbers = order?.numbers || [];

    return (
        <SuccessCard
            headline={campaign.successHeadline || 'Thank you for your order!'}
            body={campaign.successBody}
            inspectorProps={inspectorProps}
            className="campaign-success"
        >
            {/* The payment is already complete here; what takes a few seconds
                is Stripe's confirmation reaching us. Say so plainly, so people
                wait for their numbers instead of assuming something stalled. */}
            {!order && !gaveUp && (
                <div className="campaign-waiting" role="status">
                    <span className="campaign-spinner" aria-hidden="true" />
                    <div>
                        <p className="campaign-waiting-title">Your payment went through.</p>
                        <p>
                            {/^number/i.test(campaign.campaignType || '')
                                ? 'We\'re assigning your numbers now. This usually takes a few seconds, so please keep this page open.'
                                : 'We\'re confirming your order now. This usually takes a few seconds, so please keep this page open.'}
                        </p>
                    </div>
                </div>
            )}
            {order && (
                <div className="campaign-confirmation" role="status">
                    {numbers.length > 0 && (
                        <>
                            <p className="campaign-numbers-label">
                                {numbers.length === 1 ? 'Your number' : 'Your numbers'}
                            </p>
                            <ul className="campaign-numbers">
                                {numbers.map(n => <li key={n}>{n}</li>)}
                            </ul>
                        </>
                    )}
                    <p>
                        Order <strong>{order.orderId}</strong>
                        {' · '}
                        {order.lines.map(l => `${l.quantity} × ${l.name}`).join(', ')}
                        {' · '}
                        {formatMoney(order.totalCents)}
                    </p>
                    <p>A confirmation has been emailed to <strong>{order.email}</strong>.</p>
                </div>
            )}
            {gaveUp && (
                <p role="status">
                    Your payment went through. Your confirmation email, with your order details,
                    will arrive shortly.
                </p>
            )}
        </SuccessCard>
    );
};

const CampaignSection = ({
    title,
    introText,
    campaign: campaignEntry,
    backgroundStyle,
    entryId,
    titleTag,
}) => {
    const TitleTag = titleTag || 'h2';
    const inspectorProps = useContentfulInspectorMode({ entryId });
    const campaignInspectorProps = useContentfulInspectorMode({ entryId: campaignEntry?.sys?.id });
    const bgClass = backgroundClass(backgroundStyle);

    const campaign = campaignEntry?.fields || {};
    const campaignId = campaign.campaignId;
    const items = campaignItems(campaign);
    const coverFeesEnabled = campaign.coverFeesEnabled !== false;
    const isTickets = !/^number/i.test(campaign.campaignType || '');

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('order') === 'success' ? params.get('session_id') : null;
    const cancelledOrderId = params.get('order') === 'cancelled' ? params.get('ref') : null;

    const [quantities, setQuantities] = useState({});
    const [buyer, setBuyer] = useState(EMPTY_BUYER);
    const [coverFees, setCoverFees] = useState(true);
    const [stock, setStock] = useState(null);
    const [redirecting, setRedirecting] = useState(false);

    const { submit, isLoading, error, setError, honeypotProps } = useFunctionSubmit('createCampaignCheckout');

    const loadStock = useCallback(async () => {
        if (!campaignId) return;
        const { ok, data } = await fetchAvailability(campaignId).catch(() => ({ ok: false }));
        // Without it the form still works; the server has the final say.
        if (ok) setStock(data);
    }, [campaignId]);

    // Back from Stripe without paying: give the held stock back now rather
    // than when the session times out, then show fresh numbers.
    useEffect(() => {
        if (sessionId) return;
        if (!cancelledOrderId) { loadStock(); return; }
        cancelCheckout(cancelledOrderId).finally(loadStock);
        window.history.replaceState(null, '', window.location.pathname);
    }, [loadStock, sessionId, cancelledOrderId]);

    const remainingFor = (item) => stock?.items?.[item.id] ?? null;
    const maxFor = (item) => {
        const limits = [item.maxPerOrder, remainingFor(item), 500].filter(n => n !== null);
        return Math.min(...limits);
    };

    const setQuantity = (item, value) => {
        const n = Math.max(0, Math.min(maxFor(item), Math.floor(Number(value) || 0)));
        setQuantities(prev => ({ ...prev, [item.id]: n }));
    };

    const lines = items.filter(item => quantities[item.id] > 0);
    const itemCount = lines.reduce((sum, item) => sum + quantities[item.id], 0);
    const subtotalCents = lines.reduce((sum, item) => sum + quantities[item.id] * item.priceCents, 0);
    const feeCents = coverFeesEnabled && coverFees ? processingFeeCents(subtotalCents) : 0;
    const totalCents = subtotalCents + feeCents;

    const isOpen = isWithinWindow(campaign.openDate, campaign.closeDate);
    const soldOut = stock && items.length > 0 && items.every(item => remainingFor(item) === 0);

    const setField = (field, value) => setBuyer(prev => ({ ...prev, [field]: value }));

    const validate = () => {
        if (itemCount === 0) return 'Please choose at least one item.';
        if (campaign.maxPerOrder && itemCount > campaign.maxPerOrder)
            return `You can buy up to ${campaign.maxPerOrder} per order.`;
        if (!buyer.firstName.trim() || !buyer.lastName.trim()) return 'Please enter your first and last name.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim())) return 'Please enter a valid email address.';
        if (!isValidUsPhone(buyer.phone)) return 'Please enter a valid US phone number, e.g. (508) 555-0101.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        const { ok, data } = await submit({
            campaignId,
            quantities: Object.fromEntries(lines.map(item => [item.id, quantities[item.id]])),
            coverFees: coverFeesEnabled && coverFees,
            returnUrl: window.location.origin + window.location.pathname,
            ...buyer,
        });

        if (ok && data.url) {
            setRedirecting(true);
            window.location.assign(data.url);
        } else if (ok) {
            setError('Something went wrong. Please try again.');
        } else {
            // A sold-out reply means our numbers are stale.
            loadStock();
        }
    };

    const id = sectionId(null, title, 'campaign');

    const heading = (
        <>
            {title && <TitleTag className="section-title" {...inspectorProps({ fieldId: 'title' })}>{title}</TitleTag>}
            {introText && (
                <Markdown className="markdown-content form-intro" {...inspectorProps({ fieldId: 'introText' })}>
                    {introText}
                </Markdown>
            )}
        </>
    );

    let content;
    if (!campaignId || items.length === 0) {
        if (import.meta.env.DEV) console.warn('CampaignSection: campaign has no campaignId or no priced items.');
        content = heading;
    } else if (sessionId) {
        content = <CampaignSuccess sessionId={sessionId} campaign={campaign} inspectorProps={campaignInspectorProps} />;
    } else if (!isOpen || soldOut) {
        const message = soldOut
            ? campaign.soldOutMessage || 'Sorry, this is sold out. Thank you for your support!'
            : campaign.closedMessage || 'Sales are currently closed.';
        content = (
            <>
                {heading}
                <div className="form-callout" {...campaignInspectorProps({ fieldId: soldOut ? 'soldOutMessage' : 'closedMessage' })}>
                    <Markdown>{message}</Markdown>
                </div>
            </>
        );
    } else {
        content = (
            <>
                {heading}
                <form className="form campaign-form" onSubmit={handleSubmit} noValidate>
                    <HoneypotField {...honeypotProps} />

                    <fieldset className="form-fieldset" {...campaignInspectorProps({ fieldId: 'items' })}>
                        <legend className="form-legend">{isTickets ? 'Choose your tickets' : 'How many would you like?'}</legend>
                        <ul className="campaign-items">
                            {items.map(item => {
                                const remaining = remainingFor(item);
                                const qty = quantities[item.id] || 0;
                                const max = maxFor(item);
                                const inputId = `campaign-qty-${item.id}`;
                                return (
                                    <li key={item.id} className={`campaign-item${remaining === 0 ? ' is-sold-out' : ''}`}>
                                        <div className="campaign-item-text">
                                            <label className="campaign-item-name" htmlFor={inputId}>{item.name}</label>
                                            {item.description && <p className="campaign-item-description">{item.description}</p>}
                                            <p className="campaign-item-price">
                                                {formatMoney(item.priceCents)}
                                                {remaining === 0 && <span className="campaign-item-stock"> · Sold out</span>}
                                                {remaining > 0 && remaining <= LOW_STOCK && (
                                                    <span className="campaign-item-stock"> · Only {remaining} left</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="campaign-stepper">
                                            <button type="button" className="campaign-stepper-button"
                                                aria-label={`One fewer ${item.name}`}
                                                disabled={qty === 0}
                                                onClick={() => setQuantity(item, qty - 1)}>−</button>
                                            <input id={inputId} type="number" inputMode="numeric"
                                                className="form-input campaign-stepper-input"
                                                min="0" max={max} value={qty}
                                                disabled={remaining === 0}
                                                onChange={e => setQuantity(item, e.target.value)} />
                                            <button type="button" className="campaign-stepper-button"
                                                aria-label={`One more ${item.name}`}
                                                disabled={qty >= max}
                                                onClick={() => setQuantity(item, qty + 1)}>+</button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>

                    <fieldset className="form-fieldset">
                        <legend className="form-legend">Your details</legend>
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="form-label" htmlFor="campaign-first-name">
                                    First Name <span className="form-required">(required)</span>
                                </label>
                                <input id="campaign-first-name" type="text" className="form-input"
                                    autoComplete="given-name"
                                    value={buyer.firstName} onChange={e => setField('firstName', e.target.value)} />
                            </div>
                            <div className="form-field">
                                <label className="form-label" htmlFor="campaign-last-name">
                                    Last Name <span className="form-required">(required)</span>
                                </label>
                                <input id="campaign-last-name" type="text" className="form-input"
                                    autoComplete="family-name"
                                    value={buyer.lastName} onChange={e => setField('lastName', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-field">
                            <label className="form-label" htmlFor="campaign-email">
                                Email Address <span className="form-required">(required)</span>
                            </label>
                            <input id="campaign-email" type="email" className="form-input" autoComplete="email"
                                value={buyer.email} onChange={e => setField('email', e.target.value)} />
                        </div>
                        <div className="form-field">
                            <label className="form-label" htmlFor="campaign-phone">
                                Phone <span className="form-required">(required)</span>
                            </label>
                            <input id="campaign-phone" type="tel" className="form-input" autoComplete="tel"
                                value={buyer.phone} onChange={e => setField('phone', e.target.value)}
                                onBlur={() => setField('phone', formatUsPhone(buyer.phone))} />
                        </div>
                    </fieldset>

                    {coverFeesEnabled && subtotalCents > 0 && (
                        <label className="form-choice" {...campaignInspectorProps({ fieldId: 'coverFeesLabel' })}>
                            <input type="checkbox" className="form-checkbox"
                                checked={coverFees} onChange={e => setCoverFees(e.target.checked)} />
                            <span>
                                {campaign.coverFeesLabel || 'Help cover the credit card processing fee'}
                                {' '}— <strong>{formatMoney(processingFeeCents(subtotalCents))}</strong>
                            </span>
                        </label>
                    )}

                    <p className="campaign-total" aria-live="polite">
                        Total: <strong>{formatMoney(totalCents)}</strong>
                    </p>

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" className="button primary-button form-submit"
                        disabled={isLoading || redirecting}>
                        {redirecting ? 'Opening secure payment…' : isLoading ? 'One moment…' : 'Continue to payment'}
                    </button>
                </form>
            </>
        );
    }

    return (
        <section id={id} className={`campaign-section ${bgClass}`}>
            <div className="container form-container">{content}</div>
        </section>
    );
};

export default CampaignSection;
