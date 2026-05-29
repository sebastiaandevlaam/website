const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/https');
const cors = require('cors')({ origin: true });

setGlobalOptions({ maxInstances: 10, region: 'us-east1' });

exports.createDonationCheckout = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const SITE_URL = process.env.SITE_URL || 'https://hollistonpantryshelf.org';

    try {
      const { donationAmount, processingFee, coverFees, reason, honoree, acknowledgement, returnUrl } = req.body;

      if (!donationAmount || donationAmount < 1) {
        return res.status(400).json({ error: 'Invalid donation amount' });
      }

      const lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Holliston Pantry Shelf',
              description: buildDescription(reason, honoree),
            },
            unit_amount: Math.round(donationAmount * 100),
          },
          quantity: 1,
        },
      ];

      if (coverFees && processingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Transaction Cost Coverage',
              description: 'Covers Stripe processing fees so 100% of your donation reaches the pantry',
            },
            unit_amount: Math.round(processingFee * 100),
          },
          quantity: 1,
        });
      }

      const sharedMetadata = {
        reason: reason || 'general',
        honoree: honoree || '',
        ...(acknowledgement ? {
          ack_first_name: acknowledgement.firstName || '',
          ack_last_name: acknowledgement.lastName || '',
          ack_street: acknowledgement.streetAddress || '',
          ack_apt: acknowledgement.apt || '',
          ack_city: acknowledgement.city || '',
          ack_state: acknowledgement.state || '',
          ack_postal: acknowledgement.postalCode || '',
          ack_country: acknowledgement.country || '',
          ack_notes: acknowledgement.additionalText || '',
        } : {}),
      };

      const baseUrl = returnUrl || `${SITE_URL}/donate`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}?payment=success&amount=${donationAmount}`,
        cancel_url: baseUrl,
        metadata: sharedMetadata,
        payment_intent_data: {
          metadata: sharedMetadata,
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe error:', err);
      res.status(500).json({ error: 'Payment session creation failed' });
    }
  });
});

function buildDescription(reason, honoree) {
  if (honoree) return `${reason}: ${honoree}`;
  return 'Donation to support our neighbors in need';
}
