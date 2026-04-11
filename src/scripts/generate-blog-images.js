#!/usr/bin/env node
// Batch-generate blog images via Google Imagen 4.
//
// Usage:
//   node src/scripts/generate-blog-images.js              # generate all missing
//   node src/scripts/generate-blog-images.js --dry-run    # print prompts only, no API call
//   node src/scripts/generate-blog-images.js --only=pico  # filter by slug substring
//   node src/scripts/generate-blog-images.js --force      # regenerate even if file exists
//
// Requires GEMINI_API_KEY in .env at project root.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const ROOT = path.resolve(__dirname, "..", "..");
const PROMPTS_FILE = path.join(__dirname, "image-prompts.json");
const OUTPUT_DIR = path.join(ROOT, "src", "blog", "images");
const MODEL = "imagen-4.0-generate-001";

function parseArgs(argv) {
  const args = { dryRun: false, force: false, only: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a.startsWith("--only=")) args.only = a.slice("--only=".length);
  }
  return args;
}

function filenameFor(entry) {
  return `${entry.slug}-${entry.kind}.png`;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(PROMPTS_FILE)) {
    console.error(`Prompts file not found: ${PROMPTS_FILE}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf8"));
  const styleSuffix = config.styleSuffix || "";
  const defaults = config.defaults || {};

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries = config.images.filter((e) =>
    args.only ? e.slug.includes(args.only) || e.kind.includes(args.only) : true,
  );

  console.log(`Model: ${MODEL}`);
  console.log(`Entries to process: ${entries.length}${args.only ? ` (filtered by "${args.only}")` : ""}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(args.dryRun ? "Mode: DRY RUN (no API calls)\n" : "");

  if (!args.dryRun) {
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set. Add it to .env at project root.");
      process.exit(1);
    }
  }

  const ai = args.dryRun ? null : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const summary = { generated: [], skipped: [], failed: [] };

  for (const entry of entries) {
    const filename = filenameFor(entry);
    const outPath = path.join(OUTPUT_DIR, filename);
    const exists = fs.existsSync(outPath);

    if (exists && !args.force) {
      console.log(`⊘ skip    ${filename} (exists)`);
      summary.skipped.push(filename);
      continue;
    }

    const fullPrompt = [entry.prompt, styleSuffix].filter(Boolean).join("\n\n");
    const aspectRatio = entry.aspectRatio || defaults.aspectRatio || "16:9";

    if (args.dryRun) {
      console.log(`\n── ${filename} [${aspectRatio}] ──`);
      console.log(fullPrompt);
      summary.generated.push(filename);
      continue;
    }

    process.stdout.write(`→ gen     ${filename} [${aspectRatio}] ... `);
    try {
      const response = await ai.models.generateImages({
        model: MODEL,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
          personGeneration: "dont_allow",
        },
      });

      const img = response?.generatedImages?.[0]?.image;
      if (!img?.imageBytes) {
        throw new Error("No image bytes in response");
      }
      const buf = Buffer.from(img.imageBytes, "base64");
      fs.writeFileSync(outPath, buf);
      const sizeKB = (buf.length / 1024).toFixed(0);
      console.log(`ok (${sizeKB} KB)`);
      summary.generated.push(filename);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`   ${err.message || err}`);
      summary.failed.push({ file: filename, error: err.message || String(err) });
    }
  }

  console.log("\n─── Summary ───");
  console.log(`Generated: ${summary.generated.length}`);
  console.log(`Skipped  : ${summary.skipped.length}`);
  console.log(`Failed   : ${summary.failed.length}`);
  if (summary.failed.length) {
    console.log("\nFailures:");
    for (const f of summary.failed) console.log(`  - ${f.file}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
