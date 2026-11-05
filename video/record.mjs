// Records real clips of the live app in Brave, through the user's own signed-in profile.
// Frames come from CDP screencast with their real timestamps, so a slow or static stretch
// stays on screen for as long as it really lasted instead of being dropped.
import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BRAVE = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const PROFILE = 'D:\\Contra\\.browser-profile';
const SITE = 'https://precedent.atlassian.net';
const APP = `${SITE}/jira/apps/1283e715-3a68-4efe-b60e-1d54479b7a4b/e2ca98c9-5a51-40a4-994d-ff0899eb7094`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const appFrame = (page) => page.frames().find((f) => f.url().includes('atlassian-dev.net'));

// Real-time at 30fps: each captured frame is repeated for as long as it was actually on
// screen, so the clip keeps the recording's pacing instead of ffmpeg's idea of it.
async function encode(frames, out) {
  const list = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const reps = Math.max(1, Math.round((frames[i + 1].t - frames[i].t) * 30));
    for (let r = 0; r < reps; r++) list.push(`file '${frames[i].file.replace(/\\/g, '/')}'\nduration 0.0333`);
  }
  list.push(`file '${frames.at(-1).file.replace(/\\/g, '/')}'\nduration 0.0333`);
  const listFile = out.replace(/\.mp4$/, '.txt');
  await fs.writeFile(listFile, list.join('\n') + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`);
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-r', '30', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', out], { stdio: 'ignore' });
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))));
  });
}

async function screencast(page, dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`;
    await fs.writeFile(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: Date.now() });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, everyNthFrame: 1 });
  return async () => {
    // A static screen emits no frames, so the last one owns all the time since it appeared.
    const stopAt = Date.now();
    await cdp.send('Page.stopScreencast').catch(() => {});
    if (frames.length) frames.push({ file: frames.at(-1).file, t: stopAt });
    return frames.map((f, i) => ({ ...f, t: (f.t - frames[0].t) / 1000 }));
  };
}

// The glance row sits far down the sidebar, so bring it into view before aiming at it.
async function clickGlanceRow(page) {
  const box = await page.evaluate(() => {
    for (const e of document.querySelectorAll('*')) {
      if (e.children.length === 0 && (e.textContent || '').trim() === 'Precedent' && e.getBoundingClientRect().width > 0) {
        e.scrollIntoView({ block: 'center' });
        const b = e.getBoundingClientRect();
        return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
      }
    }
    return null;
  });
  if (!box) throw new Error('no Precedent row');
  await sleep(700);
  await page.mouse.move(box.x - 80, box.y, { steps: 14 });
  await sleep(250);
  await page.mouse.click(box.x, box.y);
}

async function openPanel(page, key) {
  await page.goto(`${SITE}/browse/${key}`, { waitUntil: 'domcontentloaded' });
  await sleep(13000);
  await page.mouse.wheel(0, 300);
  await sleep(1500);
  await clickGlanceRow(page);
  await sleep(11000);
  const f = appFrame(page);
  if (!f) throw new Error('panel did not load for ' + key);
  return f;
}

async function take(name, run) {
  const dir = path.resolve('work', name);
  const context = await chromium.launchPersistentContext(PROFILE, {
    executablePath: BRAVE,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    args: ['--window-size=1600,1000', '--hide-crash-restore-bubble', '--no-first-run']
  });
  const page = await context.newPage();
  const marks = {};
  let t0 = null;
  const mark = (k) => t0 !== null && (marks[k] = +((Date.now() - t0) / 1000).toFixed(2));
  try {
    const stop = await screencast(page, dir);
    t0 = Date.now();
    await sleep(150);
    await run(page, mark);
    mark('end');
    const frames = await stop();
    await encode(frames, path.resolve('clips', `${name}.mp4`));
    await fs.writeFile(path.resolve('clips', `${name}.json`), JSON.stringify(marks, null, 1));
    console.log(name, frames.length, 'frames', frames.at(-1).t.toFixed(1), 's', JSON.stringify(marks));
  } finally {
    await context.close();
  }
}

const which = process.argv[2] ?? 'all';

// The cookie banner sits across the top of every frame, so it gets dismissed once and the
// choice stays in the profile. No app is on screen yet, so it is not recorded.
if (which !== 'none') {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: BRAVE,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--window-size=1600,1000', '--no-first-run']
  });
  const p = await ctx.newPage();
  await p.goto(SITE, { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  await p.getByRole('button', { name: /Accept all/i }).first().click({ timeout: 15000 }).catch(() => console.log('no banner'));
  await sleep(2000);
  await ctx.close();
}

if (which === 'all' || which === 'ledger') {
  await take('ledger', async (page, mark) => {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });
    await sleep(14000);
    const f = appFrame(page);
    if (!f) throw new Error('ledger iframe');
    await sleep(2000);
    mark('ledger');
    for (let i = 0; i < 46; i++) {
      await f.evaluate(() => {
        const el = [...document.querySelectorAll('*')].filter((d) => d.scrollHeight > d.clientHeight + 40).pop();
        if (el) el.scrollTop += 24;
      });
      await sleep(95);
    }
    await sleep(3000);
  });
}

if (which === 'all' || which === 'panel') {
  await take('panel', async (page, mark) => {
    const f = await openPanel(page, 'KAN-14');
    mark('verdict');
    await sleep(8000);
    mark('record');
    await f.locator('a.source').first().click();
    await sleep(12000);
  });
}

if (which === 'all' || which === 'precision') {
  await take('quiet', async (page, mark) => {
    await openPanel(page, 'KAN-18');
    mark('quiet');
    await sleep(8000);
  });
  await take('related', async (page, mark) => {
    await openPanel(page, 'KAN-17');
    mark('related');
    await sleep(8000);
  });
}
