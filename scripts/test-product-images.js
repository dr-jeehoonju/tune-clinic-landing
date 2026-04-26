#!/usr/bin/env node
// One-off: generate 2 product-style test images via gpt-image-2
// to evaluate style + copyright-safe approach before scaling.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

const OUT = path.join(__dirname, "..", "src", "blog", "images");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || "org-91xMBxoPNTYUjnJ772AHThhl",
});

const tests = [
  {
    file: "test-pll-biostimulator-bottle.png",
    size: "1536x1024",
    prompt: `Editorial photography of a single small Korean medical-aesthetic glass pharmaceutical vial standing upright on a polished pale marble surface. The vial is small (about 5cm tall), clear glass, sealed with a brushed-metal crimp cap, contents are a faintly opalescent off-white liquid suggesting a poly-L-lactic acid biostimulator. Completely unmarked: no text, no logo, no label, no typography of any kind. Soft directional studio light from upper-left, long quiet shadow, deep negative space around the vial. Shallow depth of field. Muted slate-grey background, antique-gold reflections on the glass. Photorealistic 35mm clinical product photography, high-end pharmaceutical magazine quality. NOT a hero shot of a recognisable brand — a generic-category medical-aesthetic product still life.`,
  },
  {
    file: "test-three-skin-boosters-trio.png",
    size: "1536x1024",
    prompt: `Editorial product photography: three small unbranded medical-grade glass pharmaceutical vials arranged in a loose row on a smooth pale marble surface. The leftmost vial has a clear amber-tinted contents (suggesting a polynucleotide PDRN regenerative formulation). The middle vial has a faintly opalescent off-white contents (suggesting a PLLA biostimulator). The rightmost vial has clear water-white contents with a subtle pearlescent shimmer (suggesting an extracellular vesicle/exosome formulation). All three vials are identical in shape and size, sealed with brushed-metal crimp caps. Completely unmarked: no text, no logo, no labels, no typography of any kind, no brand identifiers. Soft directional studio light from upper-left, long quiet shadows behind each vial. Deep negative space, generous breathing room. Muted slate-grey background, antique-gold reflections on the glass. Photorealistic 35mm clinical product photography, high-end pharmaceutical magazine aesthetic. Generic-category still life — NOT replicating any specific commercial brand packaging.`,
  },
];

const MODEL_CASCADE = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "dall-e-3"];

async function genOne(model, prompt, size) {
  const params = { model, prompt, size, n: 1 };
  if (!model.startsWith("dall-e")) {
    params.quality = "high";
    params.output_format = "png";
  }
  const resp = await client.images.generate(params);
  const item = resp.data[0];
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) {
    const r = await fetch(item.url);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("no image data");
}

async function gen(t) {
  process.stdout.write(`→ ${t.file} `);
  for (const model of MODEL_CASCADE) {
    process.stdout.write(`[${model}…] `);
    try {
      const buf = await genOne(model, t.prompt, t.size);
      fs.writeFileSync(path.join(OUT, t.file), buf);
      console.log(`ok ${model} (${(buf.length / 1024).toFixed(0)} KB)`);
      return;
    } catch (e) {
      const msg = e.message || String(e);
      const skippable = /must be verified|model_not_found|does not exist|invalid model/i.test(msg);
      if (!skippable) {
        console.log(`FAILED on ${model}: ${msg}`);
        return;
      }
    }
  }
  console.log("ALL MODELS UNAVAILABLE");
}

(async () => {
  for (const t of tests) await gen(t);
  console.log(`\nSaved to: ${OUT}`);
  console.log(`Open in Finder: open ${OUT}`);
})();
