// HMAC-signed token utility for booking management actions.
//
// We cannot rely on the booking UUID alone as the auth token: it is
// emailed to patients and clinic staff, which means it leaks via
// browser history, referer headers, email forwarding, etc. Anyone
// who learns a booking ID could otherwise cancel/reschedule/confirm
// the appointment.
//
// Tokens are short, URL-safe, and bind:
//   - booking id
//   - allowed action ("manage" | "confirm" | "cancel" | "reschedule" | ...)
//   - expiry (epoch seconds)
//
// Format: base64url(payload).base64url(hmac_sha256(payload))
// Payload: <id>|<action>|<exp>

const SECRET = Deno.env.get("BOOKING_HMAC_SECRET") || "";

if (!SECRET) {
  console.warn(
    "[token] BOOKING_HMAC_SECRET is not set. " +
    "All token verification will fail. " +
    "Run: supabase secrets set BOOKING_HMAC_SECRET=<random-hex-64>",
  );
}

const encoder = new TextEncoder();

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedKey;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(s: string): string {
  return b64url(encoder.encode(s));
}

function b64urlDecodeStr(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (s.length % 4)) % 4);
  return atob(padded);
}

function b64urlDecodeBytes(s: string): Uint8Array {
  const str = b64urlDecodeStr(s);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export type TokenAction =
  | "manage"
  | "confirm"
  | "cancel"
  | "reschedule"
  | "update_program"
  | "ics";

export interface TokenPayload {
  id: string;
  action: TokenAction;
  exp: number; // epoch seconds
}

const DEFAULT_TTL_DAYS: Record<TokenAction, number> = {
  manage: 90,         // patient self-service link in confirmation email
  confirm: 30,        // staff "approve" button in clinic email
  cancel: 90,         // patient cancel
  reschedule: 90,     // patient reschedule
  update_program: 90, // patient program change
  ics: 365,           // calendar download stays valid long-term
};

export async function signToken(
  id: string,
  action: TokenAction,
  ttlSeconds?: number,
): Promise<string> {
  const ttl = ttlSeconds ?? DEFAULT_TTL_DAYS[action] * 86400;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${id}|${action}|${exp}`;
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${b64urlEncodeStr(payload)}.${b64url(sig)}`;
}

export interface VerifyResult {
  ok: boolean;
  payload?: TokenPayload;
  reason?: "missing" | "malformed" | "bad_signature" | "expired" | "no_secret";
}

export async function verifyToken(
  token: string | null | undefined,
  expectedId: string,
  expectedActions: TokenAction[],
): Promise<VerifyResult> {
  if (!SECRET) return { ok: false, reason: "no_secret" };
  if (!token) return { ok: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [payloadB64, sigB64] = parts;
  let payloadStr: string;
  try {
    payloadStr = b64urlDecodeStr(payloadB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const fields = payloadStr.split("|");
  if (fields.length !== 3) return { ok: false, reason: "malformed" };

  const [id, action, expStr] = fields;
  const exp = Number(expStr);
  if (!id || !action || !Number.isFinite(exp)) {
    return { ok: false, reason: "malformed" };
  }

  const key = await getKey();
  let sigBytes: Uint8Array;
  try {
    sigBytes = b64urlDecodeBytes(sigB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payloadStr)),
  );
  if (!constantTimeEqual(sigBytes, expectedSig)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (Math.floor(Date.now() / 1000) > exp) {
    return { ok: false, reason: "expired" };
  }

  if (id !== expectedId) return { ok: false, reason: "bad_signature" };
  if (!expectedActions.includes(action as TokenAction)) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true, payload: { id, action: action as TokenAction, exp } };
}
