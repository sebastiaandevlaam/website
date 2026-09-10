# CLAUDE.md — Holliston Pantry Shelf Website

## Project Overview

Public-facing marketing website for the Holliston Pantry Shelf food pantry organization. Content is managed in Contentful CMS; the site fetches and renders that content dynamically at runtime.

## Tech Stack

- **React 19** with Vite 6 (SPA)
- **Contentful** headless CMS (Content Delivery API + Live Preview)
- **Vanilla CSS** — no CSS framework; all styles in `src/App.css` and `src/index.css`
- **Lucide React** for icons
- **react-markdown** for markdown fields
- **Firebase Hosting** — deploy target is the `dist/` build output

## Commands

```bash
npm run dev        # Dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint
firebase deploy    # Deploy dist/ to Firebase (from repo root or website/)
```

## Architecture

### Data Flow

```
Contentful API → useContentfulData (hook) → App.jsx → SectionRenderer → Section components
```

`useContentfulData` (`src/hooks/useContentfulData.jsx`) fetches two Contentful entries:
- **`page`** — homepage entry with a `sections` array of section entries
- **`siteSettings`** — singleton with header/footer/SEO fields

### Section-Based Rendering

`SectionRenderer.jsx` maps each section's `sys.contentType.sys.id` to a component:

| Content Type | Component |
|---|---|
| `sectionHero` | `HeroSection` |
| `sectionTextWithImage` | `TextWithImageSection` |
| `sectionIconGrid` | `IconGridSection` |
| `sectionContact` | `ContactSection` |
| `sectionVolunteer` | `VolunteerSection` |
| `sectionOperationMitten` | `OperationMittenSection` |

To add a new section type: create the component, add the mapping in `SectionRenderer.jsx`, and define the content type in Contentful.

### Path Aliases

`@/` resolves to `src/`. Use `@/components/Foo` instead of relative paths.

## Styling Conventions

CSS custom properties defined at `:root` in `App.css`:

```css
--pantry-red: #A00405
--pantry-beige: #F0EAD6
--pantry-gold: #C19A6B
--pantry-text: #4A4A4A
--pantry-bg: #FAF8F0
```

Fonts: **Nunito Sans** (headings) and **Open Sans** (body), loaded from Google Fonts via `index.html`.

All layout uses plain CSS classes — no utility classes, no CSS modules. Add new styles to `App.css` following existing section-based organization.

## Contentful Integration Notes

- Contentful credentials are currently hardcoded in `useContentfulData.jsx` (Space ID + Content Delivery API token). These are read-only public delivery tokens, not management tokens.
- Fetch depth is set to `include: 10` to resolve all nested references in a single request.
- The `AnnouncementHeader` component is date-aware — it respects `startDate` and `endDate` fields from Contentful to show/hide banners automatically.

## Key Conventions

- Props map directly to Contentful field names (e.g. `fields.headline`, `fields.backgroundStyle`).
- Use optional chaining (`?.`) everywhere when accessing Contentful data — fields may be unpublished or missing.
- Anchor/scroll IDs are auto-generated from button URLs or section titles; no manual IDs needed.
- External links should have `rel="noopener noreferrer"` and open in a new tab when `openInNewTab` is set.
- Image `alt` text comes from Contentful `description` field with a sensible fallback string.
- Body text font size is `1rem` across all section types (e.g. `TextWithImageSection`, `IconGridSection` cards) for visual consistency.

## Volunteer Form

`VolunteerSection` submits to the `submitVolunteerApplication` Cloud Function, which emails the application via the Resend API. Required env vars on the function:

- `RESEND_API_KEY` — API key from resend.com
- `RESEND_FROM` — verified sender address (e.g. `volunteers@hollistonpantryshelf.org`)
- `VOLUNTEER_EMAIL_TO` — recipient address for incoming applications

**Contentful setup required:**

1. Content type `volunteerOpportunity` — field: `label` (Short text)
2. Content type `availabilityShift` — field: `label` (Short text)
3. Content type `sectionVolunteer` — fields:
   - `title` (Short text)
   - `introText` (Long text / Markdown)
   - `volunteerOpportunities` (References, Many → `volunteerOpportunity`)
   - `availabilityShifts` (References, Many → `availabilityShift`)
   - `availabilityHint` (Short text, optional) — sub-label shown below the availability legend
   - `studentOptions` (Short text, list) — e.g. Yes, No, Part-time
   - `successHeadline` (Short text, optional)
   - `successBody` (Long text / Markdown, optional)
   - `backgroundStyle` (Short text, optional — same values as other sections)

The contact time checkboxes (Morning / Afternoon / Evening) and all field labels are hardcoded. Everything else is Contentful-driven.

## Operation Mitten Form

`OperationMittenSection` is the web version of the paper "Operation Mitten Participation Form" — the holiday gift request families fill in for their children. It submits to the `submitOperationMitten` Cloud Function, which appends the submission to a Google Sheet using the same service-account setup as the donations sheet.

**Key difference from the paper form:** the parent picks the number of children from a dropdown and the child block repeats that many times, instead of the paper form's fixed four. Changing the number preserves anything already filled in for the children that remain.

