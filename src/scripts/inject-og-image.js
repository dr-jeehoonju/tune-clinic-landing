#!/usr/bin/env node
// Inject `ogImage: /blog/images/{slug}-hero.webp` into frontmatter of every
// blog post markdown across all 8 locales. Idempotent: skips posts that
// already have an ogImage field.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "blog");
const LOCALES = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi"];
const IMAGES_DIR = path.resolve(__dirname, "..", "blog", "images");

function slugFromFrontmatter(raw) {
  const m = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!m) return null;
  const sm = /^slug:\s*(.+?)\s*$/m.exec(m[1]);
  return sm ? sm[1].trim() : null;
}

let added = 0;
let skipped = 0;
let missingImage = 0;

for (const locale of LOCALES) {
  const dir = path.join(ROOT, locale);
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const filepath = path.join(dir, file);
    const raw = fs.readFileSync(filepath, "utf8");

    if (/^ogImage:\s*/m.test(raw)) {
      skipped++;
      continue;
    }

    const slug = slugFromFrontmatter(raw);
    if (!slug) {
      console.warn(`  [skip] ${locale}/${file} — no slug`);
      continue;
    }

    const imageRel = `/blog/images/${slug}-hero.webp`;
    const imageAbs = path.join(IMAGES_DIR, `${slug}-hero.webp`);
    if (!fs.existsSync(imageAbs)) {
      console.warn(`  [miss] ${locale}/${file} — ${imageRel} not found`);
      missingImage++;
      continue;
    }

    // Insert ogImage line right before the closing ---
    const updated = raw.replace(
      /^(---\n[\s\S]*?)(\n---)/,
      `$1\nogImage: ${imageRel}$2`,
    );

    if (updated === raw) {
      console.warn(`  [fail] ${locale}/${file} — frontmatter pattern not found`);
      continue;
    }

    fs.writeFileSync(filepath, updated);
    added++;
  }
}

console.log(`\n─── Summary ───`);
console.log(`Added ogImage: ${added}`);
console.log(`Skipped (already had): ${skipped}`);
console.log(`Missing image file: ${missingImage}`);
