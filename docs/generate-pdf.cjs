const puppeteer = require(require('path').join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = path.join(__dirname, 'screenshots');
const OUT_HTML = path.join(__dirname, 'content-editor-guide.html');
const OUT_PDF  = path.join(__dirname, 'content-editor-guide.pdf');

// Embed a file as a base64 data URI
function dataUri(filePath, mime) {
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,` + data.toString('base64');
}

function img(name)  { return dataUri(path.join(SHOTS, name + '.jpg'), 'image/jpeg'); }
const logoUri       = dataUri(path.join(__dirname, '..', 'src', 'assets', 'hps_logo.png'), 'image/png');

// ─────────────────────────────────────────────────────────────────────────────
// HTML template
// ─────────────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Holliston Pantry Shelf — Content Editor Guide</title>
<style>
/* ── Google Fonts (loaded locally via data URI fallback) ── */
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap');

/* ── Page geometry ── */
@page {
  size: A4;
  margin: 18mm 18mm 22mm 18mm;
}
@page :first { margin: 0; }          /* cover page: full bleed */

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Design tokens ── */
:root {
  --red:    #A00405;
  --red-dk: #7a0304;
  --beige:  #F0EAD6;
  --gold:   #C19A6B;
  --text:   #4A4A4A;
  --bg:     #FAF8F0;
  --border: #ddd4be;
  --shadow: rgba(0,0,0,.08);
}

/* ── Base ── */
body {
  font-family: 'Open Sans', sans-serif;
  font-size: 9.5pt;
  line-height: 1.65;
  color: var(--text);
  background: white;
}

/* ══════════════════════════════════════════════════
   COVER  (first page, full bleed, no margins)
══════════════════════════════════════════════════ */
.cover {
  page-break-after: always;
  width: 210mm;
  height: 297mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--red);
  color: white;
  text-align: center;
  padding: 0 40mm;
}
.cover-logo {
  width: 110px;
  height: auto;
  margin-bottom: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  padding: 10px;
}
.cover h1 {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 30pt;
  font-weight: 800;
  letter-spacing: -.3px;
  margin-bottom: 14px;
}
.cover h2 {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 15pt;
  font-weight: 400;
  opacity: .82;
  margin-bottom: 32px;
}
.cover p {
  font-size: 9.5pt;
  opacity: .72;
  max-width: 340px;
  line-height: 1.6;
}
.cover-meta {
  margin-top: 48px;
  font-size: 8pt;
  opacity: .55;
  letter-spacing: .5px;
  text-transform: uppercase;
}
.cover-rule {
  width: 60px;
  height: 3px;
  background: rgba(255,255,255,.4);
  margin: 24px auto;
  border-radius: 2px;
}

/* ══════════════════════════════════════════════════
   TABLE OF CONTENTS
══════════════════════════════════════════════════ */
.toc {
  page-break-after: always;
  padding: 10mm 0;
}
.toc h2 {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 17pt;
  font-weight: 800;
  color: var(--red);
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 2.5px solid var(--red);
}
.toc-list { list-style: none; }
.toc-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px dotted var(--border);
  gap: 8px;
}
.toc-list li::after {
  content: '';
  flex: 1;
  border-bottom: 1px dotted var(--border);
  margin: 0 6px 3px;
  order: 2;
}
.toc-list li a {
  color: var(--text);
  text-decoration: none;
  font-size: 9.5pt;
  order: 1;
}
.toc-list li span { order: 3; font-size: 8.5pt; color: #999; white-space: nowrap; }
.toc-section a { font-family: 'Nunito Sans', sans-serif; font-weight: 700; color: var(--red) !important; font-size: 10pt !important; }
.toc-section { margin-top: 6px; }
.toc-sub a   { padding-left: 14px; }
.toc-sub2 a  { padding-left: 28px; font-size: 9pt !important; color: #777 !important; }

/* ══════════════════════════════════════════════════
   CONTENT PAGES
══════════════════════════════════════════════════ */

/* Chapter title (h1) */
h1.chapter {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 18pt;
  font-weight: 800;
  color: var(--red);
  margin-bottom: 5mm;
  padding-bottom: 3mm;
  border-bottom: 3px solid var(--red);
}
/* Running chapter number pill */
h1.chapter .num {
  display: inline-block;
  background: var(--red);
  color: white;
  font-size: 9pt;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 20px;
  margin-right: 8px;
  vertical-align: middle;
  position: relative;
  top: -2px;
}

/* Section heading (h2) */
h2 {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 12.5pt;
  font-weight: 800;
  color: var(--red-dk);
  margin-top: 8mm;
  margin-bottom: 3mm;
  padding-bottom: 2mm;
  border-bottom: 1.5px solid var(--border);
}

/* Subsection heading (h3) */
h3 {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 10.5pt;
  font-weight: 700;
  color: var(--text);
  margin-top: 5mm;
  margin-bottom: 2mm;
}

p   { margin-bottom: 2.5mm; }
ul, ol { margin: 2mm 0 4mm 5mm; }
li  { margin-bottom: 1.5mm; }
strong { font-weight: 700; }
code {
  font-family: 'Courier New', monospace;
  font-size: 8pt;
  background: #f3ede0;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid #e0d4be;
}

/* ── Screenshot ── */
figure.screenshot {
  margin: 4mm 0 5mm;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
  box-shadow: 0 2px 10px var(--shadow);
  page-break-inside: avoid;
}
figure.screenshot img { width: 100%; display: block; }
figure.screenshot figcaption {
  background: var(--beige);
  padding: 5px 12px;
  font-size: 8pt;
  color: #7a6844;
  font-style: italic;
  text-align: center;
  border-top: 1px solid var(--border);
  line-height: 1.4;
}

/* ── Field table ── */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 3mm 0 5mm;
  font-size: 8.5pt;
  page-break-inside: avoid;
}
thead th {
  background: var(--red);
  color: white;
  padding: 5px 10px;
  text-align: left;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 8.5pt;
  font-weight: 700;
}
tbody tr:nth-child(even) { background: var(--bg); }
tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
tbody td:first-child { font-weight: 600; white-space: nowrap; font-size: 8.5pt; }

/* ── Callout boxes ── */
.tip, .note {
  padding: 8px 14px;
  margin: 3mm 0;
  border-radius: 0 5px 5px 0;
  font-size: 8.5pt;
  line-height: 1.55;
  page-break-inside: avoid;
}
.tip  { background: #fffbf0; border-left: 4px solid var(--gold); }
.tip strong  { color: #7a5a10; }
.note { background: #fff5f5; border-left: 4px solid var(--red); }
.note strong { color: var(--red); }

/* ── Diagram box ── */
.diagram {
  background: #f8f5f0;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4mm 5mm;
  font-family: 'Courier New', monospace;
  font-size: 8pt;
  line-height: 1.7;
  margin: 3mm 0;
  white-space: pre;
  page-break-inside: avoid;
}

/* ── Icon reference grid ── */
.icon-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 3mm 0;
}
.icon-cell {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 8.5pt;
}
.icon-cell strong { display: block; font-size: 8pt; color: var(--red); }
.icon-cell span   { font-size: 7.5pt; color: #888; }

/* ── Numbered steps ── */
.steps { list-style: none; margin-left: 0; }
.steps li {
  counter-increment: steps;
  padding: 6px 10px 6px 36px;
  margin-bottom: 4px;
  background: var(--bg);
  border-radius: 5px;
  position: relative;
  font-size: 8.5pt;
}
.steps li::before {
  content: counter(steps);
  position: absolute;
  left: 10px;
  top: 6px;
  width: 20px;
  height: 20px;
  background: var(--red);
  color: white;
  border-radius: 50%;
  font-size: 7.5pt;
  font-weight: 700;
  font-family: 'Nunito Sans', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 20px;
}
ol.steps { counter-reset: steps; }

/* ── Page breaks ── */
.page-break  { page-break-before: always; }
.avoid-break { page-break-inside: avoid; }

/* ── Section label chip ── */
.section-label {
  display: inline-block;
  background: var(--beige);
  border: 1px solid var(--border);
  color: #7a6040;
  font-family: 'Nunito Sans', sans-serif;
  font-size: 7.5pt;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: .4px;
  margin-bottom: 3mm;
}

/* ── Print ── */
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════ -->
<div class="cover">
  <img class="cover-logo" src="${logoUri}" alt="Holliston Pantry Shelf logo">
  <div class="cover-rule"></div>
  <h1>Content Editor Guide</h1>
  <h2>Holliston Pantry Shelf Website</h2>
  <p>A complete reference for managing website content in Contentful — sections, fields, options, and step-by-step tasks.</p>
  <div class="cover-meta">Holliston Pantry Shelf &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long' })}</div>
</div>

<!-- ══════════════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════════════ -->
<div class="toc">
  <h2>Table of Contents</h2>
  <ul class="toc-list">
    <li class="toc-section"><a href="#overview">1 &nbsp; How the Website Works</a><span>3</span></li>
    <li class="toc-section"><a href="#global">2 &nbsp; Global Elements (Site Settings)</a><span>4</span></li>
    <li class="toc-sub"><a href="#announcement">Announcement Header</a><span>4</span></li>
    <li class="toc-sub"><a href="#navigation">Navigation Menu</a><span>4</span></li>
    <li class="toc-sub"><a href="#social">Social Links &amp; Footer</a><span>4</span></li>
    <li class="toc-section"><a href="#page">3 &nbsp; Page</a><span>5</span></li>
    <li class="toc-section"><a href="#sections">4 &nbsp; Page Sections</a><span>5</span></li>
    <li class="toc-sub"><a href="#hero">Hero Section</a><span>5</span></li>
    <li class="toc-sub"><a href="#textwithimage">Text with Image Section</a><span>6</span></li>
    <li class="toc-sub"><a href="#icongrid">Icon Grid Section</a><span>7</span></li>
    <li class="toc-sub2"><a href="#card">↳ Card</a><span>8</span></li>
    <li class="toc-sub"><a href="#contact">Contact Section</a><span>9</span></li>
    <li class="toc-sub"><a href="#newslist">News List Section</a><span>10</span></li>
    <li class="toc-sub"><a href="#newspost">News Post</a><span>11</span></li>
    <li class="toc-section"><a href="#reusable">5 &nbsp; Reusable Elements — Button / Link</a><span>12</span></li>
    <li class="toc-section"><a href="#backgrounds">6 &nbsp; Background Styles</a><span>12</span></li>
    <li class="toc-section"><a href="#icons">7 &nbsp; Available Icons</a><span>13</span></li>
    <li class="toc-section"><a href="#tasks">8 &nbsp; Common Tasks</a><span>13</span></li>
  </ul>
</div>

<!-- ══════════════════════════════════════════════════
     1. HOW THE WEBSITE WORKS
══════════════════════════════════════════════════ -->
<h1 class="chapter" id="overview"><span class="num">1</span>How the Website Works</h1>
<p>The website is built from <strong>pages</strong>, and each page is a stack of <strong>sections</strong> you choose and order in Contentful. You pick which sections to include, configure them with text and images, and the website assembles itself automatically.</p>

<div class="diagram">Site Settings ──┬── Announcement Header  (banner at top of every page)
                ├── Navigation Menu ─── Button / Link  (each nav item)
                └── Social Links  (shown in footer)

Page ── Sections ──┬── Hero Section ────────────── Button / Link
                   ├── Text with Image ────────── Button / Link
                   ├── Icon Grid ─────────────┬── Card ── Button / Link
                   │                          └── Button / Link  (bottom of section)
                   ├── Contact Section ──────── Button / Link
                   ├── News List ─────────────── News Post entries
                   └── (News Post pages are auto-routed at /news/[slug])</div>

<p>Two entry types sit outside pages and sections:</p>
<ul>
  <li><strong>Site Settings</strong> — global elements that appear on every page (header, footer, announcement banner).</li>
  <li><strong>Button / Link</strong> — a shared building block reused across all section types and navigation.</li>
</ul>

<!-- ══════════════════════════════════════════════════
     2. GLOBAL ELEMENTS
══════════════════════════════════════════════════ -->
<h1 class="chapter page-break" id="global"><span class="num">2</span>Global Elements (Site Settings)</h1>
<p>Site Settings is a <strong>singleton</strong> entry — there is only one, and it controls what appears on every page.</p>

<figure class="screenshot">
  <img src="${img('01-announcement-and-header')}" alt="Announcement banner and navigation header">
  <figcaption>The announcement banner (top, beige/gold) and sticky navigation header — both controlled via Site Settings.</figcaption>
</figure>

<h2 id="announcement">Announcement Header</h2>
<p>The banner that appears at the very top of every page, above the navigation.</p>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td>Is Active</td><td>Yes/No</td><td>Master on/off switch. Turn off to hide without deleting the entry.</td></tr>
    <tr><td>Text</td><td>Text (markdown)</td><td>The message. <strong>Bold</strong>, <em>italic</em>, and links are supported.</td></tr>
    <tr><td>Link URL</td><td>Text</td><td>Optional URL shown as a clickable link next to the message.</td></tr>
    <tr><td>Link Text</td><td>Text</td><td>Label for the link. Defaults to "Details" if left blank.</td></tr>
    <tr><td>Start Date</td><td>Date</td><td>Banner will not appear before this date.</td></tr>
    <tr><td>End Date</td><td>Date</td><td>Banner automatically disappears after this date.</td></tr>
  </tbody>
</table>
<div class="tip"><strong>Tip:</strong> Use Start/End dates for time-sensitive announcements (food drives, holiday closures). Set them up in advance and they appear and disappear automatically — no manual toggling needed.</div>

<h2 id="navigation">Navigation Menu</h2>
<p>Controls the links in the header navigation bar. Each item in <strong>Menu Items</strong> is a <strong>Button / Link</strong> entry (see Section 5). The <em>Style</em> of each button controls whether it renders as a plain text nav link or as the gold "Contact" button.</p>
<div class="note"><strong>Note:</strong> Any Button / Link with the URL <code>#contact</code> automatically becomes the gold "Contact" button in the navigation, regardless of its Style setting.</div>

<h2 id="social">Social Links &amp; Footer</h2>
<p>Social Links appear as icons in the footer. The footer also shows <strong>Copyright Text</strong> (the current year is prepended automatically) and a <strong>Tagline</strong>, both set in Site Settings.</p>
<table>
  <thead><tr><th>Field</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td>Platform Name</td><td>Facebook, Instagram, YouTube, etc. The icon is selected automatically.</td></tr>
    <tr><td>URL</td><td>Full link to the social media profile. Opens in a new tab.</td></tr>
  </tbody>
</table>

<!-- ══════════════════════════════════════════════════
     3. PAGE
══════════════════════════════════════════════════ -->
<h1 class="chapter page-break" id="page"><span class="num">3</span>Page</h1>
<p>A <strong>Page</strong> entry is the container for a full page on the website.</p>
<table>
  <thead><tr><th>Field</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td>Title</td><td>Internal name — not shown on the website.</td></tr>
    <tr><td>Slug</td><td>The URL path. Use <code>/</code> for the homepage or <code>/news</code> for the news page.</td></tr>
    <tr><td>Sections</td><td>An ordered list of section entries. <strong>Drag to reorder.</strong> Add or remove sections here.</td></tr>
  </tbody>
</table>
<div class="tip"><strong>To add a section:</strong> Open the Page entry → click "Add existing entry" in the Sections field → select or create a section → drag it to the right position → publish.</div>

<!-- ══════════════════════════════════════════════════
     4. PAGE SECTIONS
══════════════════════════════════════════════════ -->
<h1 class="chapter page-break" id="sections"><span class="num">4</span>Page Sections</h1>
<p>Sections are the building blocks of each page. Mix, match, and reorder them freely to compose any page layout.</p>

<!-- Hero -->
<h2 id="hero">Hero Section</h2>
<div class="section-label">Content Type: sectionHero</div>
<p>The large banner that sits at the top of a page. Typically the <em>first</em> section on any page.</p>
<figure class="screenshot">
  <img src="${img('02-hero')}" alt="Hero section with red background, headline, and two buttons">
  <figcaption>Hero with "Red Background" style — headline, description, Primary Button (white outline) and Secondary Button (gold).</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Headline</td><td>Text</td><td>Large bold heading. Keep it short and impactful.</td></tr>
    <tr><td>Description</td><td>Text</td><td>One or two sentences below the headline.</td></tr>
    <tr><td>Primary Button</td><td>Button / Link</td><td>Main call to action (e.g., "Get Help").</td></tr>
    <tr><td>Secondary Button</td><td>Button / Link</td><td>Optional second action (e.g., "Support Us").</td></tr>
    <tr><td>Background Style</td><td>Dropdown</td><td>Controls the section colour/image. See Section 6.</td></tr>
    <tr><td>Background Image</td><td>Image</td><td>Only used when Background Style is <code>Image Background</code>.</td></tr>
  </tbody>
</table>

<!-- Text with Image -->
<h2 id="textwithimage">Text with Image Section</h2>
<div class="section-label">Content Type: sectionTextWithImage</div>
<p>A two-column layout: text block on one side, photo on the other. Ideal for mission statements, program descriptions, or any content that benefits from a visual.</p>
<figure class="screenshot">
  <img src="${img('03-text-with-image')}" alt="Text with image section showing mission text and produce photo">
  <figcaption>"Our Mission" — title, bold lead paragraph, and body text on the left; photo on the right (Image Position: Right).</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Title</td><td>Text</td><td>Section heading (shown in red).</td></tr>
    <tr><td>Lead Paragraph</td><td>Text</td><td>Bold intro sentence displayed above the body text.</td></tr>
    <tr><td>Body</td><td>Rich Text</td><td>Full content. Supports headings, lists, bold, italic, and links.</td></tr>
    <tr><td>Image</td><td>Image</td><td>Photo displayed alongside the text.</td></tr>
    <tr><td>Image Position</td><td>Dropdown</td><td><code>Left</code> or <code>Right</code> — which side the photo appears on.</td></tr>
    <tr><td>Optional Link</td><td>Button / Link</td><td>Optional CTA below the body text.</td></tr>
    <tr><td>Background Style</td><td>Dropdown</td><td><code>Default Background</code> or <code>Beige Background</code>.</td></tr>
  </tbody>
</table>
<div class="tip"><strong>Tip:</strong> Alternate Image Position (Left / Right) across multiple Text with Image sections to create visual rhythm as the visitor scrolls down the page.</div>

<!-- Icon Grid -->
<h2 id="icongrid" class="page-break">Icon Grid Section</h2>
<div class="section-label">Content Type: sectionIconGrid</div>
<p>A section with a centred icon and heading, followed by a row of <strong>Cards</strong>, and an optional button at the bottom. Use it to present a set of related services, options, or calls to action side by side.</p>
<figure class="screenshot">
  <img src="${img('04-icon-grid-get-help')}" alt="Icon Grid section with three cards for food assistance">
  <figcaption>"Need Food Assistance?" — basket icon, lead paragraph, three cards (Eligibility / Hours &amp; Location / Town Hall), bottom button.</figcaption>
</figure>
<figure class="screenshot">
  <img src="${img('05-icon-grid-support')}" alt="Icon Grid section — Support Our Work with three donation cards">
  <figcaption>"Support Our Work" — hand-heart icon, three cards each with their own button (Donate Online / See Needs List / Get Involved).</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Section Icon</td><td>Icon name</td><td>Icon centred above the title. See Section 7 for available names.</td></tr>
    <tr><td>Title</td><td>Text</td><td>Section heading.</td></tr>
    <tr><td>Lead Paragraph</td><td>Text</td><td>Optional intro sentence below the title.</td></tr>
    <tr><td>Grid Items</td><td>Cards</td><td>2–3 Card entries shown in a row. See Card below.</td></tr>
    <tr><td>Optional Bottom Button</td><td>Button / Link</td><td>A button centred below all the cards.</td></tr>
    <tr><td>Background Style</td><td>Dropdown</td><td><code>Default Background</code> or <code>Beige Background</code>.</td></tr>
  </tbody>
</table>
<div class="note"><strong>Grid layout:</strong> 2 cards → displayed side by side. 3 cards → three columns across the full width.</div>

<!-- Card -->
<h2 id="card">Card</h2>
<div class="section-label">Content Type: card</div>
<p>Cards live <em>inside</em> an Icon Grid Section. Each card is a self-contained block with an icon, title, text, and an optional button.</p>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Icon</td><td>Icon name</td><td>Small icon shown at the top of the card. See Section 7.</td></tr>
    <tr><td>Title</td><td>Text</td><td>Card heading (shown in red).</td></tr>
    <tr><td>Description</td><td>Text (markdown)</td><td>Card body. Supports <strong>bold</strong>, <em>italic</em>, and links.</td></tr>
    <tr><td>Optional Button Link</td><td>Button / Link</td><td>An optional action button at the bottom of the card.</td></tr>
  </tbody>
</table>

<!-- Contact -->
<h2 id="contact" class="page-break">Contact Section</h2>
<div class="section-label">Content Type: sectionContact</div>
<p>Displays the organisation's phone number, email address, and a button. Can pull from site-wide contact info in Site Settings, or use custom details.</p>
<figure class="screenshot">
  <img src="${img('06-contact')}" alt="Contact section with mail icon, phone, email and button">
  <figcaption>Mail icon, "Get In Touch" heading, phone and email on separate lines, and a gold "Send Us an Email" button.</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Section Icon</td><td>Icon name</td><td>Icon centred above the title.</td></tr>
    <tr><td>Title</td><td>Text</td><td>Section heading.</td></tr>
    <tr><td>Lead Paragraph</td><td>Text</td><td>One-line intro below the title.</td></tr>
    <tr><td>Contact Info Source</td><td>Dropdown</td><td><code>Custom</code> → uses fields below. Any other → uses Site Settings phone &amp; email.</td></tr>
    <tr><td>Custom Phone</td><td>Text</td><td>Only used when Contact Info Source is <code>Custom</code>.</td></tr>
    <tr><td>Custom Email</td><td>Text</td><td>Only used when Contact Info Source is <code>Custom</code>.</td></tr>
    <tr><td>Button</td><td>Button / Link</td><td>Typically "Send Us an Email". URL is set to <code>mailto:[email]</code> automatically.</td></tr>
    <tr><td>Background Style</td><td>Dropdown</td><td><code>Default Background</code> or <code>Beige Background</code>.</td></tr>
  </tbody>
</table>

<!-- News List -->
<h2 id="newslist">News List Section</h2>
<div class="section-label">Content Type: sectionNewsList</div>
<p>Shows a list or grid preview of News Post entries. Used on the <code>/news</code> page.</p>
<figure class="screenshot">
  <img src="${img('08-news-list')}" alt="News List section showing paginated posts">
  <figcaption>List view: month/year filter dropdown, posts showing date, title, excerpt, and "Read more →" link.</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Title</td><td>Text</td><td>Section heading.</td></tr>
    <tr><td>Lead Paragraph</td><td>Text</td><td>Intro text below the heading.</td></tr>
    <tr><td>Posts</td><td>News Posts</td><td>Link to all News Post entries you want to appear here.</td></tr>
    <tr><td>Display Limit</td><td>Number</td><td>Posts per page in list mode (default: 10).</td></tr>
    <tr><td>Display Style</td><td>Dropdown</td><td><code>List</code> — paginated with month filter. <code>Grid</code> — shows 3 most recent as preview cards.</td></tr>
    <tr><td>Background Style</td><td>Dropdown</td><td><code>Default Background</code> or <code>Beige Background</code>.</td></tr>
  </tbody>
</table>
<p><strong>List view</strong> includes a month/year filter (shown automatically when posts span 2+ months) and Previous/Next pagination.</p>
<p><strong>Grid view</strong> always shows only the 3 most recent posts as cards — no filter, no pagination. Useful as a news preview section on the homepage.</p>

<!-- News Post -->
<h2 id="newspost" class="page-break">News Post</h2>
<div class="section-label">Content Type: newsPost</div>
<p>Each news item is its own entry. When published, it automatically gets its own page at <code>/news/[slug]</code>.</p>
<figure class="screenshot">
  <img src="${img('09-news-post')}" alt="A full news post page">
  <figcaption>Date, title, author byline, bold summary as a blockquote, then rich text body. "← Back to News" always appears at the top.</figcaption>
</figure>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Title</td><td>Text</td><td>The post headline.</td></tr>
    <tr><td>Slug</td><td>Text</td><td>URL identifier — no spaces, use hyphens (e.g., <code>spring-food-drive-2026</code>).</td></tr>
    <tr><td>Summary</td><td>Text</td><td>Short excerpt shown on the list page and as a blockquote at the top of the post.</td></tr>
    <tr><td>Publish Date</td><td>Date</td><td>Displayed on the post. Posts are ordered newest-first in the list.</td></tr>
    <tr><td>Author</td><td>Text</td><td>Displayed below the title (e.g., "Holliston Pantry Shelf").</td></tr>
    <tr><td>Featured Image</td><td>Image</td><td>Optional photo shown at the top of the post page.</td></tr>
    <tr><td>Body</td><td>Rich Text</td><td>Full content. Supports headings, lists, bold, italic, links, and embedded images.</td></tr>
  </tbody>
</table>
<div class="tip"><strong>Slug tip:</strong> Match the headline in lowercase with hyphens. Example: "Spring Food Drive 2026" → <code>spring-food-drive-2026</code>.</div>
<div class="note"><strong>Important:</strong> After publishing a new post, also open the <strong>News List Section</strong> entry, add the post to its <strong>Posts</strong> field, and publish. The post won't appear in the news listing until you do this.</div>

<!-- ══════════════════════════════════════════════════
     5. BUTTON / LINK
══════════════════════════════════════════════════ -->
<h1 class="chapter page-break" id="reusable"><span class="num">5</span>Reusable Elements — Button / Link</h1>
<div class="section-label">Content Type: buttonLink</div>
<p>A shared entry type used everywhere: navigation, hero buttons, card buttons, and section CTAs. You can reuse the same entry in multiple places, or create a new one each time.</p>
<table>
  <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Text Label</td><td>Text</td><td>The visible button or link text.</td></tr>
    <tr><td>URL</td><td>Text</td><td>Destination. Use <code>#section-id</code> for same-page scroll, or a full URL for external links.</td></tr>
    <tr><td>Style</td><td>Dropdown</td><td>Controls the visual appearance (see table below).</td></tr>
    <tr><td>Open in New Tab</td><td>Yes/No</td><td>Set to Yes for external links (donation pages, Google Maps, etc.).</td></tr>
  </tbody>
</table>
<table>
  <thead><tr><th>Style Value</th><th>Appearance</th><th>Best used for</th></tr></thead>
  <tbody>
    <tr><td><code>Primary Button</code></td><td>White with red border &amp; text</td><td>Main CTA on a coloured/dark background</td></tr>
    <tr><td><code>Secondary Button</code></td><td>Gold/beige filled</td><td>Secondary action alongside a Primary Button</td></tr>
    <tr><td><code>Subtle Link</code></td><td>Plain text with → arrow</td><td>Inline links in cards or below text blocks</td></tr>
  </tbody>
</table>

<!-- ══════════════════════════════════════════════════
     6. BACKGROUND STYLES
══════════════════════════════════════════════════ -->
<h1 class="chapter" id="backgrounds"><span class="num">6</span>Background Styles</h1>
<p>Most sections have a <strong>Background Style</strong> field. Use these to create visual separation between consecutive sections without using harsh colours.</p>
<table>
  <thead><tr><th>Value</th><th>Appearance</th><th>Use for</th></tr></thead>
  <tbody>
    <tr><td><code>Default Background</code></td><td>Off-white / light cream</td><td>Most sections</td></tr>
    <tr><td><code>Beige Background</code></td><td>Warm beige</td><td>Alternating sections for visual rhythm</td></tr>
    <tr><td><code>Red Background</code></td><td>Pantry red, white text</td><td>Hero sections only</td></tr>
    <tr><td><code>Gray Background</code></td><td>Neutral grey, white text</td><td>Hero sections only</td></tr>
    <tr><td><code>Image Background</code></td><td>Full-bleed photo with dark overlay</td><td>Hero sections only — requires a Background Image</td></tr>
  </tbody>
</table>
<div class="tip"><strong>Tip:</strong> Alternate between Default Background and Beige Background across your sections to create clean visual separation without harsh contrast.</div>

<!-- ══════════════════════════════════════════════════
     7. ICONS
══════════════════════════════════════════════════ -->
<h1 class="chapter" id="icons"><span class="num">7</span>Available Icons</h1>
<p>Icons are selected by entering the icon name <em>exactly</em> as shown. Used in Icon Grid Sections, Cards, and Contact Sections.</p>
<div class="icon-grid">
  <div class="icon-cell"><strong>ShoppingBasket</strong><span>Shopping basket</span></div>
  <div class="icon-cell"><strong>HandHeart</strong><span>Hand holding a heart</span></div>
  <div class="icon-cell"><strong>Users</strong><span>Two people silhouette</span></div>
  <div class="icon-cell"><strong>Mail</strong><span>Envelope</span></div>
  <div class="icon-cell"><strong>DollarSign</strong><span>Dollar sign $</span></div>
  <div class="icon-cell"><strong>PackageCheck</strong><span>Package with checkmark</span></div>
  <div class="icon-cell"><strong>Apple</strong><span>Apple fruit</span></div>
  <div class="icon-cell"><strong>Info</strong><span>Information circle ⓘ</span></div>
  <div class="icon-cell"><strong>Phone</strong><span>Phone handset</span></div>
</div>

<!-- ══════════════════════════════════════════════════
     8. COMMON TASKS
══════════════════════════════════════════════════ -->
<h1 class="chapter page-break" id="tasks"><span class="num">8</span>Common Tasks</h1>

<h2>Add or update an announcement banner</h2>
<ol class="steps">
  <li>Go to <strong>Site Settings → Announcement Header</strong>.</li>
  <li>Set <strong>Is Active</strong> to Yes. Write the <strong>Text</strong>; add a <strong>Link URL</strong> and <strong>Link Text</strong> if needed.</li>
  <li>Set <strong>Start Date</strong> and <strong>End Date</strong> for automatic show/hide.</li>
  <li>Publish.</li>
</ol>
<div class="tip"><strong>To hide the banner temporarily:</strong> Set <strong>Is Active</strong> to No and publish. The content is preserved for re-enabling later.</div>

<h2>Publish a new news post</h2>
<ol class="steps">
  <li>Create a new <strong>News Post</strong> entry. Fill in Title, Slug, Summary, Publish Date, Author, and Body.</li>
  <li>Publish the News Post entry.</li>
  <li>Open the <strong>News List Section</strong> entry on the news page.</li>
  <li>Add the new post to the <strong>Posts</strong> field.</li>
  <li>Publish the News List Section.</li>
</ol>
<div class="note">The post gets its own URL (<code>/news/[slug]</code>) as soon as it is published, but it won't appear in the news listing until it's added to the News List Section.</div>

<h2>Add a new section to a page</h2>
<ol class="steps">
  <li>Create and publish the new section entry (Hero, Text with Image, Icon Grid, or Contact).</li>
  <li>Open the <strong>Page</strong> entry.</li>
  <li>Click <strong>"Add existing entry"</strong> in the Sections field and select the new section.</li>
  <li>Drag it to the desired position in the list.</li>
  <li>Publish the Page.</li>
</ol>

<h2>Change a navigation link</h2>
<ol class="steps">
  <li>Go to <strong>Site Settings → Navigation Menu → Menu Items</strong>.</li>
  <li>Open the <strong>Button / Link</strong> entry you want to change.</li>
  <li>Update the <strong>Text Label</strong> or <strong>URL</strong>, then publish.</li>
</ol>

<h2>Update the site-wide contact phone or email</h2>
<ol class="steps">
  <li>Go to <strong>Site Settings</strong>.</li>
  <li>Update the <strong>Phone</strong> and <strong>Email</strong> fields and publish.</li>
</ol>
<div class="tip">Any Contact Section using "Site Settings" as its source will reflect the new details automatically — no need to update individual sections.</div>

<h2>Reorder sections on a page</h2>
<ol class="steps">
  <li>Open the <strong>Page</strong> entry.</li>
  <li>In the <strong>Sections</strong> field, drag the section cards into the desired order.</li>
  <li>Publish the Page.</li>
</ol>

</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, 'utf8');
console.log('✓ HTML written (' + Math.round(fs.statSync(OUT_HTML).size / 1024) + ' KB)');

// ── Generate PDF ─────────────────────────────────────────────────────────────
async function generatePDF() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.goto('file://' + OUT_HTML, { waitUntil: 'networkidle0', timeout: 30000 });
  // Allow Google Fonts and layout to settle
  await new Promise(r => setTimeout(r, 2500));
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    margin: { top: '18mm', right: '18mm', bottom: '22mm', left: '18mm' },
    printBackground: true,
    // Cover page overrides margin via @page :first
    displayHeaderFooter: false,
  });
  await browser.close();
  const kb = Math.round(fs.statSync(OUT_PDF).size / 1024);
  console.log('✓ PDF generated: docs/content-editor-guide.pdf (' + kb + ' KB)');
}

generatePDF().catch(e => { console.error(e); process.exit(1); });
