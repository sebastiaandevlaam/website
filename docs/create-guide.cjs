'use strict';

const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  TableOfContents, LevelFormat, ExternalHyperlink
} = require('docx');

// ─── Paths ────────────────────────────────────────────────────────────────────
const BASE   = path.join(__dirname);
const SHOTS  = path.join(BASE, 'screenshots');
const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const OUTPUT = path.join(BASE, 'content-editor-guide.docx');

// ─── Colours ─────────────────────────────────────────────────────────────────
const RED    = 'A00405';
const BEIGE  = 'F0EAD6';
const GOLD   = 'C19A6B';
const TEXT   = '4A4A4A';
const WHITE  = 'FFFFFF';
const GREY   = '888888';
const LGREY  = 'CCCCCC';
const CAPTGREY = '999999';
const TIPBG  = 'FFFBF0';

// ─── Fonts ───────────────────────────────────────────────────────────────────
const HEADING_FONT = 'Nunito Sans';
const BODY_FONT    = 'Open Sans';

// ─── Page geometry (A4) ──────────────────────────────────────────────────────
const PAGE_W     = 11906;
const PAGE_H     = 16838;
const MARGIN     = 1418;   // 2.5 cm
const CONTENT_W  = 9000;   // safe content width

// ─── Screenshot widths (DXA) ─────────────────────────────────────────────────
// Source PNGs are 1280px wide; we scale to CONTENT_W (9000 DXA ≈ 6.25 in)
// But the instructions say 6378 DXA — let's use that as specified
const IMG_W = 6378;
const IMG_HEIGHTS = {
  '01': 1235,
  '02': 3416,
  '03': 2690,
  '04': 3919,
  '05': 3820,
  '06': 2753,
  '08': 3387,
  '09': 3587,
};

// ─── Borders ─────────────────────────────────────────────────────────────────
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: LGREY };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readImg(filename) {
  return fs.readFileSync(path.join(SHOTS, filename));
}

function normalPara(text, opts = {}) {
  return new Paragraph({
    style: 'Normal',
    spacing: { after: 120 },
    children: [new TextRun({ text, font: BODY_FONT, size: 20, color: TEXT, ...opts })],
  });
}

function boldPara(text) {
  return new Paragraph({
    style: 'Normal',
    spacing: { after: 120 },
    children: [new TextRun({ text, font: BODY_FONT, size: 20, color: TEXT, bold: true })],
  });
}

function contentTypePara(ct) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `Content type: ${ct}`, font: BODY_FONT, size: 18, color: GREY, italics: true })],
  });
}

function h1(text, pageBreak = true) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, font: HEADING_FONT, size: 40, bold: true, color: RED })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: HEADING_FONT, size: 28, bold: true, color: RED })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: BODY_FONT, size: 22, bold: true, color: TEXT })],
  });
}

function spacer(size = 120) {
  return new Paragraph({ spacing: { after: size }, children: [] });
}

function screenshot(key, caption) {
  const filename = `${key}-*.jpg`.replace('*', '');  // not used
  // Find actual file
  const files = fs.readdirSync(SHOTS).filter(f => f.startsWith(key));
  if (!files.length) { console.warn(`No screenshot for key ${key}`); return []; }
  const data = fs.readFileSync(path.join(SHOTS, files[0]));
  const h = IMG_HEIGHTS[key];
  return [
    new Paragraph({
      spacing: { after: 60 },
      children: [new ImageRun({
        type: 'jpg',
        data,
        transformation: { width: IMG_W, height: h },
        altText: { title: caption, description: caption, name: `screenshot-${key}` },
      })],
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [new TextRun({ text: caption, font: BODY_FONT, size: 18, italics: true, color: CAPTGREY })],
    }),
  ];
}

