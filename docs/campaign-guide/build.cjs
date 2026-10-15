// Builds the campaign guide: campaign-guide.html (standalone), an artifact
// fragment (same page without the document skeleton) and campaign-guide.pdf.
//
//   node docs/campaign-guide/build.cjs
//
// Content lives in content-*.cjs; screenshots come from GUIDE_SCREENS
// (default ./screens). A missing screenshot becomes a labelled placeholder, so
// the guide builds before the Contentful screens are captured.

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SCREENS = process.env.GUIDE_SCREENS || path.join(HERE, 'screens');
const OUT = process.env.GUIDE_OUT || HERE;
fs.mkdirSync(OUT, { recursive: true });

// ── Helpers used by the content files ──────────────────────────────────────
const missing = [];

function shot(file, caption) {
  const p = path.join(SCREENS, file);
  const cap = caption ? `<figcaption>${caption}</figcaption>` : '';
  if (!fs.existsSync(p)) {
    missing.push(file);
    return `<figure class="shot placeholder"><div><b>Screenshot coming</b><span>${caption || file}</span></div></figure>`;
  }
  const data = fs.readFileSync(p).toString('base64');
  return `<figure class="shot"><img src="data:image/jpeg;base64,${data}" alt="${(caption || '').replace(/<[^>]+>/g, '').replace(/"/g, '&quot;')}" loading="lazy">${cap}</figure>`;
}

// One numbered step. `n` is shown in the badge.
const step = (n, title, body, image = '') => `
<li class="step">
  <div class="step-head"><span class="badge">${n}</span><h4>${title}</h4></div>
  <div class="step-body">${body}${image}</div>
</li>`;

const steps = (...items) => `<ol class="steps">${items.join('')}</ol>`;
const tip = (html) => `<aside class="note tip"><b>Tip</b><div>${html}</div></aside>`;
const warn = (html) => `<aside class="note warn"><b>Important</b><div>${html}</div></aside>`;
const table = (head, rows) => `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const copy = (text) => `<span class="copy"><code>${text}</code><button type="button" data-copy="${text}">Copy</button></span>`;

const helpers = { shot, step, steps, tip, warn, table, copy };
const chapters = [
  ...require('./content-1.cjs')(helpers),
  ...require('./content-2.cjs')(helpers),
  ...require('./content-3.cjs')(helpers),
];

// ── Page ───────────────────────────────────────────────────────────────────
const style = ['guide.css', 'print.css'].map(f => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
const logo = fs.readFileSync(path.join(HERE, '..', '..', 'src', 'assets', 'hps_logo.png')).toString('base64');
const edition = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const toc = chapters.map(c => `<li><a href="#${c.id}">${c.title}</a></li>`).join('');
// Print only: a cover and a contents page. Page numbers are filled in by the
// PDF step below, which measures where each chapter lands.
const printCover = `<section class="print-only print-cover">
  <div class="band">
    <div class="logo"><img src="data:image/png;base64,${logo}" alt="Holliston Pantry Shelf"></div>
    <p class="kicker">Website guide for Contentful editors</p>
    <h1>Running a paid campaign</h1>
    <p class="sub">Set up, open, run and close a Duck Drop or a ticket sale on the pantry website, step by step.</p>
  </div>
  <div class="meta">
    <div><b>Covers</b><span>Numbered campaigns (Duck Drop) and event tickets</span></div>
    <div><b>You need</b><span>Contentful editor access and the pantry's Google Drive</span></div>
    <div><b>Edition</b><span>${edition}</span></div>
    <div><b>Website</b><span>hollistonpantryshelf.org</span></div>
  </div>
  <div class="stripe"></div>
</section>`;
const printToc = `<nav class="print-only print-toc" aria-label="Contents"><h2>Contents</h2><ol>${chapters.map((c, i) => `
  <li><a href="#${c.id}"><span class="n">${i + 1}</span><span class="t">${c.title}</span><span class="p" data-page-for="${c.id}"></span><span class="d">${c.eyebrow}</span></a></li>`).join('')}
</ol></nav>`;

const body = chapters.map(c => `
<section class="chapter" id="${c.id}">
  <p class="eyebrow">${c.eyebrow}</p>
  <h2>${c.title}</h2>
  ${c.html}
</section>`).join('');

const head = `<title>Running a Paid Campaign</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@600;700;800&family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap">
<style>${style}</style>`;

const page = `<div class="layout">
  ${printCover}
  ${printToc}
  <header class="cover">
    <p class="eyebrow">Holliston Pantry Shelf · Website guide</p>
    <h1>Running a paid campaign</h1>
    <p class="lede">How to set up, open, run and close a Duck Drop or ticket sale on the website, step by step. Written for Contentful editors; no technical knowledge needed.</p>
  </header>
  <nav class="toc" aria-label="Contents"><p class="toc-title">Contents</p><ol>${toc}</ol></nav>
  <main>${body}</main>
  <footer class="end">Questions about this guide or the website? Ask the website administrator.</footer>
</div>
<script>
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = 'Copied'; }
  catch { const r = document.createRange(); r.selectNodeContents(btn.previousElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; }
  setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
});
</script>`;

// The artifact host adds its own document skeleton; the standalone file needs one.
const fragment = head + page;
const full = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${head}</head>
<body>${page}</body></html>`;

fs.writeFileSync(path.join(OUT, 'campaign-guide.html'), full);
fs.writeFileSync(path.join(OUT, 'campaign-guide.artifact.html'), fragment);
console.log('✓ campaign-guide.html', (full.length / 1e6).toFixed(1) + ' MB');

if (missing.length) console.log(`  ${missing.length} screenshots still to capture: ${missing.join(', ')}`);

// ── PDF ────────────────────────────────────────────────────────────────────
// Chrome cannot put page numbers in a contents list by itself, so each
// chapter is first printed on its own to count its pages (every chapter
// starts on a new page, so the counts add up), then the full PDF is printed
// with the numbers filled in.
const pageCount = (pdf) => Math.max(...[...Buffer.from(pdf).toString('latin1').matchAll(/\/Count (\d+)/g)].map(m => Number(m[1])));

if (!process.argv.includes('--no-pdf')) {
  (async () => {
    const puppeteer = require(path.join(HERE, '..', '..', 'node_modules', 'puppeteer-core'));
    const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const tab = await browser.newPage();
    const load = async () => {
      await tab.setContent(full, { waitUntil: 'load', timeout: 120000 });
      await tab.evaluate(() => document.fonts.ready);
    };
    const print = (file) => tab.pdf({ ...(file ? { path: file } : {}), preferCSSPageSize: true, printBackground: true });

    await load();
    // Cover and contents: measured too, in case the contents ever spill over.
    await tab.evaluate(() => document.querySelectorAll('main, .chapter').forEach(el => el.remove()));
    let next = pageCount(await print()) + 1;
    const starts = {};
    for (const { id } of chapters) {
      await load();
      await tab.evaluate((keep) => {
        document.querySelectorAll('.print-only').forEach(el => el.remove());
        document.querySelectorAll('.chapter').forEach(el => { if (el.id !== keep) el.remove(); });
      }, id);
      starts[id] = next;
      next += pageCount(await print());
    }

    await load();
    await tab.evaluate((starts) => {
      document.querySelectorAll('[data-page-for]').forEach(el => { el.textContent = starts[el.dataset.pageFor]; });
    }, starts);
    await print(path.join(OUT, 'campaign-guide.pdf'));
    await browser.close();
    console.log(`✓ campaign-guide.pdf (${next - 1} pages)`);
  })();
}
