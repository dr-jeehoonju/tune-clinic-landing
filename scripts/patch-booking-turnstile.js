#!/usr/bin/env node
/*
 * Phase 5 patch: wire every src/fragments/<locale>/booking.html to
 *   1. load Cloudflare Turnstile,
 *   2. render a Turnstile widget inside the booking form,
 *   3. submit through the new `submit-booking` Edge Function (which
 *      verifies Turnstile, applies a per-IP rate limit, and inserts
 *      using the service-role key).
 *
 * The script is idempotent — running it twice will skip already-patched
 * files. If you need to revert, re-extract from git.
 *
 * Re-run after editing the templates if any of the anchor strings drift.
 *
 *   node scripts/patch-booking-turnstile.js
 */

const fs = require("node:fs");
const path = require("node:path");

const FRAGMENTS_DIR = path.join(__dirname, "..", "src", "fragments");
const LOCALES = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi", "ko"];

// Cloudflare Turnstile sitekey for tuneclinic-global.com (public — safe
// to commit). Allowed hosts are configured on the Cloudflare dashboard.
// Demo always-pass key (for reference): 1x00000000000000000000AA.
const TURNSTILE_SITEKEY = "0x4AAAAAADAXkhXswr-HEGw6";

const TURNSTILE_SCRIPT_TAG =
  '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

const WIDGET_BLOCK = `      <div class="bkf-turnstile-wrap">
        <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITEKEY}" data-size="flexible"></div>
      </div>

      `;

const SUBMIT_BUTTON_ANCHOR = '<button type="submit" id="bkf-submit"';
const SCRIPT_MODULE_ANCHOR = '<script type="module">';
// Two source shapes ship in the locale fragments:
//   - `en/booking.html`: pretty-printed multi-line.
//   - other locales: minified single-line.
// Each anchor pair is a [originalSnippet, replacementSnippet] tuple.
const INSERT_PATTERNS = [
  {
    match: "const { error } = await supabase.from('bookings').insert(row);\n    if (error) throw error;",
    submitWrapper: (body) => body, // multi-line context already pretty.
  },
  {
    match: "const{error}=await supabase.from('bookings').insert(row);if(error)throw error;",
    submitWrapper: (body) => body,
  },
];

const NEW_SUBMIT_BLOCK = `const turnstileToken = (document.querySelector('#booking-form [name="cf-turnstile-response"]') || {}).value || '';
    if (!turnstileToken) {
      alert('Please complete the verification challenge.');
      submitBtn.disabled = false;
      if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
      return;
    }
    const submitResp = await fetch('https://jwlfffpyeczyyojcutcx.supabase.co/functions/v1/submit-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnstile_token: turnstileToken,
        honeypot: $('#bkf-hp').value,
        ...row,
      }),
    });
    const submitData = await submitResp.json().catch(() => ({}));
    if (!submitResp.ok || submitData.error) {
      if (window.turnstile) { try { window.turnstile.reset(); } catch (_) {} }
      throw new Error(submitData.error || 'submit-failed');
    }`;

function patchFile(file) {
  let src = fs.readFileSync(file, "utf8");
  let changed = false;

  if (!src.includes(TURNSTILE_SCRIPT_TAG)) {
    if (!src.includes(SCRIPT_MODULE_ANCHOR)) {
      throw new Error(`script anchor missing in ${file}`);
    }
    src = src.replace(
      SCRIPT_MODULE_ANCHOR,
      `${TURNSTILE_SCRIPT_TAG}\n\n${SCRIPT_MODULE_ANCHOR}`,
    );
    changed = true;
  }

  if (!src.includes('class="cf-turnstile"')) {
    if (!src.includes(SUBMIT_BUTTON_ANCHOR)) {
      throw new Error(`submit button anchor missing in ${file}`);
    }
    src = src.replace(
      SUBMIT_BUTTON_ANCHOR,
      `${WIDGET_BLOCK}${SUBMIT_BUTTON_ANCHOR}`,
    );
    changed = true;
  }

  if (!src.includes("/functions/v1/submit-booking")) {
    let spliced = false;
    for (const pat of INSERT_PATTERNS) {
      if (src.includes(pat.match)) {
        src = src.replace(pat.match, pat.submitWrapper(NEW_SUBMIT_BLOCK));
        spliced = true;
        changed = true;
        break;
      }
    }
    if (!spliced) {
      throw new Error(`unexpected booking submit shape in ${file}`);
    }
  }

  if (changed) {
    fs.writeFileSync(file, src);
    console.log(`✓ patched ${path.relative(process.cwd(), file)}`);
  } else {
    console.log(`= already patched ${path.relative(process.cwd(), file)}`);
  }
}

let failures = 0;
for (const locale of LOCALES) {
  const file = path.join(FRAGMENTS_DIR, locale, "booking.html");
  if (!fs.existsSync(file)) {
    console.warn(`! missing ${file}`);
    failures++;
    continue;
  }
  try {
    patchFile(file);
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} file(s) failed to patch.`);
  process.exit(1);
}
console.log(`\nAll ${LOCALES.length} locale(s) patched successfully.`);
