#!/usr/bin/env node
// OpenAI image-generation fallback for blog assets that Imagen failed on
// (e.g. quota exhaustion or safety-filter rejection).
//
// Usage:
//   node src/scripts/generate-blog-images-openai.js              # generate all missing
//   node src/scripts/generate-blog-images-openai.js --dry-run
//   node src/scripts/generate-blog-images-openai.js --only=first-visit
//   node src/scripts/generate-blog-images-openai.js --force
//   node src/scripts/generate-blog-images-openai.js --model=gpt-image-2
//
// Reads OPENAI_API_KEY and (optional) OPENAI_IMAGE_MODEL from .env.
// Defaults model to gpt-image-2; falls back to gpt-image-1 then dall-e-3
// if the chosen model returns model_not_found.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

const ROOT = path.resolve(__dirname, "..", "..");
const PROMPTS_FILE = path.join(__dirname, "image-prompts.json");
const OUTPUT_DIR = path.join(ROOT, "src", "blog", "images");

const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const FALLBACK_MODELS = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "dall-e-3"];

// gpt-image-* supports 1024x1024, 1024x1536 (portrait), 1536x1024 (landscape).
// dall-e-3 supports 1024x1024, 1792x1024, 1024x1792.
function pickSize(aspectRatio, model) {
  const isDalle = model.startsWith("dall-e");
  if (aspectRatio === "16:9") return isDalle ? "1792x1024" : "1536x1024";
  if (aspectRatio === "9:16") return isDalle ? "1024x1792" : "1024x1536";
  if (aspectRatio === "4:3") return isDalle ? "1792x1024" : "1536x1024";
  if (aspectRatio === "3:4") return isDalle ? "1024x1792" : "1024x1536";
  return "1024x1024";
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, only: null, model: DEFAULT_MODEL };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a.startsWith("--only=")) args.only = a.slice("--only=".length);
    else if (a.startsWith("--model=")) args.model = a.slice("--model=".length);
  }
  return args;
}

function filenameFor(entry) {
  return `${entry.slug}-${entry.kind}.png`;
}

async function generateOnce(client, model, prompt, size) {
  const params = { model, prompt, size, n: 1 };
  // gpt-image-* accepts quality + output_format; dall-e-3 does not.
  if (!model.startsWith("dall-e")) {
    params.quality = "high";
    params.output_format = "png";
  }
  const resp = await client.images.generate(params);
  const item = resp.data && resp.data[0];
  if (!item) throw new Error("Empty response");
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`Image fetch ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("No image data in response");
}

async function generateWithFallback(client, requestedModel, prompt, size, log) {
  const order = [requestedModel, ...FALLBACK_MODELS.filter((m) => m !== requestedModel)];
  let lastErr;
  for (const m of order) {
    try {
      const buf = await generateOnce(client, m, prompt, size);
      return { buf, model: m };
    } catch (err) {
      const msg = (err && (err.message || err.toString())) || "";
      const skippable = /model[_ ]not[_ ]found|does not exist|invalid model|must be verified/i.test(msg);
      if (!skippable) throw err;
      log(`   model ${m} unavailable, trying next…`);
      lastErr = err;
    }
  }
  throw lastErr || new Error("No usable model");
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
    args.only ? e.slug.includes(args.only) || (e.kind && e.kind.includes(args.only)) : true,
  );

  console.log(`Model: ${args.model} (fallbacks: ${FALLBACK_MODELS.filter((m) => m !== args.model).join(", ")})`);
  console.log(`Entries: ${entries.length}${args.only ? ` (filter: "${args.only}")` : ""}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  if (args.dryRun) console.log("Mode: DRY RUN\n");

  if (!args.dryRun && !process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set. Add it to .env at project root.");
    process.exit(1);
  }

  const client = args.dryRun
    ? null
    : new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG_ID || undefined,
      });
  const summary = { generated: [], skipped: [], failed: [] };

  for (const entry of entries) {
    const filename = filenameFor(entry);
    const outPath = path.join(OUTPUT_DIR, filename);
    const webpPath = outPath.replace(/\.png$/, ".webp");
    const exists = fs.existsSync(outPath) || fs.existsSync(webpPath);

    if (exists && !args.force) {
      console.log(`⊘ skip    ${filename} (exists)`);
      summary.skipped.push(filename);
      continue;
    }

    const fullPrompt = [entry.prompt, styleSuffix].filter(Boolean).join("\n\n");
    const aspectRatio = entry.aspectRatio || defaults.aspectRatio || "16:9";
    const size = pickSize(aspectRatio, args.model);

    if (args.dryRun) {
      console.log(`\n── ${filename} [${aspectRatio} → ${size}] ──`);
      console.log(fullPrompt);
      summary.generated.push(filename);
      continue;
    }

    process.stdout.write(`→ gen     ${filename} [${size}] ... `);
    try {
      const { buf, model } = await generateWithFallback(client, args.model, fullPrompt, size, (m) => console.log("\n  " + m));
      fs.writeFileSync(outPath, buf);
      console.log(`ok via ${model} (${(buf.length / 1024).toFixed(0)} KB)`);
      summary.generated.push(filename);
    } catch (err) {
      console.log("FAILED");
      console.error(`   ${err.message || err}`);
      summary.failed.push({ file: filename, error: err.message || String(err) });
    }
  }

  console.log("\n─── Summary ───");
  console.log(`Generated: ${summary.generated.length}`);
  console.log(`Skipped  : ${summary.skipped.length}`);
  console.log(`Failed   : ${summary.failed.length}`);
  if (summary.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