**Sheet layout — one row per child.** Gift shoppers work child by child, so a submission is flattened: the family columns (shopper #, parent, phones, holiday) repeat on each of that family's rows, tied together by a shared `Submission ID` (e.g. `OM-MVZLG280-XACX`). Column order lives in `functions/operationMittenRow.js` (`OPERATION_MITTEN_HEADER`, 24 columns) — the single source of truth, so never reorder columns in the sheet by hand.

Required env vars on the function:

- `OPERATION_MITTEN_SHEET_ID` — the spreadsheet id for the Operation Mitten sheet
- `GOOGLE_SERVICE_ACCOUNT_JSON` — already set for donations; share the new sheet with that service account's email as an Editor

Sheet writing is shared with donations via `getSheetsClient()`, `appendSheetRows()` and `ensureHeaderRow(sheets, id, header)` in `functions/index.js`. `ensureHeaderRow` writes the header only when the sheet is empty and derives its range from the header length, so it works for both sheets.

**Why appended rows are explicitly un-bolded.** `values.append` inherits formatting from the row above, so a bold header row makes row 2 bold, row 3 then inherits from row 2, and every future row is bold. `appendSheetRows` therefore issues a `repeatCell` clearing `bold` on exactly the range it just wrote, which breaks the chain at the first link and leaves the next append inheriting from a plain row. On a sheet it creates the header for, `ensureHeaderRow` also bolds and freezes row 1 so a new sheet needs no manual styling; existing sheets keep whatever styling they have. Both formatting steps are wrapped in `try`/`catch` — the row is already safely written by then, and cosmetics must never fail a submission. `batchUpdate` addresses tabs by numeric id rather than name, so `getSheetGridId()` looks it up and caches it per warm instance.

Both of these apply to the donations sheet too, since the helpers are shared.

**Contentful setup required** — content type `sectionOperationMitten`:

- `title` (Short text)
- `introText` (Long text / Markdown)
- `eligibilityNote` (Long text / Markdown, optional) — the "18 years or younger" and "complete in English" rules, rendered as a callout
- `pickupInformation` (Long text / Markdown, optional) — callout below the form
- `maxChildren` (Integer, optional — defaults to 4, matching the paper form; capped at 12)
- `genderOptions` (Short text, list — defaults to Boy, Girl)
- `holidayOptions` (Short text, list — defaults to Christmas, Hanukkah, Other). The literal value `Other` reveals a free-text "Which holiday?" input; that text is what lands in the sheet's Holiday column.
- `colorOptions` (Short text, list) — favourite colour dropdown; the whole field hides when empty
- `interestOptions` (Short text, list) — activity checkboxes; the whole fieldset hides when empty
- `openDate` / `closeDate` (Date & time, both optional) — outside the window the form is replaced by `closedMessage`. Leave both empty and the form is always open.
- `closedMessage` (Long text / Markdown, optional)
- `successHeadline` (Short text, optional)
- `successBody` (Long text / Markdown, optional)
- `backgroundStyle` (Short text, optional — same values as other sections)

Field labels, the youth/adult size choice, and the three gift-idea slots are hardcoded. Validation requires shopper #, parent first name, phone, holiday, and a gender plus an age of 0–18 for every child; the function re-checks all of it and refuses more than 12 children.

**Validation feedback.** `validate()` returns `{ field, message }` rather than a bare string, where `field` is the id of the input at fault. On a failed submit the form scrolls that field to the centre of the screen, focuses it, marks it `aria-invalid`, and renders the message directly beneath it via `aria-describedby`. This matters because the form runs several screens long — a message next to the submit button alone reads as nothing having happened when the empty field is off-screen above. The summary above the button is therefore only shown for errors with no field to point at, such as a failed request.

**Phone numbers** must be valid US/NANP numbers. The rules live in `src/utils/phone.js` and its server-side twin `functions/phone.js` — the site and the functions deploy separately and cannot import across that boundary, so changing one means changing the other. Any separator is accepted on input (`5085550101`, `508.555.0101`, `+1 508 555 0101`), an area or exchange code starting with 0/1 or ending in `11` is rejected, and a valid number is reformatted to `(508) 555-0101` on blur and again before it reaches the sheet, so every row dials the same way. The additional phone is optional but validated when filled in.

## Footer

The `Footer` component renders three columns inside `.footer-inner` on the dark footer, followed by a full-width `.footer-bar` with the copyright line:

1. **Brand** — site name (`siteSettings.siteName`), tagline, social links.
2. **Contact** — address, phone, email. Phone/email come from `siteSettings.defaultContactPhone` / `defaultContactEmail`; the address comes from `siteSettings.footerAddress`.
3. **Affiliate badge** — the Greater Boston Food Bank "Powered By" logo, shown on a white "badge card" (`src/assets/gbfb-affiliate-logo.png` — an optimized, transparent, Pantry-Red-framed version of the CMYK master JPG). The card exists because the badge is designed for a light background and reads poorly directly on the dark footer.

**Contentful setup:** add a `footerAddress` field (Short or Long text) to the `siteSettings` content type. Line breaks are preserved (`white-space: pre-line`). The contact block hides any missing line and hides entirely if all three are empty.

## Navigation Conventions

- The project does **not** use React Router. Page navigation uses plain `<a href>` links and `window.location`.
- The "Back to Previous Page" link in `NewsPostSection` uses `window.history.back()` with a fallback to `/news` when no same-origin referrer is present (e.g. direct link or external source).

## Mobile Header Layout

- The hamburger menu appears on the **top left** in mobile view (below 540px), achieved via `order: -1` and `margin-right: auto` on `.header .mobile-menu-button`.
- At 540px+ the hamburger is hidden and the full desktop nav is shown.

## Firebase Deployment

- Project: `holliston-pantry-shelf`
- Public dir: `dist/`
- Region: `us-east1`
- Run `npm run build` before `firebase deploy`.
