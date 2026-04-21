#!/usr/bin/env node
// Copy non-templated static assets into the Eleventy output directory
// (`dist/`). Run as part of `npm run build` before / alongside the
// Eleventy build.
//
// We deliberately keep image/video sources at the project root for now
// to avoid breaking git history — they get copied into dist on every
// build instead of being moved.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

const STATIC_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  '.mp4', '.webm', '.m4v',
  '.woff', '.woff2', '.ttf',
]);

const STATIC_FILES = ['robots.txt', 'admin.html'];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function copyRootMedia() {
  let count = 0;
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!STATIC_EXTENSIONS.has(ext)) continue;
    copyFile(path.join(ROOT, entry.name), path.join(OUT, entry.name));
    count += 1;
  }
  return count;
}

function copyExplicitFiles() {
  let count = 0;
  for (const name of STATIC_FILES) {
    const src = path.join(ROOT, name);
    if (!fs.existsSync(src)) continue;
    copyFile(src, path.join(OUT, name));
    count += 1;
  }
  return count;
}

function main() {
  ensureDir(OUT);
  const media = copyRootMedia();
  const explicit = copyExplicitFiles();

  // Bundled vendor assets (self-hosted Font Awesome CSS + webfonts).
  copyDir(path.join(ROOT, 'src/static/css'), path.join(OUT, 'css'));
  copyDir(path.join(ROOT, 'src/static/webfonts'), path.join(OUT, 'webfonts'));

  console.log(`[copy-static] media=${media} explicit=${explicit}`);
}

main();
