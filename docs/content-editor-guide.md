# Holliston Pantry Shelf — Content Editor Guide

This guide explains every content type in Contentful, how they connect to each other, and how to use them to manage the website.

---

## How the Website is Built

The website is made up of **pages**, and each page is composed of a stack of **sections**. You pick which sections to include, in what order, and Contentful assembles the page automatically. Most sections support a few options (background color, image position, etc.) that let you vary the visual design without touching code.

Here is how the content types relate to each other:

```
Site Settings ──┬── Announcement Header
                ├── Navigation Menu ── Button / Link
                └── Social Link

Page ── Sections ──┬── Hero Section ──────────── Button / Link
                   ├── Text with Image ────────── Button / Link
                   ├── Icon Grid ──────────────── Card ── Button / Link
                   │                          └── Button / Link (bottom)
                   ├── Contact Section ─────────── Button / Link
                   ├── News List ──────────────── News Post entries
                   └── News Post (auto-routed)

News Post ── (standalone page at /news/[slug])
```

---

## Global Elements (Site Settings)

Site Settings is a **singleton** entry — there is only one, and it controls elements that appear on every page: the announcement banner, the header, and the footer.

### Announcement Header

The yellow/beige banner that appears at the very top of the page, above the navigation.

| Field | Type | Purpose |
|---|---|---|
| **Is Active** | Yes/No | Master on/off switch. Turn off to hide without deleting. |
| **Text** | Text (markdown) | The message. Bold, italic, and links are supported. |
| **Link URL** | Text | Optional URL for the "Details" link next to the text. |
| **Link Text** | Text | Label for the link (defaults to "Details" if left blank). |
| **Start Date** | Date | Banner will not appear before this date. |
| **End Date** | Date | Banner automatically disappears after this date. |

> **Tip:** Use Start/End dates for time-sensitive announcements (food drives, holiday closures) so you can set them up in advance and they disappear on their own.

---

### Navigation Menu

Controls the links shown in the header navigation bar.