// ─── Tip / Note callout ──────────────────────────────────────────────────────
function tipCallout(text) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [200, CONTENT_W - 200],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        children: [
          // Left gold strip
          new TableCell({
            width: { size: 200, type: WidthType.DXA },
            borders: noBorders,
            shading: { fill: GOLD, type: ShadingType.CLEAR },
            children: [new Paragraph({ children: [] })],
          }),
          // Tip text
          new TableCell({
            width: { size: CONTENT_W - 200, type: WidthType.DXA },
            borders: noBorders,
            shading: { fill: TIPBG, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 120 },
            children: [new Paragraph({
              spacing: { after: 0 },
              children: [new TextRun({ text, font: BODY_FONT, size: 20, italics: true, color: TEXT })],
            })],
          }),
        ],
      }),
    ],
  });
}

// ─── Field table builder ─────────────────────────────────────────────────────
function fieldTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  function headerCell(txt, w) {
    return new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: RED, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: txt, font: BODY_FONT, size: 20, bold: true, color: WHITE })],
      })],
    });
  }

  function dataCell(txt, w, isEven) {
    return new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: isEven ? BEIGE : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: txt, font: BODY_FONT, size: 20, color: TEXT })],
      })],
    });
  }

  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, colWidths[i])),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) => dataCell(cell, colWidths[ci], ri % 2 === 1)),
        })
      ),
    ],
  });
}

// ─── Numbered list item ──────────────────────────────────────────────────────
function numberedItem(num, text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: BODY_FONT, size: 20, color: TEXT })],
  });
}

// ─── Cover page (red table filling the page) ─────────────────────────────────
function buildCoverSection() {
  const logoData = fs.readFileSync(path.join(ASSETS, 'hps_logo.png'));

  // Cover table: single cell, full page height minus margins, red bg
  const coverTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: noBorders,
            shading: { fill: RED, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 2880, bottom: 2880, left: 720, right: 720 },
            children: [
              // Logo
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 480 },
                children: [new ImageRun({
                  type: 'png',
                  data: logoData,
                  transformation: { width: 1440, height: 1440 }, // ~1 inch
                  altText: { title: 'Holliston Pantry Shelf Logo', description: 'Logo', name: 'logo' },
                })],
              }),
              // Title
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
                children: [new TextRun({ text: 'Content Editor Guide', font: HEADING_FONT, size: 64, bold: true, color: WHITE })],
              }),
              // Subtitle
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 2160 },
                children: [new TextRun({ text: 'Holliston Pantry Shelf Website', font: HEADING_FONT, size: 36, color: WHITE })],
              }),
              // Date
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [new TextRun({ text: 'March 2026', font: BODY_FONT, size: 20, color: WHITE })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return {
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    children: [
      coverTable,
      new Paragraph({ children: [new PageBreak()] }),
    ],
  };
}

// ─── TOC section ─────────────────────────────────────────────────────────────
function buildTOCSection() {
  return {
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 18, color: GREY })],
        })],
      }),
    },
    children: [
      h1('Table of Contents', false),
      new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new PageBreak()] }),
    ],
  };
}

