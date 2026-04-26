#!/usr/bin/env node
// One-shot script to inject <!-- TC_ITINERARY:* --> placeholders into the
// fragment files for the P1-D 3–5 day Seoul itinerary surfaces. Idempotent —
// safe to re-run; a fragment that already contains the placeholder is
// skipped without modification.
//
// Mirrors `inject-review-placeholders.js`. Anchors are shared across all 9
// locales because the fragment templates are mirrored. Run from project
// root: `node scripts/inject-itinerary-placeholders.js`.

const fs = require("fs");
const path = require("path");

const LOCALES = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi", "ko"];

// Each insertion: locate `anchor` in the file and inject `placeholder`
// directly before it, preserving the anchor verbatim.
const INSERTIONS = [
  {
    file: "index.html",
    surface: "home",
    // Sits between the patient-review module placeholder and the
    // four-program grid, matching the trust → reviews → itinerary →
    // programs visual rhythm requested in v1.2 §3.
    anchor: '    <section id="programs" class="py-24 bg-white">',
    note: "between reviews module and program grid on home",
  },
  {
    file: "structural-reset.html",
    surface: "detail",
    // Sits at the end of the page, after the Physician's FAQ and just
    // before the page-level closing footer / contact CTA. Gives the
    // travel-conscious itinerary its own beat without duplicating the
    // protocol-logistics block higher up.
    anchor:
      '    <footer id="contact" class="bg-slate-900 text-white py-24 text-center">',
    note: "end of page, before in-page contact footer",
  },
  {
    file: "aesthetic-treatment-faq-for-foreign-patients.html",
    surface: "detail",
    // Sits at the very bottom of the FAQ page, before the trailing
    // "next steps" two-column section. Keeps the FAQ content intact and
    // gives short-stay travelers a concrete day-by-day frame after the
    // Q&A.
    anchor:
      '<section class="py-20 bg-white">\n  <div class="max-w-6xl mx-auto px-6">\n    <div class="grid md:grid-cols-2 gap-8">',
    note: "before the closing two-column 'next steps' panel on the FAQ page",
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
    const placeholder = `    <!-- TC_ITINERARY:${ins.surface} -->\n`;
    if (src.includes(`<!-- TC_ITINERARY:${ins.surface} -->`)) {
      results.skipped.push(`${locale}/${ins.file}`);
      continue;
    }
    if (!src.includes(ins.anchor)) {
      results.missingAnchor.push(`${locale}/${ins.file}`);
      continue;
    }
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
