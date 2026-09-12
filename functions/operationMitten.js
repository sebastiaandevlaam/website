const { onRequest } = require('firebase-functions/https');
const { formatDateEastern } = require('./donationRow');
const {
  OPERATION_MITTEN_HEADER,
  buildOperationMittenRows,
  makeSubmissionId,
} = require('./operationMittenRow');
const { getSheetsClient, appendSheetRows, ensureHeaderRow } = require('./sheets');
const { corsMiddleware, screenRequest, capString, capStringArray } = require('./security');
const { isValidUsPhone } = require('./phone');

// Holiday gift request form. Unlike donations there is no payment step, so the
// form posts straight here and we append to the sheet in the request — one row
// per child, so the shoppers can work the sheet line by line.

// Guard against a malformed or hostile payload asking us to write thousands of
// rows. The Contentful `maxChildren` field controls what the form offers; this
// is the hard ceiling.
const MAX_CHILDREN_PER_SUBMISSION = 12;
const WISHES_PER_CHILD = 3;

// Every value lands in a spreadsheet cell, so cap each one. Applied before
// validation so a huge payload is cheap to reject.
function sanitizeSubmission(body) {
  return {
    shopperNumber: capString(body.shopperNumber, 60),
    parentFirstName: capString(body.parentFirstName, 100),
    phone: capString(body.phone, 40),
    additionalPhone: capString(body.additionalPhone, 40),
    holiday: capString(body.holiday, 60),
    holidayOther: capString(body.holidayOther, 100),
    children: (Array.isArray(body.children) ? body.children : [])
      .slice(0, MAX_CHILDREN_PER_SUBMISSION + 1)
      .map(child => ({
        gender: capString(child?.gender, 40),
        age: capString(child?.age, 10),
        shirtSize: capString(child?.shirtSize, 20),
        pantsSize: capString(child?.pantsSize, 20),
        dressSize: capString(child?.dressSize, 20),
        shoeSize: capString(child?.shoeSize, 20),
        sizeType: capString(child?.sizeType, 20),
        clothingPreference: capString(child?.clothingPreference, 200),
        favoriteColors: capStringArray(child?.favoriteColors, 40, 20),
        interests: capStringArray(child?.interests, 60, 40),
        interestsOther: capString(child?.interestsOther, 200),
        favoriteCharacter: capString(child?.favoriteCharacter, 120),
        favoriteSportsTeam: capString(child?.favoriteSportsTeam, 120),
        wishes: capStringArray(child?.wishes, 200, WISHES_PER_CHILD),
      })),
  };
}

exports.submitOperationMitten = onRequest((req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const screened = await screenRequest(req);
    if (screened) return res.status(screened.status).json(screened.body);

    const submission = sanitizeSubmission(req.body || {});
    const { shopperNumber, parentFirstName, phone, children } = submission;

    if (!shopperNumber || !parentFirstName || !phone) {
      return res.status(400).json({ error: 'Missing required family details.' });
    }

    if (!isValidUsPhone(phone)) {
      return res.status(400).json({ error: 'Please enter a valid US phone number.' });
    }

    if (submission.additionalPhone && !isValidUsPhone(submission.additionalPhone)) {
      return res.status(400).json({ error: 'The additional phone number is not a valid US phone number.' });
    }

    if (children.length === 0) {
      return res.status(400).json({ error: 'Please add at least one child.' });
    }

    if (children.length > MAX_CHILDREN_PER_SUBMISSION) {
      return res.status(400).json({
        error: `This form accepts up to ${MAX_CHILDREN_PER_SUBMISSION} children. Please contact us directly for a larger family.`,
      });
    }

    for (const [index, child] of children.entries()) {
      if (!child.gender || !child.age.trim()) {
        return res.status(400).json({ error: `Please complete the gender and age for child ${index + 1}.` });
      }
      const age = Number(child.age);
      if (!Number.isInteger(age) || age < 0 || age > 18) {
        return res.status(400).json({ error: `Child ${index + 1} must be 18 years or younger.` });
      }
    }

    const submittedAt = new Date();
    const submissionId = makeSubmissionId(submittedAt);

    try {
      const sheets = getSheetsClient();
      const spreadsheetId = process.env.OPERATION_MITTEN_SHEET_ID;

      await ensureHeaderRow(sheets, spreadsheetId, OPERATION_MITTEN_HEADER);

      const rows = buildOperationMittenRows(submission, submissionId, submittedAt, formatDateEastern);
      await appendSheetRows(sheets, spreadsheetId, rows);

      res.json({ success: true, submissionId });
    } catch (err) {
      console.error('Operation Mitten sheet error:', err);
      res.status(500).json({ error: 'Failed to submit the form. Please try again.' });
    }
  });
});

exports._internal = { sanitizeSubmission, MAX_CHILDREN_PER_SUBMISSION };
