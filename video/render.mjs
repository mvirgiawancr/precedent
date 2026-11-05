// Deterministic frame renderer: seeks the composition to i/30, screenshots, repeat.
// Usage: node render.mjs [fromFrame] [toFrame]   (defaults: whole film)
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';

const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const COMP = 'file:///' + path.resolve('comp.html').replace(/\\/g, '/');
const OUT = path.resolve('work', 'frames');
const FPS = 30;

const context = await chromium.launchPersistentContext(path.resolve('work', 'chrome-profile'), {
  executablePath: BRAVE,
  headless: true,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  args: ['--window-size=1920,1080', '--no-first-run', '--autoplay-policy=no-user-gesture-required']
});

const page = await context.newPage();
// Screenshot to disk on D: is the point: any frame can be re-rendered alone later.
await page.goto(COMP, { waitUntil: 'load' });
await page.evaluate(() => window.__ready());

const dur = await page.evaluate(() => window.__duration);
const total = Math.round(dur * FPS);
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? total);
const step = Number(process.argv[4] ?? 1);
await fs.mkdir(OUT, { recursive: true });

const t0 = Date.now();
for (let i = from; i < to; i += step) {
  await page.evaluate((t) => window.__seek(t), i / FPS);
  await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
  if (i % 60 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`${i}/${to}  ${el.toFixed(0)}s  ~${((to - i) * (el / Math.max(1, i - from + 1))).toFixed(0)}s left`);
  }
}

console.log(`done ${to - from} frames in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
await context.close();