// ─── Main content section ────────────────────────────────────────────────────
function buildContentSection() {
  const children = [];

  // ══════════════════════════════════════════════════════════════════════
  // CH 1: How the Website Works
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 1: How the Website Works'));
  children.push(normalPara(
    'The website is made up of pages, and each page is composed of a stack of sections. You pick which sections to include, in what order, and Contentful assembles the page automatically. Most sections support a few options (background colour, image position, etc.) that let you vary the visual design without touching code.'
  ));
  children.push(spacer(120));
  children.push(normalPara('Here is how the content types relate to each other:'));
  children.push(spacer(60));

  // Diagram as a monospace block in a shaded table
  const diagramLines = [
    'Site Settings ─── Announcement Header',
    '              ├── Navigation Menu ── Button / Link',
    '              └── Social Link',
    '',
    'Page ── Sections ─── Hero Section ─────────── Button / Link',
    '                 ├── Text with Image ─────── Button / Link',
    '                 ├── Icon Grid ─────────── Card ── Button / Link',
    '                 │                      └── Button / Link (bottom)',
    '                 ├── Contact Section ────── Button / Link',
    '                 ├── News List ─────────── News Post entries',
    '                 └── News Post (auto-routed)',
    '',
    'News Post ── (standalone page at /news/[slug])',
  ];
  const diagramTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
        shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        children: diagramLines.map(line =>
          new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: line, font: 'Courier New', size: 18, color: TEXT })],
          })
        ),
      })],
    })],
  });
  children.push(diagramTable);
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 2: Global Elements (Site Settings)
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 2: Global Elements (Site Settings)'));
  children.push(normalPara(
    'Site Settings is a singleton entry — there is only one, and it controls elements that appear on every page: the announcement banner, the navigation header, and the footer.'
  ));
  children.push(spacer(120));

  // Screenshot 01
  screenshot('01', 'The announcement banner and sticky navigation header — controlled via Site Settings.').forEach(p => children.push(p));

  // Announcement Header
  children.push(h2('Announcement Header'));
  children.push(normalPara(
    'The yellow/beige banner that appears at the very top of the page, above the navigation.'
  ));
  children.push(spacer(120));

  children.push(fieldTable(
    ['Field', 'Type', 'Purpose'],
    [
      ['Is Active', 'Yes/No', 'Master on/off switch. Turn off to hide without deleting the entry.'],
      ['Text', 'Text (markdown)', 'The message. Bold, italic, and links are supported.'],
      ['Link URL', 'Text', 'Optional URL shown as a clickable link next to the message.'],
      ['Link Text', 'Text', 'Label for the link. Defaults to "Details" if left blank.'],
      ['Start Date', 'Date', 'Banner will not appear before this date.'],
      ['End Date', 'Date', 'Banner automatically disappears after this date.'],
    ],
    [1500, 900, CONTENT_W - 1500 - 900]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: Use Start/End dates for time-sensitive announcements (food drives, holiday closures). Set them up in advance and they appear and disappear automatically.'));
  children.push(spacer(180));

  // Navigation Menu
  children.push(h2('Navigation Menu'));
  children.push(normalPara(
    'Controls the links shown in the header navigation bar. Each item in Menu Items is a Button / Link entry (see Chapter 5). The style of each button entry controls whether it appears as a plain nav link, or as the gold Contact button.'
  ));
  children.push(spacer(120));
  children.push(tipCallout('Note: Any Button / Link with URL #contact automatically becomes the gold Contact button in navigation.'));
  children.push(spacer(180));

  // Social Links
  children.push(h2('Social Links'));
  children.push(normalPara('Each Social Link entry appears in the footer.'));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Purpose'],
    [
      ['Platform Name', 'Facebook, Instagram, YouTube, etc. The icon is selected automatically.'],
      ['URL', 'Full link to the social media profile. Opens in a new tab.'],
    ],
    [2000, CONTENT_W - 2000]
  ));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 3: Page
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 3: Page'));
  children.push(normalPara(
    'A Page entry is the container for an entire page on the website. Currently the site has one main page (homepage) and one news listing page.'
  ));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Purpose'],
    [
      ['Title', 'Internal name — not shown on the website.'],
      ['Slug', 'The URL path. Use / for the homepage or /news for the news page.'],
      ['Sections', 'An ordered list of section entries. Drag to reorder. Add or remove sections here.'],
    ],
    [1500, CONTENT_W - 1500]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: To add a section — open the Page entry, click Add existing entry in the Sections field, select or create a section, drag to position, then publish.'));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 4: Page Sections
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 4: Page Sections'));
  children.push(normalPara(
    'Each page is built from a stack of sections. Add, remove, and reorder sections directly in the Page entry. The sections below are the available types.'
  ));
  children.push(spacer(180));

  // Hero Section
  children.push(h2('Hero Section'));
  children.push(contentTypePara('sectionHero'));
  children.push(normalPara(
    'The large banner at the top of a page. Typically the first section on any page. Supports a headline, description, up to two buttons, and various background styles.'
  ));
  children.push(spacer(120));
  screenshot('02', 'Hero with Red Background style — headline, description, and two buttons.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Headline', 'Text', 'Large bold heading. Keep it short and impactful.'],
      ['Description', 'Text', 'One or two sentences below the headline.'],
      ['Primary Button', 'Button / Link', 'Main call to action (e.g., Get Help).'],
      ['Secondary Button', 'Button / Link', 'Optional second action (e.g., Support Us).'],
      ['Background Style', 'Dropdown', 'Controls the section colour/image. See Chapter 6.'],
      ['Background Image', 'Image', 'Only used when Background Style is Image Background.'],
    ],
    [1500, 1200, CONTENT_W - 1500 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: The hero is typically the first section on any page.'));
  children.push(spacer(180));

  // Text with Image
  children.push(h2('Text with Image Section'));
  children.push(contentTypePara('sectionTextWithImage'));
  children.push(normalPara(
    'A two-column section with a block of text on one side and a photo on the other. Great for About Us, mission statements, or any explanatory content.'
  ));
  children.push(spacer(120));
  screenshot('03', 'Our Mission — title, bold lead paragraph, body text and photo side by side.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Title', 'Text', 'Section heading (shown in red).'],
      ['Lead Paragraph', 'Text', 'Bold intro sentence displayed above the body text.'],
      ['Body', 'Rich Text', 'Full content. Supports headings, lists, bold, italic, and links.'],
      ['Image', 'Image', 'Photo displayed alongside the text.'],
      ['Image Position', 'Dropdown', 'Left or Right — which side the photo appears on.'],
      ['Optional Link', 'Button / Link', 'Optional CTA below the body text.'],
      ['Background Style', 'Dropdown', 'Default Background or Beige Background.'],
    ],
    [1500, 1200, CONTENT_W - 1500 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: Alternate Image Position (Left / Right) across multiple Text with Image sections to create visual rhythm as the visitor scrolls down.'));
  children.push(spacer(180));

  // Icon Grid Section
  children.push(h2('Icon Grid Section'));
  children.push(contentTypePara('sectionIconGrid'));
  children.push(normalPara(
    'A section with an icon and heading at the top, followed by a grid of Cards, and an optional button at the bottom. Use this to present a set of related options, services, or calls to action side by side.'
  ));
  children.push(spacer(120));
  screenshot('04', 'Need Food Assistance? — icon, heading, three cards and a bottom button.').forEach(p => children.push(p));
  screenshot('05', 'Support Our Work — three cards each with their own call-to-action button.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Section Icon', 'Icon name', 'Icon centred above the title. See Chapter 7 for available names.'],
      ['Title', 'Text', 'Section heading.'],
      ['Lead Paragraph', 'Text', 'Optional intro sentence below the title.'],
      ['Grid Items', 'Cards', '2-3 Card entries shown in a row. See Card below.'],
      ['Optional Bottom Button', 'Button / Link', 'A button centred below all the cards.'],
      ['Background Style', 'Dropdown', 'Default Background or Beige Background.'],
    ],
    [1800, 1200, CONTENT_W - 1800 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Note: Grid layout — 2 cards displays side by side. 3 cards displays three columns across the full width.'));
  children.push(spacer(180));

  // Card
  children.push(h3('Card'));
  children.push(normalPara('Cards live inside an Icon Grid Section. Each card is a self-contained content block.'));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Icon', 'Icon name', 'Small icon shown at the top of the card. See Chapter 7.'],
      ['Title', 'Text', 'Card heading (shown in red).'],
      ['Description', 'Text (markdown)', 'Card body. Supports bold, italic, and links.'],
      ['Optional Button Link', 'Button / Link', 'An optional action button at the bottom of the card.'],
    ],
    [1800, 1200, CONTENT_W - 1800 - 1200]
  ));
  children.push(spacer(180));

  // Contact Section
  children.push(h2('Contact Section'));
  children.push(contentTypePara('sectionContact'));
  children.push(normalPara(
    'Displays the organisation\'s phone number, email address, and a Send Email button. Can use the site-wide contact info from Site Settings, or a custom phone/email for a specific context.'
  ));
  children.push(spacer(120));
  screenshot('06', 'Get In Touch — icon, contact details, and email button.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Section Icon', 'Icon name', 'Icon centred above the title.'],
      ['Title', 'Text', 'Section heading.'],
      ['Lead Paragraph', 'Text', 'One-line intro below the title.'],
      ['Contact Info Source', 'Dropdown', 'Custom uses fields below. Any other pulls from Site Settings.'],
      ['Custom Phone', 'Text', 'Only used when Contact Info Source is Custom.'],
      ['Custom Email', 'Text', 'Only used when Contact Info Source is Custom.'],
      ['Button', 'Button / Link', 'Typically Send Us an Email. URL set to mailto:[email] automatically.'],
      ['Background Style', 'Dropdown', 'Default Background or Beige Background.'],
    ],
    [1800, 1200, CONTENT_W - 1800 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: Any Contact Section using Site Settings as its source updates automatically when you change the site-wide phone/email — no need to update individual sections.'));
  children.push(spacer(180));

  // News List Section
  children.push(h2('News List Section'));
  children.push(contentTypePara('sectionNewsList'));
  children.push(normalPara(
    'Shows a list or grid preview of News Post entries. Used on the /news page.'
  ));
  children.push(spacer(120));
  screenshot('08', 'News list with month filter, paginated post entries and Read more links.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Title', 'Text', 'Section heading.'],
      ['Lead Paragraph', 'Text', 'Intro text below the heading.'],
      ['Posts', 'News Posts', 'Link to all News Post entries you want to appear here.'],
      ['Display Limit', 'Number', 'Posts per page in list mode (default: 10).'],
      ['Display Style', 'Dropdown', 'List — paginated with month filter. Grid — shows 3 most recent as preview cards.'],
      ['Background Style', 'Dropdown', 'Default Background or Beige Background.'],
    ],
    [1800, 1200, CONTENT_W - 1800 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: Use Grid display style to show 3 recent posts as a preview on the homepage, and List display style on the dedicated news page.'));
  children.push(spacer(180));

  // News Post
  children.push(h2('News Post'));
  children.push(contentTypePara('newsPost'));
  children.push(normalPara(
    'Each news item is its own News Post entry. When you publish a post, it automatically gets its own page at /news/[slug].'
  ));
  children.push(spacer(120));
  screenshot('09', 'A full news post: date, title, author, summary blockquote, and body.').forEach(p => children.push(p));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Title', 'Text', 'The post headline.'],
      ['Slug', 'Text', 'URL identifier — no spaces, use hyphens (e.g., spring-food-drive-2026).'],
      ['Summary', 'Text', 'Short excerpt shown on the list page and as a blockquote at the top of the post.'],
      ['Publish Date', 'Date', 'Displayed on the post. Posts are ordered newest-first in the list.'],
      ['Author', 'Text', 'Displayed below the title (e.g., Holliston Pantry Shelf).'],
      ['Featured Image', 'Image', 'Optional photo shown at the top of the post page.'],
      ['Body', 'Rich Text', 'Full content. Supports headings, lists, bold, italic, links, and embedded images.'],
    ],
    [1500, 1200, CONTENT_W - 1500 - 1200]
  ));
  children.push(spacer(120));
  children.push(tipCallout('Tip: Slug tip — match the headline in lowercase with hyphens. Example: Spring Food Drive 2026 becomes spring-food-drive-2026.'));
  children.push(spacer(120));
  children.push(tipCallout('Important: After publishing a new post, also open the News List Section entry, add the post to its Posts field, and publish. The post won\'t appear in the news listing until you do this.'));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 5: Button / Link
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 5: Reusable Elements — Button / Link'));
  children.push(normalPara(
    'A shared entry type used in many places: navigation, hero buttons, card buttons, and section CTAs. You can reuse the same Button / Link entry in multiple places, or create a new one each time.'
  ));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Field', 'Type', 'Notes'],
    [
      ['Text Label', 'Text', 'The visible button or link text.'],
      ['URL', 'Text', 'Destination. Use #section-id for same-page scroll, or a full URL for external links.'],
      ['Style', 'Dropdown', 'Controls the visual appearance (see table below).'],
      ['Open in New Tab', 'Yes/No', 'Set to Yes for external links (donation pages, Google Maps, etc.).'],
    ],
    [1500, 1200, CONTENT_W - 1500 - 1200]
  ));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Style Value', 'Appearance', 'Best used for'],
    [
      ['Primary Button', 'White with red border and text', 'Main CTA on a coloured/dark background'],
      ['Secondary Button', 'Gold/beige filled', 'Secondary action alongside a Primary Button'],
      ['Subtle Link', 'Plain text with arrow', 'Inline links in cards or below text blocks'],
    ],
    [1800, 2000, CONTENT_W - 1800 - 2000]
  ));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 6: Background Styles
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 6: Background Styles'));
  children.push(normalPara(
    'Most sections have a Background Style field. Use these to create visual separation between sections:'
  ));
  children.push(spacer(120));
  children.push(fieldTable(
    ['Value', 'Appearance', 'Use for'],
    [
      ['Default Background', 'Off-white / light cream', 'Most sections'],
      ['Beige Background', 'Warm beige', 'Alternating sections for visual rhythm'],
      ['Red Background', 'Pantry red, white text', 'Hero sections only'],
      ['Gray Background', 'Neutral grey, white text', 'Hero sections only'],
      ['Image Background', 'Full-bleed photo with dark overlay', 'Hero sections only — requires a Background Image'],
    ],
    [2000, 2000, CONTENT_W - 2000 - 2000]
  ));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 7: Available Icons
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 7: Available Icons'));
  children.push(normalPara(
    'Icons are selected by entering the icon name exactly as shown. Used in Icon Grid Sections, Cards, and Contact Sections.'
  ));
  children.push(spacer(120));

  // Icon table with actual rendered icon images
  const ICON_DIR = path.join(BASE, 'screenshots', 'icons');
  const ICON_COL_IMG  = 800;   // image cell
  const ICON_COL_NAME = 2200;  // name cell
  const ICON_COL_DESC = CONTENT_W - ICON_COL_IMG - ICON_COL_NAME; // 6000
  const ICON_SIZE_DXA = 504;   // display size (~0.35 inch square)

  const iconData = [
    ['ShoppingBasket', 'Shopping basket'],
    ['HandHeart',      'Hand holding a heart'],
    ['Users',          'Two people silhouette'],
    ['Mail',           'Envelope'],
    ['DollarSign',     'Dollar sign $'],
    ['PackageCheck',   'Package with checkmark'],
    ['Apple',          'Apple fruit'],
    ['Info',           'Information circle'],
    ['Phone',          'Phone handset'],
  ];

  function iconImageCell(iconName, isEven) {
    const imgData = fs.readFileSync(path.join(ICON_DIR, iconName + '.png'));
    return new TableCell({
      width: { size: ICON_COL_IMG, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: isEven ? BEIGE : WHITE, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new ImageRun({
          type: 'png',
          data: imgData,
          transformation: { width: ICON_SIZE_DXA, height: ICON_SIZE_DXA },
          altText: { title: iconName, description: iconName + ' icon', name: iconName },
        })],
      })],
    });
  }

  function iconTextCell(text, width, isEven, bold = false) {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: cellBorders,
      shading: { fill: isEven ? BEIGE : WHITE, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text, font: BODY_FONT, size: 20, color: TEXT, bold })],
      })],
    });
  }

  children.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [ICON_COL_IMG, ICON_COL_NAME, ICON_COL_DESC],
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: ICON_COL_IMG, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: RED, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Icon', font: BODY_FONT, size: 20, bold: true, color: WHITE })] })],
          }),
          new TableCell({
            width: { size: ICON_COL_NAME, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: RED, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Icon Name', font: BODY_FONT, size: 20, bold: true, color: WHITE })] })],
          }),
          new TableCell({
            width: { size: ICON_COL_DESC, type: WidthType.DXA },
            borders: cellBorders,
            shading: { fill: RED, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Description', font: BODY_FONT, size: 20, bold: true, color: WHITE })] })],
          }),
        ],
      }),
      // Data rows
      ...iconData.map(([name, desc], ri) => new TableRow({
        children: [
          iconImageCell(name, ri % 2 === 1),
          iconTextCell(name, ICON_COL_NAME, ri % 2 === 1, true),
          iconTextCell(desc, ICON_COL_DESC, ri % 2 === 1),
        ],
      })),
    ],
  }));
  children.push(spacer(180));

  // ══════════════════════════════════════════════════════════════════════
  // CH 8: Common Tasks
  // ══════════════════════════════════════════════════════════════════════
  children.push(h1('Chapter 8: Common Tasks'));
  children.push(normalPara('Step-by-step instructions for the most common content operations.'));
  children.push(spacer(180));

  // Task 1
  children.push(h2('Add or update an announcement banner'));
  [
    '1. Go to Site Settings > Announcement Header.',
    '2. Set Is Active to Yes. Write the Text; add a Link URL and Link Text if needed.',
    '3. Set Start Date and End Date for automatic show/hide.',
    '4. Publish.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(60));
  children.push(tipCallout('Tip: To hide the banner temporarily, set Is Active to No and publish. The content is preserved for re-enabling later.'));
  children.push(spacer(180));

  // Task 2
  children.push(h2('Publish a new news post'));
  [
    '1. Create a new News Post entry. Fill in Title, Slug, Summary, Publish Date, Author, and Body.',
    '2. Publish the News Post entry.',
    '3. Open the News List Section entry on the news page.',
    '4. Add the new post to the Posts field.',
    '5. Publish the News List Section.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(60));
  children.push(tipCallout('Note: The post gets its own URL (/news/[slug]) when published, but won\'t appear in the listing until added to the News List Section.'));
  children.push(spacer(180));

  // Task 3
  children.push(h2('Add a new section to a page'));
  [
    '1. Create and publish the new section entry.',
    '2. Open the Page entry.',
    '3. Click Add existing entry in the Sections field and select the new section.',
    '4. Drag it to the desired position.',
    '5. Publish the Page.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(180));

  // Task 4
  children.push(h2('Change a navigation link'));
  [
    '1. Go to Site Settings > Navigation Menu > Menu Items.',
    '2. Open the Button / Link entry you want to change.',
    '3. Update the Text Label or URL, then publish.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(180));

  // Task 5
  children.push(h2('Update the site-wide contact phone or email'));
  [
    '1. Go to Site Settings.',
    '2. Update the Phone and Email fields and publish.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(60));
  children.push(tipCallout('Tip: Any Contact Section using Site Settings as its source will reflect the new details automatically.'));
  children.push(spacer(180));

  // Task 6
  children.push(h2('Reorder sections on a page'));
  [
    '1. Open the Page entry.',
    '2. In the Sections field, drag the section cards into the desired order.',
    '3. Publish the Page.',
  ].forEach(step => children.push(normalPara(step)));
  children.push(spacer(180));

  return {
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 18, color: GREY })],
        })],
      }),
    },
    children,
  };
}

// ─── Assemble & write ────────────────────────────────────────────────────────
async function main() {
  console.log('Building document...');

  const doc = new Document({
    creator: 'Holliston Pantry Shelf',
    title: 'Content Editor Guide',
    description: 'Guide for content editors of the Holliston Pantry Shelf website',
    numbering: {
      config: [
        {
          reference: 'numbers',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: BODY_FONT, size: 20, color: TEXT } },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 40, bold: true, font: HEADING_FONT, color: RED },
          paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: HEADING_FONT, color: RED },
          paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, font: BODY_FONT, color: TEXT },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
        },
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: BODY_FONT, size: 20, color: TEXT },
          paragraph: { spacing: { after: 120 } },
        },
      ],
    },
    sections: [
      buildCoverSection(),
      buildTOCSection(),
      buildContentSection(),
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`Written: ${OUTPUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
