# Holliston Pantry Shelf — website

Public site for the Holliston Pantry Shelf food pantry. React + Vite, content
from Contentful, hosted on Firebase Hosting, with three form-handling Cloud
Functions.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Anything that submits a form (donate, volunteer, Operation Mitten) also needs
the Functions emulator, because `.env.development` points at it:

```bash
firebase emulators:start --only functions    # in a second terminal
```

## Commands

```bash
npm run dev        # dev server
npm run build      # production build -> dist/
npm run preview    # serve the build locally
npm run lint       # ESLint over src/ and functions/
npm test           # vitest unit tests
firebase deploy    # deploy hosting + functions
```

`firebase emulators:start --only hosting` serves `dist/` with the real security
headers from `firebase.json` — worth using before deploying a header change,
since `npm run dev` does not apply them.

## Layout

```
src/
  components/        section components, one per Contentful content type
    form/            pieces shared by all three forms
  hooks/             Contentful fetching, shared form submission
  styles/            CSS, split by area; App.css is only the import manifest
  utils/             Contentful field helpers, phone validation, App Check
functions/           Cloud Functions — one file per form, plus shared modules
docs/                content editor guide, accessibility statement
```

## Documentation

- `CLAUDE.md` — architecture, conventions, and the Contentful setup each
  section type needs
- `functions/README-SECURITY.md` — **the manual setup that is still
  outstanding**, chiefly enabling App Check
- `docs/accessibility-statement.md` — source copy for the /accessibility page
