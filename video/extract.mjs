// Cuts each take into stills at 30fps for the exact window the composition uses, so the
// renderer never has to seek a <video> (a paused video does not reliably repaint).
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// id -> [clip, in-point, seconds] — each window covers its whole scene, plus one frame.
const WINDOWS = {
  ledger: ['ledger', 18.4, 9.0],
  verdict: ['panel', 32.8, 8.5],
  source: ['panel', 46.8, 5.6],
  quiet: ['quiet', 30.9, 5.9],
  related: ['related', 29.5, 5.4]
};

for (const [id, [clip, from, len]] of Object.entries(WINDOWS)) {
  const dir = path.resolve('stills', id);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', [
      '-y', '-v', 'error', '-ss', String(from), '-t', String(len), '-i', path.resolve('clips', `${clip}.mp4`),
      '-r', '30', '-q:v', '3', path.join(dir, '%04d.jpg')
    ], { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))));
  });
  const n = (await fs.readdir(dir)).length;
  console.log(id, n, 'stills', (n / 30).toFixed(1) + 's');
}
