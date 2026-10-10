// Renders the PNG app icons from img/icon.svg with headless Chrome:
//   node tools/icons.mjs
// Phones want PNGs in the manifest (192, 512, a maskable 512) and an
// apple-touch-icon; the SVG stays the source. Its emblem sits inside the
// central 80% circle, so the same picture works as the maskable icon.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const chrome = CHROMES.find((path) => existsSync(path));
if (!chrome) throw new Error('No Chrome or Edge found');

const ICONS = [
  ['img/icon-192.png', 192],
  ['img/icon-512.png', 512],
  ['img/apple-touch-icon.png', 180],
];

const work = mkdtempSync(join(tmpdir(), 'xenowalk-icons-'));
const svg = pathToFileURL(join(root, 'img/icon.svg')).href;
for (const [file, size] of ICONS) {
  const page = join(work, `icon-${size}.html`);
  writeFileSync(page, `<!doctype html><style>html,body{margin:0;background:#03050a}img{display:block;width:${size}px;height:${size}px}</style><img src="${svg}">`);
  execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${size},${size}`, `--screenshot=${join(root, file)}`, pathToFileURL(page).href], { stdio: 'ignore' });
  console.log(`${file} (${size}×${size})`);
}
