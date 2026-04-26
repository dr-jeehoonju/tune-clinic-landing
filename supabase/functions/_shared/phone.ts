// Phone-number validation & E.164 normalization for booking submissions.
//
// Frontend concatenates the country-code <select> value with the user's
// digits before submission, so we usually receive a string that already
// looks like `+8210...`. We still:
//   1) parse with libphonenumber-js (which understands many real-world
//      formats incl. spaces, dashes, parens, leading-zeros), and
//   2) reformat to E.164 so downstream pipelines (CAPI, WhatsApp, SMS)
//      receive a consistent, machine-readable value.
//
// We deliberately avoid hard-rejecting marginal numbers — the form
// keeps phone optional, and rejecting an otherwise valid lead because
// of an unfamiliar national format would defeat the purpose. When in
// doubt we accept the trimmed input as-is and let staff confirm.

import { parsePhoneNumberFromString } from "https://esm.sh/libphonenumber-js@1.11.16";

export interface NormalizedPhone {
  ok: boolean;
  e164?: string;
  reason?: string;
}

export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  if (!raw) return { ok: true };
  const trimmed = String(raw).trim();
  if (!trimmed) return { ok: true };

  try {
    const parsed = parsePhoneNumberFromString(trimmed);
    if (parsed && parsed.isValid()) {
      return { ok: true, e164: parsed.format("E.164") };
    }
    // Fallback: accept anything that looks plausibly like a phone (4-20
    // chars of digits/space/dash/parens/plus). Treat as raw, no E.164.
    if (/^[+\d\s\-().]{4,30}$/.test(trimmed)) {
      return { ok: true };
    }
    return { ok: false, reason: "invalid-phone" };
  } catch {
    return { ok: false, reason: "invalid-phone" };
  }
}
