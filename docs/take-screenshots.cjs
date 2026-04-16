/**
 * Screenshot script for the content editor guide.
 *
 * Strategy: render at a very tall viewport (1280 × 6000) so the entire page
 * fits without scrolling. That means clip coordinates = document coordinates,
 * and position:sticky / position:fixed elements behave predictably.
 * We capture the header in context for the first shot, then clip each section
 * directly (no header in frame) for cleaner section references.
 */

const puppeteer = require(require('path').join(__dirname, '..', 'node_modules', 'puppeteer-core'));
const path = require('path');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, 'screenshots');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  // ── Helper: shoot a clipped region from a tall-viewport page ──────────────
  async function shoot(name, url, clipFn, viewW = 1280, viewH = 6000) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewW, height: viewH });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait for images to fully render
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map(img =>
          img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
        )
      );
    });
    await new Promise(r => setTimeout(r, 600));

    const clip = await page.evaluate(clipFn);
    await page.screenshot({
      path: path.join(OUT, name + '.jpg'),
      type: 'jpeg',
      quality: 92,
      clip,
    });
    await page.close();
    console.log('✓ ' + name + '.jpg  (y=' + clip.y + ', h=' + clip.height + ')');
  }

  // ── 1. Announcement banner + header (in-context, from very top) ───────────
  await shoot('01-announcement-and-header', BASE, () => {
    const header = document.querySelector('.header');
    const announce = document.querySelector('.announcement-header');
    const top = announce ? announce.getBoundingClientRect().top + window.scrollY : 0;
    const bottom = header
      ? header.getBoundingClientRect().bottom + window.scrollY
      : 220;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(bottom - top) };
  });

  // ── 2. Hero — include header for context ──────────────────────────────────
  await shoot('02-hero', BASE, () => {
    const hero = document.querySelector('.hero-section');
    const announce = document.querySelector('.announcement-header');
    const top = announce
      ? announce.getBoundingClientRect().top + window.scrollY
      : 0;
    const bottom = hero
      ? hero.getBoundingClientRect().bottom + window.scrollY
      : 700;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(bottom - top) };
  });

  // ── 3. Text with Image ────────────────────────────────────────────────────
  await shoot('03-text-with-image', BASE, () => {
    const section = document.querySelector('.text-image-section');
    if (!section) return { x: 0, y: 600, width: 1280, height: 600 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(rect.height) };
  });

  // ── 4. Icon Grid — first one (Get Help / Need Food Assistance?) ───────────
  await shoot('04-icon-grid-get-help', BASE, () => {
    const sections = document.querySelectorAll('.icon-grid-section');
    const section = sections[0];
    if (!section) return { x: 0, y: 1200, width: 1280, height: 700 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(rect.height) };
  });

  // ── 5. Icon Grid — second one (Support Our Work) ──────────────────────────
  await shoot('05-icon-grid-support', BASE, () => {
    const sections = document.querySelectorAll('.icon-grid-section');
    const section = sections[1];
    if (!section) return { x: 0, y: 2000, width: 1280, height: 700 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(rect.height) };
  });

  // ── 6. Contact section ────────────────────────────────────────────────────
  await shoot('06-contact', BASE, () => {
    const section = document.querySelector('.contact-section');
    if (!section) return { x: 0, y: 2700, width: 1280, height: 550 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(rect.height) };
  });

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  await shoot('07-footer', BASE, () => {
    const footer = document.querySelector('footer') || document.querySelector('.footer');
    if (!footer) return { x: 0, y: 3200, width: 1280, height: 200 };
    const rect = footer.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.round(rect.height) };
  });

  // ── 8. News List ──────────────────────────────────────────────────────────
  await shoot('08-news-list', BASE + '/news', () => {
    const section = document.querySelector('.news-list-section');
    if (!section) return { x: 0, y: 160, width: 1280, height: 700 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    // Cap height so we don't show too many posts
    return { x: 0, y: Math.round(top), width: 1280, height: Math.min(Math.round(rect.height), 680) };
  });

  // ── 9. News Post ──────────────────────────────────────────────────────────
  await shoot('09-news-post', BASE + '/news/spring-food-drive-2026', () => {
    const section = document.querySelector('.news-post-section');
    if (!section) return { x: 0, y: 160, width: 1280, height: 700 };
    const rect = section.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { x: 0, y: Math.round(top), width: 1280, height: Math.min(Math.round(rect.height), 720) };
  });

  await browser.close();
  console.log('\nAll screenshots saved to docs/screenshots/');
}

main().catch(e => { console.error(e); process.exit(1); });
