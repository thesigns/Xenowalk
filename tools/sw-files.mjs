// Rewrites the list of files the service worker caches (FILES in sw.js):
//   node tools/sw-files.mjs
// Run it after adding or removing any file the game loads.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const FOLDERS = ['css', 'js', 'img'];
const FILES = ['index.html', 'manifest.webmanifest'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = [
  './',
  ...FILES,
  ...FOLDERS.flatMap((folder) => walk(join(root, folder)).map((path) => relative(root, path).split(sep).join('/'))),
].sort((a, b) => (a === './' ? -1 : b === './' ? 1 : a.localeCompare(b)));

const swPath = join(root, 'sw.js');
const sw = readFileSync(swPath, 'utf8');
const list = `// FILES:START\nconst FILES = [\n${files.map((file) => `  '${file}',`).join('\n')}\n];\n// FILES:END`;
writeFileSync(swPath, sw.replace(/\/\/ FILES:START[\s\S]*?\/\/ FILES:END/, list));
console.log(`sw.js caches ${files.length} files`);
