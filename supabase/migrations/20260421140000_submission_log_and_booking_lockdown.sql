-- =====================================================================
-- Phase 5 — Lock down direct booking inserts and add a rate-limit log.
--
-- The booking form previously POSTed directly to PostgREST as `anon`,
-- which meant no CAPTCHA, no rate limit, and no server-side validation
-- could be enforced. After this migration, all booking submissions must
-- go through the `submit-booking` Edge Function (running with the
-- service-role key). The function:
--   1. Verifies the Cloudflare Turnstile token.
--   2. Checks the per-IP rate limit against `booking_submission_log`.
--   3. Performs the actual insert.
--
-- Run this AFTER deploying the `submit-booking` Edge Function and
-- after switching the frontend to call it (otherwise the form will
-- start failing immediately).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Per-IP submission log (rate-limit ledger).
--    One row per submission attempt that passed Turnstile + honeypot.
--    The Edge Function inserts into this table inside the same
--    transaction as the booking row to prevent races.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_submission_log (
  id           BIGSERIAL PRIMARY KEY,
  ip_hash      TEXT NOT NULL,
  succeeded    BOOLEAN NOT NULL DEFAULT true,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_submission_log_ip_time
  ON public.booking_submission_log (ip_hash, created_at DESC);

ALTER TABLE public.booking_submission_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.booking_submission_log FROM PUBLIC;
REVOKE ALL ON public.booking_submission_log FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.booking_submission_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.booking_submission_log_id_seq TO service_role;

-- Authenticated dashboard access (admin reviewing abuse trends).
CREATE POLICY "submission_log_admin_read"
  ON public.booking_submission_log
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------
-- 2. Lock down `bookings.INSERT` to the service role only.
--    Frontend can no longer hit PostgREST directly.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_insert_public" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;

REVOKE INSERT ON public.bookings FROM anon;
REVOKE INSERT ON public.bookings FROM authenticated;
GRANT  INSERT ON public.bookings TO service_role;

-- ---------------------------------------------------------------------
-- 3. Optional housekeeping: a function to purge old rate-limit rows.
--    Call it from a Supabase scheduled job (pg_cron) if desired.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_booking_submission_log(retention INTERVAL DEFAULT INTERVAL '7 days')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed BIGINT;
BEGIN
  DELETE FROM public.booking_submission_log
   WHERE created_at < (now() - retention);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_booking_submission_log(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_booking_submission_log(INTERVAL) TO service_role;

COMMIT;
