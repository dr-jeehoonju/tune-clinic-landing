# Security Rollout

This document captures the **exact steps** required to deploy each phase
of the security work. Follow them **in order within a phase** — for
Phase 1 the migration must land before the Edge Function deploy,
otherwise the new function will reject booking management requests but
RLS will still be leaking PII. Phase 5 has its own ordering rules
(deploy the function first, then the migration that revokes anon
INSERT, otherwise the booking form goes down).

## 0. Prerequisites

- Supabase CLI ≥ 1.180 installed (`supabase --version`)
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref jwlfffpyeczyyojcutcx`

## 1. Generate a HMAC secret (one-time)

The booking-manage / booking-confirmation functions sign all
self-service URLs with HMAC-SHA256. Generate **one** 32-byte hex secret
and store it permanently — rotating it invalidates every outstanding
"Manage / Reschedule / Cancel" link in patient inboxes.

```bash
openssl rand -hex 32
# example output:
# 11ef1507ba796c99fd51bbf98c8c26a8b52e5bf8960fd3ef58a949d4e94588cf
```

Store the value in your password manager **before** moving on.

## 2. Set Edge Function secrets

```bash
supabase secrets set BOOKING_HMAC_SECRET=<the-hex-string-from-step-1>

# Make sure these are still set (skip if already configured):
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set FROM_EMAIL='Tune Clinic <booking@tuneclinic-global.com>'
supabase secrets set CLINIC_NOTIFICATION_EMAIL='clinic@example.com'
```

Verify:

```bash
supabase secrets list
```

You should see `BOOKING_HMAC_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`,
`CLINIC_NOTIFICATION_EMAIL`.

## 3. Apply the RLS migration

The migration drops the over-broad `bookings_availability` policy that
allowed anonymous users to read every patient's name, email, phone,
message, and treatment preferences.

### Option A — Supabase Dashboard (recommended, manual review)

1. Open the [SQL Editor](https://supabase.com/dashboard/project/jwlfffpyeczyyojcutcx/sql/new).
2. Paste the contents of
   `supabase/migrations/20260421120000_secure_bookings_rls.sql`.
3. Run.
4. In the **Verification** section at the bottom of the migration,
   run the three test queries to confirm:
   - `SELECT * FROM bookings` as anon → empty / permission denied
   - `SELECT * FROM booked_slots` as anon → returns rows
   - `INSERT INTO bookings (...)` as anon → success

### Option B — `supabase db push`

```bash
supabase db push
```

The CLI will diff and apply only the new migration file.

## 4. Deploy the Edge Functions

```bash
supabase functions deploy booking-confirmation
supabase functions deploy booking-manage
```

The new versions:

- Reject any GET/POST without a valid HMAC token (`?t=...` or `body.token`)
- Re-issue tokens on every email send (long TTL: 30–365 days per action)

## 5. Smoke-test in production

1. Submit a test booking from the public form
   (`https://tuneclinic-global.com/booking.html`).
2. You should receive **two** emails:
   - Patient confirmation request
   - Clinic notification (KO copy)
3. Click **"Manage Booking"** in the patient email — the page must
   load and show your details.
4. Click **"예약 확정"** in the clinic email — you must be redirected
   to the manage page with `msg=confirmed`.
5. **Negative test**: copy the booking UUID and visit
   `https://jwlfffpyeczyyojcutcx.supabase.co/functions/v1/booking-manage?id=<UUID>`
   without a `t=` parameter. You must receive
   `{"error":"unauthorized","reason":"missing"}`.

If step 5 still returns booking data, the new function did not deploy
— re-run `supabase functions deploy booking-manage`.

## 6. (Optional) Clean up old emails

Existing patient emails sent **before** this rollout contain
`/booking-manage.html?id=<UUID>` links **without** a token. After the
rollout these links will show "Booking not found" because the page
calls the function without a token. If you have any active bookings:

- Either re-send the confirmation email (which will now include a
  signed token), or
- Use the Studio to manage them directly.

You can identify affected bookings with:

```sql
SELECT id, patient_email, appointment_date, status
FROM bookings
WHERE status IN ('pending', 'confirmed')
  AND created_at < NOW();
```

---

# Phase 5 — Turnstile + Rate Limit Rollout

Phase 5 closes off the public booking form against bots and runaway
submissions. After this rollout:

- Every booking POST goes through the new `submit-booking` Edge Function.
- The function enforces Cloudflare Turnstile, a per-IP rate limit
  (5 / hour), and a server-side slot-availability check.
- `anon` and `authenticated` lose `INSERT` on `bookings`. Direct
  PostgREST writes will fail.

**Deploy order matters.** If the migration runs before the function
exists, the booking form will start failing for everyone.

## P5.1 — Cloudflare Turnstile setup

1. Create a Turnstile site at
   <https://dash.cloudflare.com/?to=/:account/turnstile>.
