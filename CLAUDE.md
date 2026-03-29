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

## Firebase Deployment

- Project: `holliston-pantry-shelf`
- Public dir: `dist/`
- Region: `us-east1`
- Run `npm run build` before `firebase deploy`.
