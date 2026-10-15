// Scribe-style annotation helpers shared by the capture scripts: outline one
// element in orange, then take a screenshot cropped around it.

export const HIGHLIGHT = '#FF6B1A';

// Draws the outline on top of the page. `pad` is the gap between the element
// and the outline.
export async function highlight(page, handle, { pad = 6 } = {}) {
  await handle.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await new Promise(r => setTimeout(r, 250));
  const box = await handle.boundingBox();
  if (!box) return null;
  await page.evaluate(({ x, y, width, height, pad, color }) => {
    document.querySelectorAll('.__guide-mark').forEach(n => n.remove());
    const mark = document.createElement('div');
    mark.className = '__guide-mark';
    Object.assign(mark.style, {
      position: 'absolute',
      left: `${x + window.scrollX - pad}px`,
      top: `${y + window.scrollY - pad}px`,
      width: `${width + pad * 2}px`,
      height: `${height + pad * 2}px`,
      border: `3px solid ${color}`,
      borderRadius: '10px',
      background: 'rgba(255, 107, 26, 0.08)',
      boxShadow: '0 0 0 4px rgba(255, 107, 26, 0.18)',
      zIndex: 2147483647,
      pointerEvents: 'none',
    });
    document.body.appendChild(mark);
  }, { ...box, pad, color: HIGHLIGHT });
  return box;
}

export async function clearHighlight(page) {
  await page.evaluate(() => document.querySelectorAll('.__guide-mark').forEach(n => n.remove()));
}

// Screenshot of the visible viewport, optionally cropped to a band around
// the highlighted box so the reader's eye lands on it.
export async function shoot(page, path, box, { band = 520 } = {}) {
  const vp = page.viewport();
  // boundingBox() is relative to the viewport, but a screenshot clip is
  // relative to the document, so add the scroll offset.
  const scrollY = await page.evaluate(() => window.scrollY);
  let clip = { x: 0, y: scrollY, width: vp.width, height: vp.height };
  if (box && band < vp.height) {
    const centre = box.y + box.height / 2;
    const top = Math.max(0, Math.min(vp.height - band, centre - band / 2));
    clip = { x: 0, y: scrollY + top, width: vp.width, height: band };
  }
  await page.screenshot({ path, type: 'jpeg', quality: 82, clip });
  console.log('✓', path.split('/').pop());
}

// First element whose own visible text is exactly `text` (case-insensitive),
// optionally within `selector`. Text is more stable than class names.
export async function byText(page, text, selector = '*') {
  const handle = await page.evaluateHandle((text, selector) => {
    const want = text.trim().toLowerCase();
    const els = [...document.querySelectorAll(selector)].filter(el => {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim().toLowerCase();
      return (own === want || el.innerText?.trim().toLowerCase() === want) && el.offsetParent !== null;
    });
    // The innermost match is the label itself, not its container.
    return els.sort((a, b) => a.innerText.length - b.innerText.length)[0] || null;
  }, text, selector);
  return handle.asElement();
}