2. Add hostnames: `tuneclinic-global.com` (and any preview domains).
3. Copy the **sitekey** and **secret**.
4. (Local dev only) For testing without registering, the demo keys are:

   | Behaviour | Sitekey | Secret |
   |---|---|---|
   | Always pass | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
   | Always fail | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

The repo currently ships the **always-pass** demo sitekey hard-coded in
`src/fragments/*/booking.html`. Before going live, swap it out:

```bash
node -e "const fs=require('fs');for(const l of ['en','ja','zh','th','de','fr','ru','vi']){const p=\`src/fragments/\${l}/booking.html\`;const s=fs.readFileSync(p,'utf8').replaceAll('1x00000000000000000000AA','<YOUR_SITEKEY>');fs.writeFileSync(p,s);}"
```

Then rebuild (`npm run build`) and redeploy Netlify.

## P5.2 — Set the Turnstile secret on Supabase

```bash
supabase secrets set TURNSTILE_SECRET_KEY=<your-secret>
supabase secrets list   # confirm TURNSTILE_SECRET_KEY appears
```

For staging tests with the always-pass demo key:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

## P5.3 — Deploy the Edge Function

```bash
supabase functions deploy submit-booking --no-verify-jwt
```

`--no-verify-jwt` is required because anonymous booking visitors call
this endpoint without an auth header. The function instead relies on
Turnstile + rate-limit + payload validation.

Smoke test (dummy payload, demo Turnstile key):

```bash
curl -i -X POST https://jwlfffpyeczyyojcutcx.supabase.co/functions/v1/submit-booking \
  -H 'content-type: application/json' \
  -d '{
    "turnstile_token":"XXXX.DUMMY.TOKEN.XXXX",
    "patient_name":"Smoke Test",
    "patient_email":"smoke@example.com",
    "appointment_date":"2099-01-02",
    "appointment_time":"10:00:00"
  }'
```

You should get `403 captcha-failed` (the dummy token is invalid).
With the always-pass demo secret this should succeed if you swap in any
non-empty token (the Cloudflare endpoint accepts the demo token shape).

## P5.4 — Apply the migration that locks down `bookings`

Only after the function is deployed and the new front-end has shipped
to Netlify (so visitors are already POSTing through `submit-booking`),
apply:

```
supabase/migrations/20260421140000_submission_log_and_booking_lockdown.sql
```

This migration:

- Creates `public.booking_submission_log` (rate-limit ledger).
- Drops the `bookings_insert_public` policy.
- Revokes `INSERT` on `bookings` from `anon` and `authenticated`.
- Adds `purge_booking_submission_log(retention)` for housekeeping.

Apply via the Dashboard SQL editor (preferred) or `supabase db push`.

## P5.5 — Verify

1. Open `/booking.html` in a fresh incognito window.
2. The Turnstile widget should render under the form.
3. Submit a test booking — confirmation flow should still work end-to-end.
4. Inspect `booking_submission_log` in the Supabase Dashboard:

   ```sql
   SELECT created_at, succeeded, reason
   FROM booking_submission_log
   ORDER BY created_at DESC
   LIMIT 10;
   ```

5. Submit > 5 bookings from the same IP within an hour — the 6th must
   return HTTP 429 with `{"error":"rate-limited"}`.
6. (Optional) Try writing directly to PostgREST as anon:

   ```bash
   curl -i -X POST 'https://jwlfffpyeczyyojcutcx.supabase.co/rest/v1/bookings' \
     -H "apikey: <anon-key>" -H "content-type: application/json" \
     -d '{"booking_type":"slot_pick","patient_name":"x","patient_email":"x@y.z","appointment_date":"2099-01-01","appointment_time":"10:00:00","locale":"en"}'
   ```

   Should return `403 permission denied` after the migration.

## P5.6 — Optional pg_cron for log retention

Run weekly to keep the rate-limit table small:

```sql
SELECT cron.schedule(
  'purge-submission-log',
  '0 3 * * 0',
  $$ SELECT public.purge_booking_submission_log(INTERVAL '7 days'); $$
);
```

## P5.7 — Rollback plan

- **Function**: redeploy previous version via Dashboard → Edge Functions
  → submit-booking → Versions → Promote previous (or simply skip the
  P5.4 migration so the old direct-INSERT path keeps working).
- **Migration**: re-grant `INSERT` to recover the old behaviour:

  ```sql
  GRANT INSERT ON public.bookings TO anon;
  CREATE POLICY "bookings_insert_public" ON public.bookings
    FOR INSERT TO anon, authenticated WITH CHECK (true);
  ```

  Leave `booking_submission_log` in place; it does no harm if unused.

---

## Phase 1 rollback (reference)

If anything in Phase 1 needs to be unwound:

```bash
supabase functions deploy booking-confirmation --import-map ... # previous version
supabase functions deploy booking-manage --import-map ...
```

Or via the Dashboard: **Edge Functions → booking-manage → Versions →
Promote previous**.

The RLS migration **should not** be rolled back — the previous policy
was a known PII leak.
