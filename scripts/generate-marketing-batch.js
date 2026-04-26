#!/usr/bin/env node
// Generate 8 product/procedural images for high-ROI pages via gpt-image-2.
// Output: src/blog/images/*.png (will be converted to .webp by convert-to-webp.js)
// Idempotent: skips files that already exist (.png or .webp).

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

const COMMON_GUARD = "Completely unmarked: no text, no letters, no typography, no labels, no logos, no brand identifiers, no captions, no numbers anywhere in the image. Generic-category still life — NOT replicating any specific commercial brand packaging or product. Photorealistic 35mm clinical product photography, high-end pharmaceutical magazine quality. No faces, no people, no skin close-ups, no before-after framing.";

const items = [
  // ─── Doctor's Picks blog body images (2) ──────────────────────────
  {
    file: "which-korean-lifting-treatment-fits-your-face-body-devices.png",
    size: "1536x1024",
    prompt: `Editorial product photography: two unbranded medical-grade aesthetic device handheld applicators arranged on a smooth pale marble surface. The leftmost is an elongated cylindrical applicator with a flat treatment head, suggesting an ultrasound HIFU transducer for facial lifting. The rightmost is a square-faced applicator with a metallic monopolar tip, suggesting a radiofrequency device. Both unmarked. Sterile environment, soft directional studio light from upper-left, long quiet shadows, deep negative space, muted slate-grey background, antique-gold reflections on the metal surfaces. Shallow depth of field. ${COMMON_GUARD}`,
  },
  {
    file: "rejuran-vs-juvelook-vs-exosomes-skin-boosters-body-trio.png",
    size: "1536x1024",
    prompt: `Editorial product photography: three small unbranded medical-grade glass pharmaceutical vials arranged in a loose row on a smooth pale marble surface. The leftmost vial has clear amber-tinted contents (suggesting a polynucleotide regenerative formulation). The middle vial has faintly opalescent off-white contents (suggesting a poly-L-lactic acid biostimulator). The rightmost vial has clear water-white contents with a subtle pearlescent shimmer (suggesting an extracellular vesicle formulation). All three vials are identical in shape and size, sealed with brushed-metal crimp caps. Soft directional studio light from upper-left, long quiet shadows behind each vial. Deep negative space, generous breathing room. Muted slate-grey background, antique-gold reflections on the glass. ${COMMON_GUARD}`,
  },

  // ─── Program page hero backgrounds (5) ───────────────────────────
  {
    file: "program-signature-lifting-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of a sleek modern medical aesthetic device handpiece resting on a polished white treatment surface — handheld ultrasound applicator with a cylindrical body and flat treatment head, an unmarked transducer cartridge resting beside it. Soft side-lighting from left, deep dramatic shadow falling right, atmospheric blur in background suggesting a quiet upscale treatment room. Muted slate-grey and dark navy palette with subtle gold tonality. ${COMMON_GUARD}`,
  },
  {
    file: "program-structural-reset-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of two unmarked premium medical aesthetic device handpieces arranged on a dark slate surface in soft directional light — one elongated ultrasound applicator, one squared radiofrequency tip. Behind them, a softly out-of-focus IV drip stand and a folded white blanket suggesting a comfortable sedation environment. Deep negative space, contemplative composition, premium hospitality clinical atmosphere. Dark moody palette with antique-gold accents. ${COMMON_GUARD}`,
  },
  {
    file: "program-metacell-protocol-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of a stainless steel benchtop laboratory centrifuge on a polished pale surface, with a small unmarked clear collection tube standing beside it. In the soft-focus background, the warm glow of a horizontal LED PBM photobiomodulation light panel casts diffuse amber-red illumination. Subtle vapor mist suggests a medical-grade environment. Cinematic side-light, deep negative space, muted slate-grey palette with warm amber accents from the LED. Premium clinical atmosphere. ${COMMON_GUARD}`,
  },
  {
    file: "program-collagen-builder-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of three unmarked small medical glass vials arranged on a dark slate medical tray with sterile white gauze beside them. The vials suggest skin-booster regenerative formulations — pale cream contents in two, faint amber in one, brushed-metal crimp caps on all. Soft directional studio light, deep negative space, atmospheric out-of-focus background suggesting a quiet upscale treatment environment. Muted slate-grey palette with antique-gold reflections on metal. ${COMMON_GUARD}`,
  },
  {
    file: "program-filler-chamaka-se-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of a single unmarked small medical-grade glass pharmaceutical bottle (about 5cm tall) with a brushed-metal crimp cap, contents are a faintly opalescent off-white liquid suggesting a Korean PLLA biostimulator. Standing on a polished marble surface with sterile white gauze beside it. Soft directional light from upper-left, deep dramatic shadow, cinematic composition, generous negative space. Muted slate-grey background with antique-gold reflections. ${COMMON_GUARD}`,
  },

  // ─── Booking page hero (1) ───────────────────────────────────────
  {
    file: "page-booking-hero.png",
    size: "1536x1024",
    prompt: `Cinematic editorial wide-angle photography of a quiet modern clinic reception waiting area at first light — pale wood reception desk with a single ceramic vase holding fresh white peonies, a soft leather visitor chair facing it at a thoughtful angle, large window at left casting warm directional morning light across the wooden floor. The space is empty, no people, no signage, no posters. Calm, unhurried, premium hospitality atmosphere. Muted cream and warm gold palette. Premium hospitality photography aesthetic. ${COMMON_GUARD}`,
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
