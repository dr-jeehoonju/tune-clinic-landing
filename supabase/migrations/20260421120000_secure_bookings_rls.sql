-- =====================================================
-- Tune Clinic — Booking RLS Hardening
-- =====================================================
-- Goal:
--   1) Stop anonymous users from reading the full `bookings` table
--      (which previously leaked patient PII via the
--       `bookings_availability` policy).
--   2) Keep slot availability information available to the
--      public web app via the `booked_slots` view (which only
--      exposes appointment_date / appointment_time / status).
--
-- Apply via: Supabase Dashboard → SQL Editor (recommended)
--            or: supabase db push
-- =====================================================

BEGIN;

-- 1. Drop the over-broad anonymous SELECT policy.
DROP POLICY IF EXISTS "bookings_availability" ON public.bookings;

-- 2. Make the authenticated-only SELECT policy explicit and
--    idempotent so re-runs are safe.
DROP POLICY IF EXISTS "bookings_read" ON public.bookings;
CREATE POLICY "bookings_read_authenticated"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Recreate the public availability view with explicit
--    `security_invoker = false` (default) so it runs with the
--    view owner's privileges and bypasses RLS on `bookings`.
--    Only non-PII columns are exposed.
DROP VIEW IF EXISTS public.booked_slots;
CREATE VIEW public.booked_slots
  WITH (security_barrier = true)
AS
  SELECT appointment_date, appointment_time, status
  FROM public.bookings
  WHERE status IN ('pending', 'confirmed');

-- 4. Permission grants for the view.
REVOKE ALL ON public.booked_slots FROM PUBLIC;
GRANT SELECT ON public.booked_slots TO anon;
GRANT SELECT ON public.booked_slots TO authenticated;

-- 5. Make sure inserts from the public booking form keep working.
--    Existing policy `bookings_insert` already allows this; we
--    re-create it idempotently and scope it to `anon`/`authenticated`
--    explicitly so no role surprise can grant DELETE/UPDATE later.
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
CREATE POLICY "bookings_insert_public"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. UPDATE / DELETE remain authenticated-only (service role
--    bypasses RLS, so Edge Functions still work).
DROP POLICY IF EXISTS "bookings_admin_update" ON public.bookings;
CREATE POLICY "bookings_admin_update"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_admin_delete" ON public.bookings;
CREATE POLICY "bookings_admin_delete"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (true);

-- 7. Defense-in-depth: explicitly revoke direct table access
--    from the anon role. anon should ONLY:
--      - INSERT new bookings (covered by policy above)
--      - SELECT from the booked_slots view (covered above)
REVOKE SELECT, UPDATE, DELETE ON public.bookings FROM anon;

COMMIT;

-- =====================================================
-- Verification queries (run as anon role in Studio):
--
--   SELECT * FROM bookings LIMIT 1;
--     → expected: permission denied OR empty result
--
--   SELECT * FROM booked_slots LIMIT 1;
--     → expected: returns date/time/status only
--
--   INSERT INTO bookings (booking_type, patient_name, patient_email, ...)
--     VALUES (...);
--     → expected: success
-- =====================================================
