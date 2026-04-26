#!/usr/bin/env node
// One-shot script to inject <!-- TC_REVIEWS:* --> placeholders into the
// fragment files for the P1-E patient-review surfaces. Idempotent —
// safe to re-run; a fragment that already contains the placeholder is
// skipped without modification.
//
// Anchors are shared across all 9 locales because the fragment templates
// are mirrored. Run from project root: `node scripts/inject-review-placeholders.js`.

const fs = require("fs");
const path = require("path");

const LOCALES = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi", "ko"];

// Each insertion: locate `anchor` in the file and inject `placeholder`
// directly before it, preserving the anchor verbatim.
const INSERTIONS = [
  {
    file: "index.html",
    surface: "home",
    anchor: '    <section id="programs" class="py-24 bg-white">',
    note: "after trust-signal block, before program grid",
  },
  {
    file: "menu.html",
    surface: "menu",
    anchor: '    <div class="max-w-4xl mx-auto px-4 md:px-6 pb-12 md:pb-20">',
    note: "directly under the pricing transparency banner / hero",
  },
  {
    file: "signature-lifting.html",
    surface: "signature-lifting",
    anchor: '    <section class="py-20 bg-slate-50">',
    note: "before the Physician's FAQ block",
  },
  {
    file: "structural-reset.html",
    surface: "structural-reset",
    anchor:
      '    <section class="py-20 bg-white">\n        <div class="max-w-5xl mx-auto px-6">',
    note: "after the hero-explainer quote block, before Who-It-Is-For",
  },
  {
    file: "collagen-builder.html",
    surface: "collagen-builder",
    anchor: '    <section class="py-20 bg-slate-50">',
    note: "before Physician's FAQ at the bottom of the page",
  },
];

const results = { inserted: [], skipped: [], missingAnchor: [] };

for (const locale of LOCALES) {
  for (const ins of INSERTIONS) {
    const fp = path.join(
      __dirname,
      "..",
      "src",
      "fragments",
      locale,
      ins.file,
    );
    if (!fs.existsSync(fp)) {
      results.missingAnchor.push(`${locale}/${ins.file} (file not found)`);
      continue;
    }
    let src = fs.readFileSync(fp, "utf8");
    const placeholder = `    <!-- TC_REVIEWS:${ins.surface} -->\n`;
    if (src.includes(`<!-- TC_REVIEWS:${ins.surface} -->`)) {
      results.skipped.push(`${locale}/${ins.file}`);
      continue;
    }
    if (!src.includes(ins.anchor)) {
      results.missingAnchor.push(`${locale}/${ins.file}`);
      continue;
    }
    // Use split/join to perform a single replacement at the first match.
    const idx = src.indexOf(ins.anchor);
    const before = src.slice(0, idx);
    const after = src.slice(idx);
    src = `${before}${placeholder}${after}`;
    fs.writeFileSync(fp, src);
    results.inserted.push(`${locale}/${ins.file}`);
  }
}

console.log("Inserted:");
results.inserted.forEach((f) => console.log("  +", f));
if (results.skipped.length) {
  console.log("\nAlready had placeholder (skipped):");
  results.skipped.forEach((f) => console.log("  =", f));
}
if (results.missingAnchor.length) {
  console.log("\nMissing anchor (NOT modified — investigate):");
  results.missingAnchor.forEach((f) => console.log("  !", f));
  process.exitCode = 1;
}
