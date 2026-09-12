const { onRequest } = require('firebase-functions/https');
const { corsMiddleware, screenRequest, capString, capStringArray } = require('./security');
const { escapeSubject, row, mailtoCell } = require('./email');

exports.submitVolunteerApplication = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const screened = await screenRequest(req);
    if (screened) return res.status(screened.status).json(screened.body);

    const body = req.body || {};
    const firstName = capString(body.firstName, 100);
    const lastName = capString(body.lastName, 100);
    const email = capString(body.email, 200);
    const phone = capString(body.phone, 40);
    const languages = capString(body.languages, 200);
    const isStudent = capString(body.isStudent, 40);
    const contactTimes = capStringArray(body.contactTimes, 40);
    const opportunities = capStringArray(body.opportunities, 200);
    const availability = capStringArray(body.availability, 200);

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const list = (arr) => (arr.length ? arr.join(', ') : '—');

    const html = `
      <h2 style="font-family:sans-serif;color:#A00405">New Volunteer Application</h2>
      <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">
        ${row('Name', `${firstName} ${lastName}`)}
        ${row('Email', mailtoCell(email), { html: true })}
        ${row('Phone', phone)}
        ${row('Best time to reach', list(contactTimes))}
        ${row('Opportunities', list(opportunities))}
        ${row('Availability', list(availability))}
        ${row('Languages', languages || '—')}
        ${row('Student', isStudent || '—')}
      </table>
    `;

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.VOLUNTEER_EMAIL_TO,
        subject: escapeSubject(`New Volunteer Application — ${firstName} ${lastName}`),
        html,
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Resend error:', err);
      res.status(500).json({ error: 'Failed to send application. Please try again.' });
    }
  });
});
