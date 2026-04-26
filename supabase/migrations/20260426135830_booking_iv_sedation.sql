-- Add IV sedation opt-in column to public.bookings.
--
-- Patients can opt in to IV conscious sedation directly on the booking
-- form (`iv_sedation_requested` checkbox). When true, the submit-booking
-- edge function persists the flag here, the booking-confirmation email
-- pipeline appends an 8-hour fasting + pre-appointment safety-consult
-- reminder, and the clinic-side notification highlights the request so
-- staff can confirm pre-appointment instructions before the visit.
--
-- Default `false` keeps the column safe for legacy rows and any callers
-- that have not been redeployed yet.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS iv_sedation_requested boolean DEFAULT false;

COMMENT ON COLUMN public.bookings.iv_sedation_requested IS
  'Patient opted in to IV sedation on the booking form; requires 8-hour fasting and pre-appointment safety consult.';
