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
  const phone = sanitizeString(p.patient_phone, 40);
  if (!email && !phone) return { ok: false, reason: "missing-contact" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid-email" };
  }

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
