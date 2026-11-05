// Re-encodes already-captured frames. Durations come from the screencast timestamps in ms.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const dir = process.argv[2];
const out = process.argv[3];
const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jpg')).sort();

// Timestamps are lost with the frames, so read them back from the screenshot order and the
// clip's real duration kept in duration.txt.
const total = Number(await fs.readFile(path.join(dir, 'duration.txt'), 'utf8'));
const per = (total * 1000) / files.length;
const list = files
  .map((f, i) => `file '${path.resolve(dir, f).replace(/\\/g, '/')}'\nduration ${(i < files.length - 1 ? per / 1000 : 1 / 30).toFixed(4)}`)
  .join('\n');
const listFile = out.replace(/\.mp4$/, '.txt');
await fs.writeFile(listFile, list + `\nfile '${path.resolve(dir, files.at(-1)).replace(/\\/g, '/')}'\n`);

await new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-fps_mode', 'vfr', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', out], { stdio: 'inherit' });
  p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))));
});