Each item in **Menu Items** is a **Button / Link** entry (see [Button / Link](#button--link) below). The style of each button entry controls whether it appears as a plain nav link, or as the gold "Contact" button.

---

### Social Links

Each Social Link entry has:

| Field | Purpose |
|---|---|
| **Platform Name** | Facebook, Instagram, YouTube, etc. The icon is chosen automatically. |
| **URL** | Full link to the social profile. |

These appear in the footer.

---

## Page

A **Page** entry is the container for an entire page on the website. Currently the site has one main page (homepage) and one news listing page.

| Field | Purpose |
|---|---|
| **Title** | Internal name (not shown on site). |
| **Slug** | The URL path (e.g., `/news` for the news page). Use `/` for the homepage. |
| **Sections** | An ordered list of section entries — this is what defines the page content. |

Reorder sections by dragging them in the Sections field. Add new ones by clicking "Add existing entry" and selecting (or creating) a section.

---

## Page Sections

### Hero Section

The large banner at the top of a page. Typically the first section on any page.

> **Screenshot:** Full-width colored banner with a headline, subtext, and two buttons.

| Field | Type | Notes |
|---|---|---|
| **Headline** | Text | Large, bold heading. Keep it short and impactful. |
| **Description** | Text | One or two sentences below the headline. |
| **Primary Button** | Button / Link | The main call to action (e.g., "Get Help"). |
| **Secondary Button** | Button / Link | Optional second button (e.g., "Support Us"). |
| **Background Style** | Dropdown | See [Background Styles](#background-styles) below. |
| **Background Image** | Image | Only shown when Background Style is "Image Background". |

**Background Style options for Hero:**
- `Red Background` — dark red (the pantry red brand color), white text
- `Gray Background` — neutral gray, white text
- `Default Background` — light/off-white, dark text
- `Beige Background` — warm beige, dark text
- `Image Background` — full bleed photo with a dark overlay and white text

---

### Text with Image Section

A two-column section with a block of text on one side and a photo on the other. Great for "About Us", mission statements, or any explanatory content.

> **Screenshot:** Heading and paragraphs on the left, photo of produce on the right.

| Field | Type | Notes |
|---|---|---|
| **Title** | Text | Section heading. |
| **Lead Paragraph** | Text | Bold intro sentence displayed above the body text. |
| **Body** | Rich Text | Full body content — supports headings, lists, bold, italic, and links. |
| **Image** | Image | The photo displayed alongside the text. |
| **Image Position** | Dropdown | `Left` or `Right` — which side the image appears on. |
| **Optional Link** | Button / Link | An optional button or link below the body text. |
| **Background Style** | Dropdown | `Default Background` (off-white) or `Beige Background`. |

> **Tip:** Alternate image position (Left / Right) across multiple Text with Image sections to create visual rhythm down the page.

---

### Icon Grid Section

A section with an icon + heading at the top, followed by a grid of **Cards**, and an optional button at the bottom. Use this to present a set of related options, services, or calls to action side by side.

> **Screenshot:** Basket icon, "Need Food Assistance?" heading, three white cards below with Eligibility / Hours & Location / Town Hall.

| Field | Type | Notes |
|---|---|---|
| **Section Icon** | Icon name | Icon displayed centered above the title (e.g., `ShoppingBasket`, `HandHeart`). See [available icons](#available-icons). |
| **Title** | Text | Section heading. |
| **Lead Paragraph** | Text | Optional intro sentence below the title. |
| **Grid Items** | Cards | 2–3 Card entries displayed in a row. See [Card](#card). |
| **Optional Bottom Button** | Button / Link | A button centered below the cards. |
| **Background Style** | Dropdown | `Default Background` or `Beige Background`. |

**Grid layout:** 2 cards → side by side (2 columns). 3 cards → three columns.

---

### Card

Cards live inside an Icon Grid Section. Each card is a self-contained content block.

| Field | Type | Notes |
|---|---|---|
| **Icon** | Icon name | Small icon shown at the top of the card. |
| **Title** | Text | Card heading (displayed in red). |
| **Description** | Text (markdown) | Body text. Supports **bold**, *italic*, and links. |
| **Optional Button Link** | Button / Link | An optional button at the bottom of the card. |

---

### Contact Section

Displays the organization's phone number, email address, and a "Send Email" button. Can use the site-wide contact info from Site Settings, or a custom phone/email for a specific context.

> **Screenshot:** Mail icon, "Get In Touch" heading, phone and email displayed, gold "Send Us an Email" button.

| Field | Type | Notes |
|---|---|---|
| **Section Icon** | Icon name | Icon above the title. |
| **Title** | Text | Section heading. |
| **Lead Paragraph** | Text | One-line intro. |
| **Contact Info Source** | Dropdown | `Custom` uses the fields below; any other value pulls from Site Settings. |
| **Custom Phone** | Text | Only used when Contact Info Source is `Custom`. |
| **Custom Email** | Text | Only used when Contact Info Source is `Custom`. |
| **Button** | Button / Link | Typically a "Send Us an Email" button. The URL is set automatically to `mailto:[email]`. |
| **Background Style** | Dropdown | `Default Background` or `Beige Background`. |

---

### News List Section

Shows a list (or grid preview) of News Post entries. Used on the `/news` page.

> **Screenshot:** "News & Announcements" heading, month filter, list of posts with date, title, excerpt, and "Read more" link.

| Field | Type | Notes |
|---|---|---|
| **Title** | Text | Section heading. |
| **Lead Paragraph** | Text | Intro text below the heading. |
| **Posts** | News Posts | Link to all news post entries you want to appear here. |
| **Display Limit** | Number | How many posts to show per page in list mode (default: 10). |
| **Display Style** | Dropdown | `List` (paginated, with month filter) or `Grid` (shows 3 most recent as cards — useful as a preview on the homepage). |
| **Background Style** | Dropdown | `Default Background` or `Beige Background`. |

**List view** includes a month/year filter dropdown (automatically shown if there are posts from 2+ different months) and Previous/Next pagination.

**Grid view** always shows only the 3 most recent posts as cards — no filter, no pagination.

---

### News Post

Each news item is its own **News Post** entry. When you add a post, it automatically gets its own page at `/news/[slug]`.

> **Screenshot:** "Spring Food Drive — Help Us Stock the Shelves!" with date, author, blockquote summary, and body text.

| Field | Type | Notes |
|---|---|---|
| **Title** | Text | The post headline. |
| **Slug** | Text | URL-friendly version of the title (e.g., `spring-food-drive-2026`). No spaces. |
| **Summary** | Text | Short excerpt displayed on the news list page and as a blockquote at the top of the post. |
| **Publish Date** | Date | Displayed on the post. Posts are ordered newest-first. |
| **Author** | Text | Shown below the title (e.g., "Holliston Pantry Shelf"). |
| **Featured Image** | Image | Optional photo shown at the top of the full post page. |
| **Body** | Rich Text | The full post content. Supports headings, paragraphs, lists, bold, italic, links, and embedded images. |

To add a post to the news list page, go to the **News List Section** entry and add the post to the **Posts** field.

> **Tip:** Set the slug to match the headline, all lowercase with hyphens. Example: "Spring Food Drive 2026" → `spring-food-drive-2026`.

---

## Reusable Elements

### Button / Link

A shared entry type used in many places: navigation, hero buttons, card buttons, and section CTAs. You can reuse the same Button / Link entry in multiple places, or create a new one each time.

| Field | Type | Notes |
|---|---|---|
| **Text Label** | Text | The visible button text. |
| **URL** | Text | Where it links. Use `#section-name` for same-page scroll, or a full URL for external links. |
| **Style** | Dropdown | Controls the visual appearance (see below). |
| **Open in New Tab** | Yes/No | Set to Yes for links that leave the site (e.g., donation pages, Google Maps). |

**Style options:**

| Style | Appearance | Use for |
|---|---|---|
| `Primary Button` | White with red border/text | The main CTA on a dark background |
| `Secondary Button` | Gold/beige filled | A secondary action |
| `Subtle Link` | Plain text link with arrow → | Inline or card links |

> **Note:** In the navigation, if a button's URL is `#contact`, it automatically appears as the gold "Contact" button regardless of style setting.

---

## Background Styles

Most sections have a **Background Style** field. Use these to create visual separation between sections:

| Value | Appearance |
|---|---|
| `Default Background` | Off-white / light cream |
| `Beige Background` | Warm beige |
| `Red Background` | Pantry red (use for Hero sections only) |
| `Gray Background` | Neutral gray (use for Hero sections only) |
| `Image Background` | Full-bleed photo (Hero only, requires Background Image) |

> **Tip:** Alternate between `Default Background` and `Beige Background` to visually separate sections on a page without using color.

---

## Available Icons

Icons are selected by entering the icon name exactly as shown. Used in Icon Grid Sections, Cards, and Contact Sections.

| Icon Name | Looks like |
|---|---|
| `ShoppingBasket` | Shopping basket |
| `HandHeart` | Hand holding a heart |
| `Users` | Two people |
| `Mail` | Envelope |
| `DollarSign` | Dollar sign $ |
| `PackageCheck` | Package with checkmark |
| `Apple` | Apple fruit |
| `Info` | Information circle |
| `Phone` | Phone handset |

---

## Common Tasks

### Add a new announcement banner
1. Go to **Site Settings → Announcement Header**.
2. Set **Is Active** to Yes, write the **Text**, and set **Start Date** / **End Date**.
3. Publish.

### Add a new news post
1. Create a new **News Post** entry. Fill in Title, Slug, Summary, Publish Date, Author, and Body.
2. Publish the post.
3. Go to the **News List Section** entry on the news page.
4. Add the new post to the **Posts** field.
5. Publish the News List Section.

### Add a new section to the homepage
1. Create the new section entry (Hero, Text with Image, Icon Grid, or Contact).
2. Publish the section.
3. Go to the **Page** entry for the homepage.
4. In the **Sections** field, click "Add existing entry" and select your new section.
5. Drag it to the desired position in the list.
6. Publish the Page.

### Change a navigation link
1. Go to **Site Settings → Navigation Menu → Menu Items**.
2. Open the **Button / Link** entry you want to change.
3. Update the **Text Label** or **URL**.
4. Publish.

### Update contact phone/email site-wide
1. Go to **Site Settings**.
2. Update the **Phone** and **Email** fields.
3. Any Contact Section using "Site Settings" as its source will update automatically.
4. Publish.
