/**
 * Renders each Lucide icon as a PNG using puppeteer + a local HTML page.
 * Outputs 80x80 PNGs to docs/screenshots/icons/
 */
const puppeteer = require(require('path').join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, 'screenshots', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const ICONS = [
  'ShoppingBasket',
  'HandHeart',
  'Users',
  'Mail',
  'DollarSign',
  'PackageCheck',
  'Apple',
  'Info',
  'Phone',
];

// Build a self-contained HTML page that renders all icons using lucide via CDN
const iconHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
  .icon-wrap {
    width: 80px; height: 80px;
    display: flex; align-items: center; justify-content: center;
    background: white;
  }
  svg { width: 44px; height: 44px; stroke: #A00405; stroke-width: 1.75; fill: none; }
</style>
</head>
<body>
${ICONS.map(name => `<div class="icon-wrap" id="${name}"></div>`).join('\n')}
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>
  lucide.createIcons();
  ${ICONS.map(name => {
    // Convert PascalCase to kebab-case for lucide data attribute
    const kebab = name.replace(/([A-Z])/g, (m, l, i) => (i === 0 ? '' : '-') + l.toLowerCase());
    return `document.getElementById('${name}').innerHTML = '<i data-lucide="${kebab}"></i>';`;
  }).join('\n  ')}
  lucide.createIcons();
</script>
</body>
</html>`;

const HTML_PATH = path.join(__dirname, '_icons_tmp.html');
fs.writeFileSync(HTML_PATH, iconHtml);

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1200 });
  await page.goto('file://' + HTML_PATH, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 800));

  for (const name of ICONS) {
    const el = await page.$(`#${name}`);
    if (!el) { console.error('Missing:', name); continue; }
    await el.screenshot({
      path: path.join(OUT, name + '.png'),
      type: 'png',
      omitBackground: false,
    });
    console.log('✓ ' + name + '.png');
  }

  await browser.close();
  fs.unlinkSync(HTML_PATH);
  console.log('\nIcons saved to docs/screenshots/icons/');
}

main().catch(e => { console.error(e); process.exit(1); });
