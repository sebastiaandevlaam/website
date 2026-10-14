// Cloud Functions entry point.
//
// Each form owns a file; this one only sets global options and re-exports, so
// the deployed function names stay exactly what they were:
//
//   createDonationCheckout, stripeWebhook   -> donations.js
//   submitVolunteerApplication              -> volunteer.js
//   submitOperationMitten                   -> operationMitten.js
//   createCampaignCheckout, cancelCampaignCheckout,
//   getCampaignAvailability, getCampaignOrder -> campaigns.js (its Stripe
//                                              events arrive via stripeWebhook)
//
// Shared pieces live in sheets.js (Google Sheets), mailer.js (sending through
// Gmail), email.js (HTML escaping and table rows) and security.js (CORS, App Check, honeypot, rate limiting, input
// caps). See README-SECURITY.md for what still needs configuring by hand.

const { setGlobalOptions } = require('firebase-functions');

setGlobalOptions({ maxInstances: 10, region: 'us-east1' });

const donations = require('./donations');
const volunteer = require('./volunteer');
const operationMitten = require('./operationMitten');
const campaigns = require('./campaigns');

exports.createDonationCheckout = donations.createDonationCheckout;
exports.stripeWebhook = donations.stripeWebhook;
exports.submitVolunteerApplication = volunteer.submitVolunteerApplication;
exports.submitOperationMitten = operationMitten.submitOperationMitten;
exports.createCampaignCheckout = campaigns.createCampaignCheckout;
exports.cancelCampaignCheckout = campaigns.cancelCampaignCheckout;
exports.getCampaignAvailability = campaigns.getCampaignAvailability;
exports.getCampaignOrder = campaigns.getCampaignOrder;
