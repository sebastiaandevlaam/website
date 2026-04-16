// Uses puppeteer to capture section screenshots from the running dev server.
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173';
const OUT = new URL('./screenshots/', import.meta.url).pathname;

function chrome(args) {
  execSync(`"${CHROME}" ${args}`, { stdio: 'pipe' });
}

// Puppeteer-free approach: use Chrome headless with --screenshot
// But that only does full-page. Instead use a JS snippet via --run-automation-test
// Better: write temp HTML that embeds the live page via iframe... not ideal either.
// Use: chrome --headless=new --screenshot with specific clip via --window-size
// We'll use node + CDP (Chrome DevTools Protocol) via fetch to /json/new then screenshot

// Simplest working approach on macOS without extra deps:
// Use `screencapture` of the Chrome window after navigating
// Actually let's just use puppeteer via npx

// Check if puppeteer is available locally
const hasPuppeteer = existsSync(
  new URL('../node_modules/puppeteer', import.meta.url).pathname
);

if (!hasPuppeteer) {
  console.log('Installing puppeteer (one-time)...');
  execSync('npm install --save-dev puppeteer', {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'inherit',
  });
}

const { default: puppeteer } = await import(
  new URL('../node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js', import.meta.url)
    .pathname
);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

async function shot(name, url, scrollY = 0, clipHeight = 900) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: `${OUT}${name}.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: 0, y: 0, width: 1280, height: clipHeight },
  });
  console.log(`✓ ${name}.jpg`);
}

// Homepage sections
await shot('01-header-nav',      BASE, 0,    220);
await shot('02-announcement',    BASE, 0,     60);
await shot('03-hero',            BASE, 0,    700);
await shot('04-text-with-image', BASE, 580,  680);
await shot('05-icon-grid-get-help', BASE, 1100, 680);
await shot('06-icon-grid-support',  BASE, 2011, 680);
await shot('07-contact',            BASE, 2700, 680);
await shot('08-footer',             BASE, 3200, 200);

// News pages
await shot('09-news-list', `${BASE}/news`, 0, 700);
await shot('10-news-post', `${BASE}/news/spring-food-drive-2026`, 0, 700);

await browser.close();
console.log('\nAll screenshots saved to docs/screenshots/');
