// Per-IP rate limiting backed by `public.booking_submission_log`.
//
// Strategy:
//   1. Hash the IP (so we never persist raw addresses).
//   2. Count successful submissions in the past `windowSeconds`.
//   3. Reject if >= maxAttempts; otherwise the caller should record
//      a row via `recordSubmission(...)` after inserting the booking.
//
// We rely on Postgres for persistence so multiple Edge Function
// instances share state. The table is small (rows expire after a
// configurable retention window via `purge_booking_submission_log`).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLE = "booking_submission_log";

export interface RateLimitResult {
  allowed: boolean;
  /** Current count within the window. */
  count: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /** Configured limit. */
  limit: number;
}

const encoder = new TextEncoder();

export async function hashIp(ip: string | null | undefined): Promise<string> {
  if (!ip) return "unknown";
  // We want a stable, non-reversible identifier. SHA-256 is plenty.
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function clientIpFromHeaders(headers: Headers): string | null {
  // Supabase Edge Functions run behind their own proxy; the originating
  // IP comes through `x-forwarded-for` (most-distant-proxy first item).
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("cf-connecting-ip") || headers.get("x-real-ip");
}

export async function checkRateLimit(
  client: SupabaseClient,
  ipHash: string,
  opts: { limit?: number; windowSeconds?: number } = {},
): Promise<RateLimitResult> {
  const limit = opts.limit ?? 5;
  const windowSeconds = opts.windowSeconds ?? 60 * 60; // 1 hour
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await client
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("succeeded", true)
    .gte("created_at", since);

  if (error) {
    console.error("rate-limit query failed; failing open", error);
    return { allowed: true, count: 0, windowSeconds, limit };
  }
  const c = count ?? 0;
  return { allowed: c < limit, count: c, windowSeconds, limit };
}

export async function recordSubmission(
  client: SupabaseClient,
  ipHash: string,
  succeeded: boolean,
  reason?: string,
): Promise<void> {
  const { error } = await client.from(TABLE).insert({
    ip_hash: ipHash,
    succeeded,
    reason: reason ?? null,
  });
  if (error) console.error("rate-limit log insert failed", error);
}
