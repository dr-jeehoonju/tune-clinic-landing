// Cloudflare Turnstile token verification helper.
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// In dev, the test secret `1x0000000000000000000000000000000AA` always passes
// and `2x0000000000000000000000000000000AA` always fails. In production the
// secret is read from the `TURNSTILE_SECRET_KEY` Edge Function secret.
//
//   supabase secrets set TURNSTILE_SECRET_KEY=0xAABB...   # real key
//   supabase secrets set TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # always-pass

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  /** challenge_ts, hostname, action, cdata, ... when success */
  data?: Record<string, unknown>;
  /** Error code from Cloudflare (or our own marker) */
  error?: string;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    // Fail closed — never silently bypass CAPTCHA in production. If the
    // secret is unset on purpose (e.g. local dev with `--no-verify-jwt`),
    // explicitly set it to the always-pass test key.
    return { success: false, error: "missing-secret" };
  }
  if (!token) {
    return { success: false, error: "missing-token" };
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  let resp: Response;
  try {
    resp = await fetch(VERIFY_URL, { method: "POST", body });
  } catch (err) {
    console.error("turnstile fetch failed", err);
    return { success: false, error: "network-error" };
  }
  if (!resp.ok) {
    return { success: false, error: `http-${resp.status}` };
  }

  let json: Record<string, unknown>;
  try {
    json = await resp.json();
  } catch {
    return { success: false, error: "invalid-json" };
  }

  if (!json.success) {
    const codes = Array.isArray(json["error-codes"])
      ? (json["error-codes"] as string[]).join(",")
      : "unknown";
    return { success: false, error: codes, data: json };
  }
  return { success: true, data: json };
}
