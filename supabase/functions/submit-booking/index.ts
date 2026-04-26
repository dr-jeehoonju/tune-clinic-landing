// Public booking submission endpoint.
//
// Frontend (src/fragments/*/booking.html) used to POST directly to
// PostgREST as the `anon` role, which made CAPTCHA, rate-limit, and
// honest server-side validation impossible. After Phase 5 the form
// goes through this Edge Function. The matching migration revokes
// INSERT on `bookings` from `anon`/`authenticated`, so this is the
// only way a row can land in the table.
//
// Required Edge Function secrets:
//   SUPABASE_URL                   (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY      (auto-provided)
//   TURNSTILE_SECRET_KEY           (Cloudflare Turnstile)
//
// Deploy:
//   supabase functions deploy submit-booking --no-verify-jwt
//   (--no-verify-jwt because anonymous visitors call it from the booking page)

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { SUPPORTED_LOCALES } from "../_shared/locale.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import {
  checkRateLimit,
  clientIpFromHeaders,
  hashIp,
  recordSubmission,
} from "../_shared/rate-limit.ts";
import { normalizePhone } from "../_shared/phone.ts";
import { isCapiConfigured, sendLeadEvent } from "../_shared/meta-capi.ts";

// Used to absolutize the relative `landing_page` the form sends so that
// CAPI receives a fully-qualified `event_source_url`.
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://tuneclinic-global.com";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

const ALLOWED_TREATMENTS = new Set([
  "signature-lifting",
  "structural-reset",
  "collagen-builder",
  "filler-chamaka-se",
  "other",
]);

const ALLOWED_CONTACT_CHANNELS = new Set([
  "whatsapp",
  "instagram",
  "email",
  "kakaotalk",
  "line",
  "wechat",
  "telegram",
]);

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

interface SubmitPayload {
  turnstile_token?: string;
  honeypot?: string;
  patient_name?: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  treatment_interest?: string[];
  message?: string | null;
  locale?: string;
  patient_timezone?: string;
  appointment_date?: string;
  appointment_time?: string;
  // P0-2: marketing attribution & visit context
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  fbclid?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
  preferred_contact_channel?: string | null;
  // P0-3: CAPI dedupe identifiers
  event_id?: string | null;
  event_time?: number | null;
}

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });
}

function isIsoDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function isHmsTime(s: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(s);
}

function sanitizeString(value: unknown, max: number): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function validatePayload(p: SubmitPayload): { ok: true; row: Record<string, unknown> } | { ok: false; reason: string } {
  if (p.honeypot) return { ok: false, reason: "honeypot" };

  const name = sanitizeString(p.patient_name, 200);
  if (!name) return { ok: false, reason: "missing-name" };

  const email = sanitizeString(p.patient_email, 320);
  const phoneRaw = sanitizeString(p.patient_phone, 40);
  if (!email && !phoneRaw) return { ok: false, reason: "missing-contact" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid-email" };
  }
  const phoneCheck = normalizePhone(phoneRaw);
  if (!phoneCheck.ok) return { ok: false, reason: "invalid-phone" };
  const phone = phoneCheck.e164 ?? phoneRaw;

  const date = sanitizeString(p.appointment_date, 10);
  const time = sanitizeString(p.appointment_time, 8);
  if (!date || !isIsoDate(date)) return { ok: false, reason: "invalid-date" };
  if (!time || !isHmsTime(time)) return { ok: false, reason: "invalid-time" };

  const locale = sanitizeString(p.locale, 5) ?? "en";
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    return { ok: false, reason: "invalid-locale" };
  }

  const tz = sanitizeString(p.patient_timezone, 64) ?? "Asia/Seoul";
  const message = sanitizeString(p.message, 4000);

  const treatments = Array.isArray(p.treatment_interest)
    ? p.treatment_interest.filter((t) => typeof t === "string" && ALLOWED_TREATMENTS.has(t))
    : [];

  // ---- P0-2: attribution & context (all optional; trimmed; never thrown) ----
  const channelRaw = sanitizeString(p.preferred_contact_channel, 32);
  const preferred_contact_channel = channelRaw && ALLOWED_CONTACT_CHANNELS.has(channelRaw.toLowerCase())
    ? channelRaw.toLowerCase()
    : null;

  // event_time is a unix-epoch seconds value (number). Reject obviously
  // bogus values so we never insert garbage into a BIGINT column.
  let event_time: number | null = null;
  if (typeof p.event_time === "number" && Number.isFinite(p.event_time)) {
    const v = Math.floor(p.event_time);
    // Accept 2020-01-01 .. 2100-01-01 only.
    if (v > 1577836800 && v < 4102444800) event_time = v;
  }

  return {
    ok: true,
    row: {
      booking_type: "slot_pick",
      patient_name: name,
      patient_email: email,
      patient_phone: phone,
      treatment_interest: treatments,
      message,
      locale,
      patient_timezone: tz,
      appointment_date: date,
      appointment_time: time.length === 5 ? `${time}:00` : time,

      utm_source:   sanitizeString(p.utm_source,   200),
      utm_medium:   sanitizeString(p.utm_medium,   200),
      utm_campaign: sanitizeString(p.utm_campaign, 200),
      utm_content:  sanitizeString(p.utm_content,  200),
      utm_term:     sanitizeString(p.utm_term,     200),

      adset_id: sanitizeString(p.adset_id, 64),
      ad_id:    sanitizeString(p.ad_id,    64),
      fbclid:   sanitizeString(p.fbclid,   200),

      landing_page: sanitizeString(p.landing_page, 500),
      referrer:     sanitizeString(p.referrer,     500),
      user_agent:   sanitizeString(p.user_agent,   500),

      preferred_contact_channel,

      event_id: sanitizeString(p.event_id, 64),
      event_time,
    },
  };
}

