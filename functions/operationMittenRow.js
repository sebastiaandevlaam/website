// Sheet shape for Operation Mitten participation forms.
//
// One submission covers a whole family, but the gift shoppers work child by
// child, so a submission is flattened into ONE ROW PER CHILD. The family
// columns (pantry #, parent, phones, holiday) repeat on each of a family's
// rows, and the Submission ID ties them back together.

const OPERATION_MITTEN_HEADER = [
  'Date (ET)',
  'Submission ID',
  'Food Pantry #',
  'Parent / Guardian First Name',
  'Phone Number',
  'Additional Phone Number',
  'Holiday',
  'Children in Family',
  'Child #',
  'Gender',
  'Age',
  'Shirt Size',
  'Pants Size',
  'Dress Size',
  'Shoe Size',
  'Youth / Adult',
  'Preferred Clothing',
  'Favorite Color',
  'Interests',
  'Favorite Character / Person',
  'Favorite Sports Team / Figure',
  'Gift Idea 1',
  'Gift Idea 2',
  'Gift Idea 3',
];

const clean = (value) => (typeof value === 'string' ? value.trim() : value == null ? '' : String(value));

// The paper form has a free-text "other:" line next to the pre-printed choices
// for both holiday and interests. Merge it in so the sheet has one column.
function withOther(values, other) {
  const list = Array.isArray(values) ? values.map(clean).filter(Boolean) : [];
  const extra = clean(other);
  if (extra) list.push(extra);
  return list.join(', ');
}

// Short, human-quotable id — the team reads these aloud when calling families
// back about pick-up, so it stays uppercase and hyphenated.
function makeSubmissionId(date) {
  const stamp = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OM-${stamp}-${random}`;
}

// Returns one row per child. `submittedAt` is a Date; `formatDate` turns unix
// seconds into the same "YYYY-MM-DD HH:mm" Eastern string the donations sheet
// uses, so both sheets sort identically.
function buildOperationMittenRows(submission, submissionId, submittedAt, formatDate) {
  const children = Array.isArray(submission.children) ? submission.children : [];
  const timestamp = formatDate(Math.floor(submittedAt.getTime() / 1000));
  // "Other" is a prompt, not an answer — when the family names their holiday,
  // that name is what belongs in the column.
  const holidayOther = clean(submission.holidayOther);
  const holiday = holidayOther || clean(submission.holiday);

  const familyColumns = [
    timestamp,
    submissionId,
    clean(submission.pantryNumber),
    clean(submission.parentFirstName),
    clean(submission.phone),
    clean(submission.additionalPhone),
    holiday,
    children.length,
  ];

  return children.map((child, index) => {
    const wishes = Array.isArray(child.wishes) ? child.wishes : [];
    return [
      ...familyColumns,
      index + 1,
      clean(child.gender),
      clean(child.age),
      clean(child.shirtSize),
      clean(child.pantsSize),
      clean(child.dressSize),
      clean(child.shoeSize),
      clean(child.sizeType),
      clean(child.clothingPreference),
      clean(child.favoriteColor),
      withOther(child.interests, child.interestsOther),
      clean(child.favoriteCharacter),
      clean(child.favoriteSportsTeam),
      clean(wishes[0]),
      clean(wishes[1]),
      clean(wishes[2]),
    ];
  });
}

module.exports = { OPERATION_MITTEN_HEADER, buildOperationMittenRows, makeSubmissionId };
