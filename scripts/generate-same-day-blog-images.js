#!/usr/bin/env node
// One-off: generate hero + 2 body images for the 2026-05-14 blog post
// (Same-day Aesthetic Treatments). gpt-image-2 with cascade fallback.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai").default;

const OUT = path.resolve(__dirname, "..", "src", "blog", "images");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || "org-91xMBxoPNTYUjnJ772AHThhl",
});

const MODEL_CASCADE = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1", "dall-e-3"];

const SLUG = "same-day-aesthetic-treatments-seoul-what-is-possible";

const COMMON_GUARD = "No faces, no people, no skin close-ups, no devices, no syringes, no before-after framing. Photorealistic 35mm editorial photography, high-end print magazine quality. No text, no letters, no typography, no labels anywhere in the image.";

const items = [
  {
    file: `${SLUG}-hero.png`,
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of a single antique brass pocket-watch lying open face-up on aged pale linen, the watch face catching warm directional morning light from a tall window at left, the second-hand frozen in mid-sweep, a quiet still life. Deep negative space around the watch, soft long shadow. Muted slate-grey and antique-gold palette. Premium clinical-editorial atmosphere. ${COMMON_GUARD}`,
  },
  {
    file: `${SLUG}-body-sundial.png`,
    size: "1536x1024",
    prompt: `Editorial still life: an antique brass sundial resting on aged pale stone in soft directional natural light, its gnomon casting a clean shadow angled toward mid-afternoon. Deep negative space around the sundial, contemplative composition. Muted slate-grey and antique-gold palette, raking warm side-light. ${COMMON_GUARD}`,
  },
  {
    file: `${SLUG}-body-teacup.png`,
    size: "1536x1024",
    prompt: `Editorial still life: a single empty ceramic teacup on a smooth pale stone surface at first light, a softly folded linen cloth beside it, gentle directional window light streaming from one side, the rest of the frame in soft shadow. Deep negative space, atmospheric quiet. Muted antique-gold and cool morning blue-grey palette. Suggests the quiet morning before a considered day. ${COMMON_GUARD}`,
  },
];

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
  const png = path.join(OUT, t.file);
  const webp = png.replace(/\.png$/, ".webp");
  if (fs.existsSync(png) || fs.existsSync(webp)) {
    console.log(`⊘ skip   ${t.file} (exists)`);
    return { skipped: true };
  }
  process.stdout.write(`→ gen    ${t.file} `);
  for (const model of MODEL_CASCADE) {
    process.stdout.write(`[${model}…] `);
    try {
      const buf = await genOne(model, t.prompt, t.size);
      fs.writeFileSync(png, buf);
      console.log(`ok ${model} (${(buf.length / 1024).toFixed(0)} KB)`);
      return { ok: true, model };
    } catch (e) {
      const msg = e.message || String(e);
      const skippable = /must be verified|model_not_found|does not exist|invalid model/i.test(msg);
      if (!skippable) {
        console.log(`FAILED on ${model}: ${msg}`);
        return { failed: true, error: msg };
      }
    }
  }
  console.log("ALL MODELS UNAVAILABLE");
  return { failed: true };
}

(async () => {
  const summary = { ok: 0, skipped: 0, failed: 0 };
  for (const t of items) {
    const r = await gen(t);
    if (r.ok) summary.ok++;
    else if (r.skipped) summary.skipped++;
    else summary.failed++;
  }
  console.log(`\n─── ${summary.ok} ok / ${summary.skipped} skipped / ${summary.failed} failed ───`);
})();
