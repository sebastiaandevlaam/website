// English — the source every other language is translated from, and the
// fallback for any key a translation lacks.
//
// `ui`      — the form's hardcoded labels, hints and messages. `{n}`-style
//             placeholders are filled in by `t(key, vars)`.
// `options` — Contentful option values (genders, holidays, colours,
//             interests) and the youth/adult choice. Only the *label* is
//             translated; the English value is what reaches the sheet.
// `content` — Contentful prose, keyed by field name. In this file it holds the
//             English each translation was made from (spacing and line
//             breaks are ignored when comparing). When an editor
//             changes that text in Contentful it no longer matches, and every
//             language shows the new English instead of a stale translation —
//             dates and deadlines live in this text, so stale is worse than
//             untranslated. Update the source here and in every language to
//             bring the translations back.
export default {
    ui: {
        languageLabel: 'Language',
        required: '(required)',

        familyInformation: 'Family Information',
        shopperNumber: 'Shopper #',
        parentName: 'Parent’s / Guardian’s First Name',
        phone: 'Phone Number',
        additionalPhone: 'Additional Phone Number',

        holidayLegend: 'Are these gifts for…',
        whichHoliday: 'Which holiday?',

        childCount: 'Total number of children in family',
        childCountHint: 'We’ll ask for details about each child below. Change this number and the list updates — anything you have already filled in is kept.',

        child: 'Child {n}',
        gender: 'Gender',
        select: 'Select',
        age: 'Age',

        sizes: 'Sizes',
        sizesHint: '— as specific as you can, these buy clothes that fit',
        shirt: 'Shirt',
        pants: 'Pants',
        dress: 'Dress',
        shoes: 'Shoes',
        youthAdult: 'Youth / adult',

        clothing: 'Preferred article(s) of clothing',
        clothingPlaceholder: 'e.g. hoodies, leggings, warm socks',
        favoriteColors: 'Favorite colors',
        selectAll: '— select all that apply',
        interests: 'Favorite activities or interests',
        otherInterests: 'Other interests',
        character: 'Favorite character or person',
        characterPlaceholder: 'e.g. Elsa, Spider-Man',
        sports: 'Favorite sports team or figure',

        wishes: 'Specific books, games, toys or gift cards this child would like',
        wishesHint: '— up to {n}',
        wishPlaceholder: 'Item {n}',
        wishLabel: 'Gift idea {wish} for child {child}',

        submit: 'Submit Form',
        submitting: 'Submitting…',
        submitFailed: 'Something went wrong. Please try again.',

        closedDefault: 'Sign-ups for Operation Mitten are closed right now. Please check back next season.',
        successDefault: 'Thank you — your form has been received!',

        errorShopperNumber: 'Please enter your Shopper number.',
        errorParentName: 'Please enter the parent’s or guardian’s first name.',
        errorPhoneRequired: 'Please enter a phone number so we can reach you about pickup.',
        errorPhoneInvalid: 'Please enter a valid US phone number, for example (508) 555-0101.',
        errorAdditionalPhone: 'The additional phone number is not a valid US phone number.',
        errorHoliday: 'Please tell us which holiday these gifts are for.',
        errorHolidayOther: 'Please tell us which holiday you celebrate.',
        errorChildGender: 'Please select a gender for child {n}.',
        errorChildAge: 'Please enter an age for child {n}.',
        errorChildAgeRange: 'Child {n} must be 18 years or younger to receive gifts.',
    },

    options: {},

    content: {
        title: 'Operation Mitten Participation Form 2026',
        introText: 'Please complete this form to participate. Submissions must be received by __November 13th__. Please be very specific with the details you provide below, particularly clothing sizes and requests for specific gift items. *See below for pickup information.* Thank you!\n\n__If you need help, please contact [opmitten@hollistonpantryshelf.org](mailto:opmitten@hollistonpantryshelf.org).__',
        eligibilityNote: 'This application is only available to registered shoppers of the Holliston Pantry Shelf. Children must be 18 years or younger and live in your home to receive gifts.',
        pickupInformation: 'You will be contacted by phone or text message between December 14th and 18th about the time and location of pickup.',
        successHeadline: 'Thank you!',
        successBody: 'Thank you for submitting your Operation Mitten 2026 form. You will be contacted by phone or text message between December 14th and 18th about the time and location of pickup.',
    },
};
