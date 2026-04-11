#!/usr/bin/env node
// Batch convert src/blog/images/*.png → *.webp at q=85, then delete source PNGs.
// Idempotent: skips any PNG whose matching .webp already exists.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.resolve(__dirname, "..", "blog", "images");

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    console.log("No PNGs found.");
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    const src = path.join(DIR, file);
    const dest = path.join(DIR, file.replace(/\.png$/, ".webp"));
    const beforeBytes = fs.statSync(src).size;
    totalBefore += beforeBytes;

    if (fs.existsSync(dest)) {
      console.log(`⊘ skip  ${file} → webp already exists`);
      skipped++;
      totalAfter += fs.statSync(dest).size;
      continue;
    }

    process.stdout.write(`→ conv  ${file} ... `);
    await sharp(src).webp({ quality: 85, effort: 6 }).toFile(dest);
    const afterBytes = fs.statSync(dest).size;
    totalAfter += afterBytes;
    const ratio = ((1 - afterBytes / beforeBytes) * 100).toFixed(0);
    console.log(`${(beforeBytes / 1024).toFixed(0)} KB → ${(afterBytes / 1024).toFixed(0)} KB (-${ratio}%)`);
    converted++;
  }

  // Delete PNGs only after all conversions succeeded
  if (converted > 0) {
    console.log("\nDeleting source PNGs...");
    for (const file of files) {
      const webp = path.join(DIR, file.replace(/\.png$/, ".webp"));
      if (fs.existsSync(webp)) {
        fs.unlinkSync(path.join(DIR, file));
      }
    }
  }

  console.log(`\n─── Summary ───`);
  console.log(`Converted: ${converted}`);
  console.log(`Skipped  : ${skipped}`);
  console.log(`Total size: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Savings  : ${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
