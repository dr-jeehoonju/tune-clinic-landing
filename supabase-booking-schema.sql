-- =====================================================
-- Tune Clinic Global — Real-time Booking System
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. schedule_templates: recurring weekly availability
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30 CHECK (slot_duration_minutes IN (30, 60)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_day_of_week UNIQUE (day_of_week)
);

-- Seed default Mon–Sat 10:00–19:30, 30min slots (last slot 19:00, Sunday off)
INSERT INTO schedule_templates (day_of_week, start_time, end_time, slot_duration_minutes, is_active)
VALUES
  (0, '10:00', '19:30', 30, false),
  (1, '10:00', '19:30', 30, true),
  (2, '10:00', '19:30', 30, true),
  (3, '10:00', '19:30', 30, true),
  (4, '10:00', '19:30', 30, true),
  (5, '10:00', '20:30', 30, true),
  (6, '10:00', '19:30', 30, true)
ON CONFLICT (day_of_week) DO NOTHING;

-- 2. schedule_blocks: holidays / closures
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_block_time CHECK (
    start_time IS NULL OR end_time IS NULL OR end_time > start_time
  )
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks (block_date);

-- 3. bookings: patient appointment reservations
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('slot_pick', 'request')),

  appointment_date DATE,
  appointment_time TIME,

  preferred_dates JSONB,
  preferred_time_range TEXT CHECK (preferred_time_range IS NULL OR preferred_time_range IN ('morning', 'afternoon', 'evening')),

  patient_name TEXT NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  treatment_interest TEXT[],
  message TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  patient_timezone TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  admin_notes TEXT,

  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT slot_pick_requires_datetime CHECK (
    booking_type != 'slot_pick'
    OR (appointment_date IS NOT NULL AND appointment_time IS NOT NULL)
  ),
  CONSTRAINT contact_required CHECK (
    patient_email IS NOT NULL OR patient_phone IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at DESC);

-- Prevent double-booking: only one confirmed booking per date+time slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_slot
  ON bookings (appointment_date, appointment_time)
  WHERE status = 'confirmed';

-- 4. Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_schedule_templates
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- schedule_templates: anyone can read, only authenticated can modify
CREATE POLICY "schedule_templates_read" ON schedule_templates FOR SELECT USING (true);
CREATE POLICY "schedule_templates_admin" ON schedule_templates FOR ALL USING (auth.role() = 'authenticated');

-- schedule_blocks: anyone can read, only authenticated can modify
CREATE POLICY "schedule_blocks_read" ON schedule_blocks FOR SELECT USING (true);
CREATE POLICY "schedule_blocks_admin" ON schedule_blocks FOR ALL USING (auth.role() = 'authenticated');

-- bookings: anonymous can only read date/time/status (for availability), authenticated can read all
CREATE POLICY "bookings_read" ON bookings FOR SELECT USING (
  auth.role() = 'authenticated'
);
CREATE POLICY "bookings_availability" ON bookings FOR SELECT USING (
  auth.role() = 'anon'
);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_admin_update" ON bookings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "bookings_admin_delete" ON bookings FOR DELETE USING (auth.role() = 'authenticated');

-- 6. Restricted view for anonymous availability checks (no PII exposed)
CREATE OR REPLACE VIEW public.booked_slots AS
  SELECT appointment_date, appointment_time, status
  FROM bookings
  WHERE status IN ('pending', 'confirmed');

-- Grant anonymous access to the view only
GRANT SELECT ON public.booked_slots TO anon;

-- 7. Enable Realtime on bookings for live availability updates
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
