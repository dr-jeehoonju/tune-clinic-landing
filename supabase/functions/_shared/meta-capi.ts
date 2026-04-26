// Server-side Meta Conversion API (CAPI) helper.
//
// We send a `Lead` event from the Edge Function whenever a booking is
// inserted. The matching client-side Pixel `Lead` event sends the same
// `event_id`, so Meta de-duplicates the pair and credits the conversion
// to the ad network even when the browser blocks the Pixel.
//
// References:
//   https://developers.facebook.com/docs/marketing-api/conversions-api
//   https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
//
// Required Edge Function secrets:
//   META_PIXEL_ID
//   META_CAPI_ACCESS_TOKEN
//   META_CAPI_TEST_EVENT_CODE        (optional; only set during QA)
//   META_CAPI_API_VERSION            (optional; defaults to v20.0)

const PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const ACCESS_TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN");
const TEST_EVENT_CODE = Deno.env.get("META_CAPI_TEST_EVENT_CODE");
const API_VERSION = Deno.env.get("META_CAPI_API_VERSION") ?? "v20.0";

export interface CapiLeadInput {
  // CAPI dedupe identifiers (must match what the client Pixel sends)
  eventId: string | null | undefined;
  eventTime: number | null | undefined;
  // The booking page URL the visitor was on when they submitted
  eventSourceUrl: string | null | undefined;
  // Customer identifiers (raw, will be hashed before transmission)
  email: string | null | undefined;
  phoneE164: string | null | undefined;
  firstName: string | null | undefined;
  // Browser context
  userAgent: string | null | undefined;
  ipAddress: string | null | undefined;
  fbclid: string | null | undefined;
  // Custom data
  contentCategory: string | null | undefined;
  bookingId: string | number | null | undefined;
}

/**
 * Returns true when the function has the credentials needed to talk to
 * Meta. Used by callers to short-circuit silently in dev/preview.
 */
export function isCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Per Meta CAPI guidance:
//   email         → lowercase, trim, then SHA-256
//   phone         → digits only, then SHA-256 (we already store E.164)
//   first name    → lowercase, trim, then SHA-256
async function hashEmail(value: string | null | undefined) {
  if (!value) return undefined;
  return sha256Hex(value.trim().toLowerCase());
}

async function hashPhone(value: string | null | undefined) {
  if (!value) return undefined;
  const digits = value.replace(/\D+/g, "");
  if (!digits) return undefined;
  return sha256Hex(digits);
}

async function hashFirstName(value: string | null | undefined) {
  if (!value) return undefined;
  // First whitespace-separated token; lowercased.
  const first = value.trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return undefined;
  return sha256Hex(first);
}

/**
 * Build the `fbc` (Facebook click-id) cookie value from a `fbclid`
 * URL parameter. The format Meta expects is:
 *   fb.<subdomain-index>.<creation-time-ms>.<fbclid>
 * Subdomain index 1 is the recommended default for top-level domains.
 */
function buildFbc(fbclid: string | null | undefined, createdAtMs: number) {
  if (!fbclid) return undefined;
  return `fb.1.${createdAtMs}.${fbclid}`;
}

interface CapiResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: { message?: string; code?: number; type?: string };
}

export interface CapiSendResult {
  ok: boolean;
  status: number;
  fbtrace_id?: string;
  error?: string;
}

/**
 * Send a `Lead` event to Meta CAPI. Failures are logged but never
 * thrown — booking submission must succeed even if the marketing
 * pipeline is degraded.
 */
export async function sendLeadEvent(input: CapiLeadInput): Promise<CapiSendResult> {
  if (!isCapiConfigured()) {
    return { ok: false, status: 0, error: "capi-not-configured" };
  }

  const eventTime = (typeof input.eventTime === "number" && Number.isFinite(input.eventTime))
    ? Math.floor(input.eventTime)
    : Math.floor(Date.now() / 1000);

  const fbcCreatedAt = (input.eventTime ?? Math.floor(Date.now() / 1000)) * 1000;

  const [em, ph, fn] = await Promise.all([
    hashEmail(input.email ?? null),
    hashPhone(input.phoneE164 ?? null),
    hashFirstName(input.firstName ?? null),
  ]);

  // Meta expects arrays for em/ph/fn even with a single value.
  const userData: Record<string, unknown> = {};
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.ipAddress) userData.client_ip_address = input.ipAddress;
  const fbc = buildFbc(input.fbclid, fbcCreatedAt);
  if (fbc) userData.fbc = fbc;

  const customData: Record<string, unknown> = {
    content_name: "booking_submission",
    content_category: input.contentCategory ?? "unknown",
  };
  if (input.bookingId != null) customData.order_id = String(input.bookingId);

  const event = {
    event_name: "Lead",
    event_time: eventTime,
    event_id: input.eventId ?? undefined,
    event_source_url: input.eventSourceUrl ?? undefined,
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };

  const body: Record<string, unknown> = { data: [event] };
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN!)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as CapiResponse;
    if (!res.ok || json.error) {
      const message = json.error?.message ?? `http-${res.status}`;
      console.warn("[meta-capi] Lead event rejected", {
        status: res.status,
        fbtrace_id: json.fbtrace_id,
        error: message,
      });
      return { ok: false, status: res.status, fbtrace_id: json.fbtrace_id, error: message };
    }
    return { ok: true, status: res.status, fbtrace_id: json.fbtrace_id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[meta-capi] Lead event threw", message);
    return { ok: false, status: 0, error: message };
  }
}
