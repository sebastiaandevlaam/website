import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL;
const DEFAULT_AMOUNTS = [10, 25, 50, 100, 250];

const EMPTY_ACK = {
  firstName: '', lastName: '',
  streetAddress: '', apt: '',
  city: '', state: '', postalCode: '', country: '',
  additionalText: '',
};

const DonationSection = ({
  title,
  introText,
  reasons,
  presetAmounts,
  coverFeesEnabled,
  coverFeesLabel,
  collectAcknowledgement,
  acknowledgementTitle,
  acknowledgementIntroText,
  successHeadline,
  successBody,
}) => {
  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get('payment') === 'success';
  const paidAmount = parseFloat(searchParams.get('amount')) || 0;

  const reasonList = reasons?.map(r => r.fields).filter(Boolean) || [];
  const amounts = presetAmounts?.length
    ? presetAmounts.map(n => parseInt(n)).filter(n => !isNaN(n))
    : DEFAULT_AMOUNTS;

  const defaultReason = reasonList[0]?.value || '';
  const defaultAmount = amounts[Math.floor(amounts.length / 2)] ?? amounts[0];

  const [selectedReason, setSelectedReason] = useState(defaultReason);
  const [extraFieldValue, setExtraFieldValue] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(defaultAmount);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [coverFees, setCoverFees] = useState(true);
  const [ackExpanded, setAckExpanded] = useState(false);
  const [ackData, setAckData] = useState(EMPTY_ACK);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentReason = reasonList.find(r => r.value === selectedReason);
  const donationAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;
  // Gross-up so the org receives exactly donationAmount after Stripe takes 2.9% + $0.30
  const grossTotal = donationAmount > 0
    ? Math.ceil((donationAmount + 0.30) / (1 - 0.029) * 100) / 100
    : 0;
  const processingFee = grossTotal - donationAmount;
  const coverFeesActive = coverFeesEnabled !== false && coverFees;
  const total = coverFeesActive ? grossTotal : donationAmount;

  const setAck = (field, value) => setAckData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (donationAmount < 1) {
      setError('Please enter a donation amount of at least $1.');
      return;
    }

    if (currentReason?.extraFieldRequired && !extraFieldValue.trim()) {
      setError(`Please enter ${currentReason.extraFieldLabel || 'the required information'}.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/createDonationCheckout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationAmount,
          processingFee: coverFeesActive ? processingFee : 0,
          coverFees: coverFeesActive,
          reason: currentReason?.label || selectedReason,
          honoree: extraFieldValue.trim(),
          acknowledgement: ackExpanded ? ackData : null,
          returnUrl: window.location.origin + window.location.pathname,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setError('Unable to connect to the payment processor. Please try again.');
      setIsLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <section className="donate-section">
        <div className="donate-form-wrapper">
          <div className="donate-success-card">
            <div className="donate-success-icon" aria-hidden="true">✓</div>
            <h2>{successHeadline || 'Thank You!'}</h2>
            {paidAmount > 0 && (
              <p className="donate-success-amount">
                Your donation of <strong>${paidAmount.toFixed(2)}</strong> has been received.
              </p>
            )}
            {successBody && (
              <div className="markdown-content">
                <ReactMarkdown>{successBody}</ReactMarkdown>
              </div>
            )}
            <div className="donate-success-actions">
              <a href={window.location.pathname} className="button primary-button">
                Make Another Donation
              </a>
              <a href="/" className="button secondary-button">
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Donation form ─────────────────────────────────────────────────────────

  return (
    <section className="donate-section">
      <div className="donate-form-wrapper">

        {/* Title + intro above the form card */}
        {(title || introText) && (
          <div className="donate-section-intro">
            {title && <h2 className="donate-section-title">{title}</h2>}
            {introText && (
              <div className="markdown-content donate-intro-text">
                <ReactMarkdown>{introText}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <div className="donate-card">
          <form onSubmit={handleSubmit} noValidate>

            {/* Reason — dropdown when multiple, plain text when only one */}
            {reasonList.length > 1 && (
              <div className="donate-field-group">
                <label className="donate-label" htmlFor="donation-reason">
                  I'm donating
                </label>
                <select
                  id="donation-reason"
                  className="donate-select"
                  value={selectedReason}
                  onChange={(e) => {
                    setSelectedReason(e.target.value);
                    setExtraFieldValue('');
                    setError('');
                  }}
                >
                  {reasonList.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}
            {reasonList.length === 1 && (
              <p className="donate-reason-display">{reasonList[0].label}</p>
            )}

            {/* Per-reason extra field */}
            {currentReason?.extraFieldLabel && (
              <div className="donate-field-group">
                <label className="donate-label" htmlFor="donation-extra">
                  {currentReason.extraFieldLabel}
                  {currentReason.extraFieldRequired && (
                    <span className="donate-required"> *</span>
                  )}
                </label>
                <input
                  id="donation-extra"
                  type="text"
                  className="donate-text-input"
                  value={extraFieldValue}
                  onChange={(e) => { setExtraFieldValue(e.target.value); setError(''); }}
                />
              </div>
            )}

            {/* Preset amount buttons */}
            <div className="donate-field-group">
              <label className="donate-label">Choose an Amount</label>
              <div className="donate-amounts">
                {amounts.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    className={`donate-amount-btn${!isCustom && selectedAmount === amount ? ' selected' : ''}`}
                    onClick={() => { setSelectedAmount(amount); setIsCustom(false); setCustomAmount(''); setError(''); }}
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  type="button"
                  className={`donate-amount-btn${isCustom ? ' selected' : ''}`}
                  onClick={() => { setIsCustom(true); setSelectedAmount(null); setError(''); }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom amount input */}
            {isCustom && (
              <div className="donate-field-group">
                <label className="donate-label" htmlFor="custom-amount">Custom Amount</label>
                <div className="donate-custom-input-wrapper">
                  <span className="donate-currency-symbol">$</span>
                  <input
                    id="custom-amount"
                    type="number"
                    min="1"
                    step="1"
                    className="donate-text-input donate-custom-input"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setError(''); }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Cover fees checkbox */}
            {coverFeesEnabled !== false && donationAmount > 0 && (
              <label className="donate-fee-label">
                <input
                  type="checkbox"
                  className="donate-checkbox"
                  checked={coverFees}
                  onChange={(e) => setCoverFees(e.target.checked)}
                />
                <span>
                  {coverFeesLabel || 'Help cover the credit card processing fee'}
                  {' '}— <strong>${processingFee.toFixed(2)}</strong>, so 100% of your gift reaches our neighbors
                </span>
              </label>
            )}

            {/* Running total */}
            {donationAmount > 0 && (
              <div className="donate-total-row">
                <span>Total</span>
                <span className="donate-total-amount">${total.toFixed(2)}</span>
              </div>
            )}

            {/* Acknowledgement section */}
            {collectAcknowledgement && (
              <div className="donate-ack-section">
                <button
                  type="button"
                  className="donate-ack-toggle"
                  onClick={() => setAckExpanded(v => !v)}
                  aria-expanded={ackExpanded}
                >
                  <span>{acknowledgementTitle || 'Acknowledgement Letter'}</span>
                  {ackExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {ackExpanded && (
                  <div className="donate-ack-body">
                    {acknowledgementIntroText && (
                      <div className="markdown-content donate-ack-intro">
                        <ReactMarkdown>{acknowledgementIntroText}</ReactMarkdown>
                      </div>
                    )}

                    <div className="donate-address-grid">
                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-first-name">First Name</label>
                        <input id="ack-first-name" type="text" className="donate-text-input"
                          value={ackData.firstName} onChange={e => setAck('firstName', e.target.value)} />
                      </div>
                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-last-name">Last Name</label>
                        <input id="ack-last-name" type="text" className="donate-text-input"
                          value={ackData.lastName} onChange={e => setAck('lastName', e.target.value)} />
                      </div>

                      <div className="donate-field-group donate-address-grid-full">
                        <label className="donate-label" htmlFor="ack-street">Street Address</label>
                        <input id="ack-street" type="text" className="donate-text-input"
                          value={ackData.streetAddress} onChange={e => setAck('streetAddress', e.target.value)} />
                      </div>

                      <div className="donate-field-group donate-address-grid-full">
                        <label className="donate-label" htmlFor="ack-apt">Apt / Unit / Suite</label>
                        <input id="ack-apt" type="text" className="donate-text-input"
                          value={ackData.apt} onChange={e => setAck('apt', e.target.value)} />
                      </div>

                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-city">City</label>
                        <input id="ack-city" type="text" className="donate-text-input"
                          value={ackData.city} onChange={e => setAck('city', e.target.value)} />
                      </div>
                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-state">State</label>
                        <input id="ack-state" type="text" className="donate-text-input"
                          value={ackData.state} onChange={e => setAck('state', e.target.value)} />
                      </div>

                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-postal">Postal Code</label>
                        <input id="ack-postal" type="text" className="donate-text-input"
                          value={ackData.postalCode} onChange={e => setAck('postalCode', e.target.value)} />
                      </div>
                      <div className="donate-field-group">
                        <label className="donate-label" htmlFor="ack-country">Country</label>
                        <input id="ack-country" type="text" className="donate-text-input"
                          placeholder="United States"
                          value={ackData.country} onChange={e => setAck('country', e.target.value)} />
                      </div>

                      <div className="donate-field-group donate-address-grid-full">
                        <label className="donate-label" htmlFor="ack-additional">Additional Notes</label>
                        <textarea id="ack-additional" className="donate-text-input donate-textarea" rows={3}
                          placeholder="Any special instructions or requests for your acknowledgement letter"
                          value={ackData.additionalText} onChange={e => setAck('additionalText', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <p className="donate-error">{error}</p>}

            <button
              type="submit"
              className="donate-submit-btn button primary-button"
              disabled={isLoading || donationAmount < 1}
            >
              {isLoading
                ? 'Redirecting to payment…'
                : donationAmount >= 1
                  ? `Give $${total.toFixed(2)}`
                  : 'Choose an amount above'}
            </button>

            <p className="donate-secure-note">
              🔒 Your payment is processed securely by Stripe. We never see your card details.
            </p>

          </form>
        </div>
      </div>
    </section>
  );
};

export default DonationSection;
