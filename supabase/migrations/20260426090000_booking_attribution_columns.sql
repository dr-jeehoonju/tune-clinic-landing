-- =====================================================
-- Tune Clinic — Booking Attribution & Context Columns
-- =====================================================
-- Adds the metadata fields needed to:
--   1) attribute booking submissions back to ad campaigns
--      (utm_*, fbclid, ad_id, adset_id),
--   2) carry context into AetherHeal patient-navigation analytics
--      (referrer, landing_page, locale, timezone, user_agent),
--   3) let staff know which channel the patient prefers for follow-up
--      (preferred_contact_channel),
--   4) carry CAPI dedupe identifiers (event_id, event_time) so the
--      submit-booking Edge Function can mirror the client Pixel event.
--
-- All columns are nullable so historical bookings remain valid and
-- the public form keeps working if the client-side metadata script
-- is missing (e.g. ad-blocker / privacy extension).
--
-- Apply via: Supabase Dashboard → SQL Editor (recommended)
--            or: supabase db push
-- =====================================================

BEGIN;

-- 1. Marketing attribution (UTM)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS utm_content  TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS utm_term     TEXT;

-- 2. Meta-specific ad attribution
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS adset_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ad_id    TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fbclid   TEXT;

-- 3. Visit context (page-load metadata, captured client-side)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referrer     TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_agent   TEXT;

-- 4. Patient routing preference
--    Free-form (TEXT) so we can introduce new channels (e.g. Telegram,
--    LINE, WeChat) without another migration. The Edge Function
--    validates the value against an allowlist before insert.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT;

-- 5. Meta CAPI dedupe identifiers (paired with the client Pixel event).
--    `event_id` is generated client-side (crypto.randomUUID), echoed
--    to the server, and re-sent inside the CAPI payload so Meta can
--    de-duplicate the browser + server events.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_id   TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS event_time BIGINT;

-- 6. Helpful indexes for ad reporting (kept narrow on purpose).
CREATE INDEX IF NOT EXISTS idx_bookings_utm_campaign ON public.bookings (utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_fbclid       ON public.bookings (fbclid)       WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_event_id     ON public.bookings (event_id)     WHERE event_id IS NOT NULL;

COMMIT;

-- =====================================================
-- Verification:
--
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'bookings'
--   ORDER BY ordinal_position;
--
-- Expected: the 14 new columns above appear at the end of the list.
-- =====================================================