async function slotIsFree(date: string, time: string): Promise<boolean> {
  // The `booked_slots` view filters to pending+confirmed only, which is
  // exactly the set of slots a new booking should not collide with.
  const { data, error } = await supabase
    .from("booked_slots")
    .select("appointment_date, appointment_time")
    .eq("appointment_date", date)
    .eq("appointment_time", time.length === 5 ? `${time}:00` : time)
    .limit(1);
  if (error) {
    console.error("slot check failed", error);
    // Fail closed when we can't confirm availability.
    return false;
  }
  return !data || data.length === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return jsonError(405, "method-not-allowed");
  }

  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return jsonError(400, "invalid-json");
  }

  const ip = clientIpFromHeaders(req.headers);
  const ipHash = await hashIp(ip);

  const turnstile = await verifyTurnstile(payload.turnstile_token, ip ?? undefined);
  if (!turnstile.success) {
    await recordSubmission(supabase, ipHash, false, `turnstile:${turnstile.error}`);
    return jsonError(403, "captcha-failed", { detail: turnstile.error });
  }

  const validation = validatePayload(payload);
  if (!validation.ok) {
    await recordSubmission(supabase, ipHash, false, `validation:${validation.reason}`);
    // Honeypot hits look like success to the bot to avoid retries.
    if (validation.reason === "honeypot") {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
    }
    return jsonError(400, "validation-failed", { reason: validation.reason });
  }

  const limit = await checkRateLimit(supabase, ipHash, {
    limit: RATE_LIMIT_PER_HOUR,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  });
  if (!limit.allowed) {
    await recordSubmission(supabase, ipHash, false, "rate-limited");
    return jsonError(429, "rate-limited", {
      retry_after_seconds: limit.windowSeconds,
    });
  }

  const row = validation.row as { appointment_date: string; appointment_time: string };
  const free = await slotIsFree(row.appointment_date, row.appointment_time);
  if (!free) {
    await recordSubmission(supabase, ipHash, false, "slot-taken");
    return jsonError(409, "slot-taken");
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("bookings")
    .insert(validation.row)
    .select("*")
    .single();
  if (insertErr) {
    console.error("booking insert failed", insertErr);
    await recordSubmission(supabase, ipHash, false, "db-insert-failed");
    return jsonError(500, "insert-failed");
  }

  await recordSubmission(supabase, ipHash, true, "ok");

  // ── P0-3: Meta Conversion API server-side `Lead` event ─────────────
  // Fired in parallel with the client Pixel; deduplicated via event_id.
  // Failure here is intentionally non-fatal — booking confirmation must
  // not depend on Meta's pipeline being healthy.
  if (isCapiConfigured()) {
    const persisted = inserted as Record<string, unknown> | null;
    const landingPath = (persisted?.landing_page as string | null) ?? null;
    const eventSourceUrl = landingPath
      ? (landingPath.startsWith("http") ? landingPath : `${SITE_URL}${landingPath.startsWith("/") ? "" : "/"}${landingPath}`)
      : `${SITE_URL}/`;
    const treatments = (persisted?.treatment_interest as string[] | null) ?? [];
    sendLeadEvent({
      eventId: (persisted?.event_id as string | null) ?? null,
      eventTime: (persisted?.event_time as number | null) ?? null,
      eventSourceUrl,
      email: (persisted?.patient_email as string | null) ?? null,
      phoneE164: (persisted?.patient_phone as string | null) ?? null,
      firstName: (persisted?.patient_name as string | null) ?? null,
      userAgent: (persisted?.user_agent as string | null) ?? null,
      ipAddress: ip ?? null,
      fbclid: (persisted?.fbclid as string | null) ?? null,
      contentCategory: treatments[0] ?? null,
      bookingId: (persisted?.id as string | number | null) ?? null,
    }).catch((e) => {
      console.warn("[submit-booking] CAPI sendLeadEvent threw", e);
    });
  }

  // Trigger booking-confirmation directly so the email pipeline does not
  // depend on a Supabase database webhook being configured. We mimic the
  // database webhook payload shape the function already accepts.
  try {
    const confirmRes = await fetch(`${supabaseUrl}/functions/v1/booking-confirmation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: "INSERT",
        table: "bookings",
        schema: "public",
        record: inserted,
      }),
    });
    if (!confirmRes.ok) {
      const body = await confirmRes.text().catch(() => "");
      console.error("booking-confirmation invoke failed", confirmRes.status, body);
    }
  } catch (e) {
    console.error("booking-confirmation invoke threw", e);
  }

  return new Response(
    JSON.stringify({ ok: true, id: inserted?.id ?? null }),
    { status: 200, headers: JSON_HEADERS },
  );
});
