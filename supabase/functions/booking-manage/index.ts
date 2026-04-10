import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function generateICS(b: Record<string, unknown>): string {
  const kst = new Date(`${b.appointment_date}T${b.appointment_time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = ((b.treatment_interest as string[]) || []).join(", ");
  const now = fmt(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tune Clinic//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@tuneclinic-global.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(kst)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Tune Clinic Appointment",
    `DESCRIPTION:Program: ${treatments || "TBD"}\\nName: ${b.patient_name}`,
    "LOCATION:5F\\, 868 Nonhyeon-ro\\, Gangnam-gu\\, Seoul",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const url = new URL(req.url);

  try {
    // ── GET: fetch booking or download ICS ──
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Missing id" }, 400);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) return json({ error: "Booking not found" }, 404);

      if (url.searchParams.get("ics") === "1") {
        return new Response(generateICS(data), {
          headers: {
            ...CORS,
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="tune-clinic-appointment.ics"',
          },
        });
      }

      return json(data);
    }

    // ── POST: cancel or reschedule ──
    if (req.method === "POST") {
      const body = await req.json();
      const { action, id } = body;

      if (!id || !action) return json({ error: "Missing id or action" }, 400);

      // Verify booking exists and isn't already cancelled
      const { data: existing, error: fetchErr } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("id", id)
        .single();

      if (fetchErr || !existing)
        return json({ error: "Booking not found" }, 404);

      if (existing.status === "cancelled")
        return json({ error: "Booking is already cancelled" }, 400);

      if (action === "cancel") {
        const { data, error } = await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", id)
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, booking: data });
      }

      if (action === "reschedule") {
        const { appointment_date, appointment_time, treatment_interest } = body;
        if (!appointment_date || !appointment_time)
          return json({ error: "Missing date or time" }, 400);

        const updates: Record<string, unknown> = {
          appointment_date,
          appointment_time: appointment_time.length === 5
            ? appointment_time + ":00"
            : appointment_time,
          status: "pending",
        };

        if (Array.isArray(treatment_interest) && treatment_interest.length > 0) {
          updates.treatment_interest = treatment_interest;
        }

        const { data, error } = await supabase
          .from("bookings")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, booking: data });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("booking-manage error:", err);
    return json({ error: String(err) }, 500);
  }
});
