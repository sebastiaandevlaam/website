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
const style = fs.readFileSync(path.join(HERE, 'guide.css'), 'utf8');

const toc = chapters.map(c => `<li><a href="#${c.id}">${c.title}</a></li>`).join('');
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
if (!process.argv.includes('--no-pdf')) {
  (async () => {
    const puppeteer = require(path.join(HERE, '..', '..', 'node_modules', 'puppeteer-core'));
    const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const tab = await browser.newPage();
    await tab.setContent(full, { waitUntil: 'load', timeout: 120000 });
    await tab.evaluate(() => document.fonts.ready);
    await tab.pdf({
      path: path.join(OUT, 'campaign-guide.pdf'), format: 'Letter', printBackground: true,
      margin: { top: '0.6in', bottom: '0.7in', left: '0.6in', right: '0.6in' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">Running a paid campaign · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    await browser.close();
    console.log('✓ campaign-guide.pdf');
  })();
}
