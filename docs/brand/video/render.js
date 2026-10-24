// Captures promo.html frame by frame with headless Chromium.
//   node render.js <out-dir> [fps]          all frames as JPEG
//   node render.js <out-dir> --at 2,7,13    only these times (seconds), as PNG previews
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

(async () => {
  const out = process.argv[2];
  const atIndex = process.argv.indexOf('--at');
  const fps = Number(atIndex === -1 ? process.argv[3] || 30 : 30);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'promo.html'));
  await page.evaluate(() => document.fonts.ready);
  const times =
    atIndex !== -1
      ? process.argv[atIndex + 1].split(',').map(Number)
      : Array.from({ length: Math.round((await page.evaluate(() => window.DURATION)) * fps) }, (_, i) => i / fps);
  for (const [i, t] of times.entries()) {
    await page.evaluate((time) => window.render(time), t);
    const file = atIndex !== -1 ? `at-${t}.png` : `f${String(i).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: path.join(out, file), type: atIndex !== -1 ? 'png' : 'jpeg', quality: atIndex !== -1 ? undefined : 94 });
    if (i % 120 === 0) process.stdout.write(`frame ${i}/${times.length}\n`);
  }
  await browser.close();
})();
