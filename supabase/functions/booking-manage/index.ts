import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CLINIC_EMAILS = (Deno.env.get("CLINIC_NOTIFICATION_EMAIL") || "").split(",").map(e => e.trim()).filter(Boolean);
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Tune Clinic <booking@tuneclinic-global.com>";
const SITE_URL = "https://tuneclinic-global.com";
const MANAGE_FN_URL = `${supabaseUrl}/functions/v1/booking-manage`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Booking = Record<string, unknown>;

const TREATMENT_LABELS: Record<string, string> = {
  "signature-lifting": "Signature Lifting",
  "structural-reset": "Structural Reset Elite",
  "collagen-builder": "The Collagen Builder",
  "filler-chamaka-se": "Volume Chamaka-se",
  "other": "Other / Not sure yet",
};

const LOCALE_PREFIX: Record<string, string> = { en: "", ja: "ja/", zh: "zh/", th: "th/" };

function treatmentList(arr: string[]): string {
  return (arr || []).map(t => TREATMENT_LABELS[t] || t).join(", ");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul",
  });
}

function kstToLocal(dateStr: string, timeStr: string, tz: string): string {
  try {
    const kst = new Date(`${dateStr}T${timeStr}+09:00`);
    return kst.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz });
  } catch { return "—"; }
}

function manageUrl(b: Booking): string {
  const prefix = LOCALE_PREFIX[b.locale as string] || "";
  return `${SITE_URL}/${prefix}booking-manage.html?id=${b.id}`;
}

function googleCalUrl(b: Booking): string {
  const kst = new Date(`${b.appointment_date}T${b.appointment_time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = treatmentList((b.treatment_interest as string[]) || []);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Tune Clinic Appointment")}&dates=${fmt(kst)}/${fmt(end)}&details=${encodeURIComponent("Program: " + (treatments || "TBD"))}&location=${encodeURIComponent("5F, 868 Nonhyeon-ro, Gangnam-gu, Seoul")}`;
}

function icsUrl(b: Booking): string {
  return `${MANAGE_FN_URL}?id=${b.id}&ics=1`;
}

// ── Email helpers ──

async function sendEmail(to: string | string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const recipients = Array.isArray(to) ? to : [to];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject, html }),
  });
  if (!res.ok) { const body = await res.text(); return { ok: false, error: `${res.status}: ${body}` }; }
  return { ok: true };
}

function reschedulePatientHtml(b: Booking): string {
  const dateFmt = formatDate(b.appointment_date as string);
  const timeKST = (b.appointment_time as string).slice(0, 5);
  const timeLocal = kstToLocal(b.appointment_date as string, b.appointment_time as string, b.patient_timezone as string);
  const treatments = treatmentList((b.treatment_interest as string[]) || []);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Appointment Rescheduled</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          Hi <strong>${b.patient_name}</strong>,<br>
          Your appointment has been rescheduled. Here are your updated details:
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:100px;">Date</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Time</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST${timeLocal !== "—" ? ` (${timeLocal} ${b.patient_timezone})` : ""}</td></tr>
            ${treatments ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Program</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${treatments}</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;">Update your calendar:</p>
          <a href="${googleCalUrl(b)}" target="_blank" style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">📅 Google Calendar</a>
          <a href="${icsUrl(b)}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">📥 Apple / Outlook</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Need to make more changes?</p>
          <a href="${manageUrl(b)}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;">Manage Booking</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;margin-top:20px;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:700;">📍 Apgujeong Tune Clinic</p>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">5th floor, 868 Nonhyeon-ro, Gangnam-gu, Seoul</p>
        </div>
      </div>
      <div style="background:#f8fafc;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">© 2026 Apgujeong Tune Clinic · Evidence-Based Aesthetics</p>
      </div>
    </div>
  </div>
</body></html>`;
}

function cancelPatientHtml(b: Booking): string {
  const dateFmt = formatDate(b.appointment_date as string);
  const timeKST = (b.appointment_time as string).slice(0, 5);
  const treatments = treatmentList((b.treatment_interest as string[]) || []);
  const bookingUrl = `${SITE_URL}/${LOCALE_PREFIX[b.locale as string] || ""}booking.html`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Booking Cancelled</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          Hi <strong>${b.patient_name}</strong>,<br>
          Your appointment has been cancelled as requested.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">Date</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${dateFmt}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Time</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${timeKST} KST</td></tr>
            ${treatments ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Program</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${treatments}</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <p style="margin:0 0 12px;color:#334155;font-size:14px;">We'd love to see you whenever you're ready.</p>
          <a href="${bookingUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">Book New Appointment</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Questions? Reach out anytime:</p>
          <a href="https://wa.me/821076744128" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;margin:0 4px;">WhatsApp</a>
          <a href="https://www.instagram.com/tuneclinic_english/" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;margin:0 4px;">Instagram</a>
        </div>
      </div>
      <div style="background:#f8fafc;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">© 2026 Apgujeong Tune Clinic · Evidence-Based Aesthetics</p>
      </div>
    </div>
  </div>
</body></html>`;
}

function clinicRescheduleKoHtml(b: Booking): string {
  const dateFmt = formatDate(b.appointment_date as string);
  const timeKST = (b.appointment_time as string).slice(0, 5);
  const treatments = treatmentList((b.treatment_interest as string[]) || []);
  const localeLabel: Record<string, string> = { en: "영어", ja: "일본어", zh: "중국어", th: "태국어" };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #3b82f6;">
      <div style="background:#3b82f6;padding:16px 24px;">
        <h1 style="margin:0;color:#fff;font-size:16px;">🔄 예약 변경</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#334155;font-size:14px;">환자가 예약을 변경했습니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">변경된 예약일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">변경된 시간</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">프로그램</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${localeLabel[b.locale as string] || (b.locale as string).toUpperCase()}</td></tr>
        </table>
      </div>
    </div>
  </div>
</body></html>`;
}

function clinicCancelKoHtml(b: Booking): string {
  const dateFmt = formatDate(b.appointment_date as string);
  const timeKST = (b.appointment_time as string).slice(0, 5);
  const treatments = treatmentList((b.treatment_interest as string[]) || []);
  const localeLabel: Record<string, string> = { en: "영어", ja: "일본어", zh: "중국어", th: "태국어" };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #ef4444;">
      <div style="background:#ef4444;padding:16px 24px;">
        <h1 style="margin:0;color:#fff;font-size:16px;">❌ 예약 취소</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#334155;font-size:14px;">환자가 예약을 취소했습니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">취소된 예약일</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${dateFmt}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">취소된 시간</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">프로그램</td><td style="padding:6px 0;color:#64748b;font-size:14px;text-decoration:line-through;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${localeLabel[b.locale as string] || (b.locale as string).toUpperCase()}</td></tr>
        </table>
      </div>
    </div>
  </div>
</body></html>`;
}

async function notifyAll(
  patientEmail: string | null,
  patientSubject: string,
  patientHtml: string,
  clinicSubject: string,
  clinicHtml: string,
): Promise<string[]> {
  const results: string[] = [];

  if (patientEmail) {
    const { ok, error } = await sendEmail(patientEmail, patientSubject, patientHtml);
    results.push(ok ? "patient: sent" : `patient: failed (${error})`);
  }

  if (CLINIC_EMAILS.length > 0) {
    await new Promise(r => setTimeout(r, 600));
    const { ok, error } = await sendEmail(CLINIC_EMAILS, clinicSubject, clinicHtml);
    results.push(ok ? `clinic: sent to ${CLINIC_EMAILS.join(", ")}` : `clinic: failed (${error})`);
  }

  return results;
}

// ── ICS ──

function generateICS(b: Booking): string {
  const kst = new Date(`${b.appointment_date}T${b.appointment_time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = ((b.treatment_interest as string[]) || []).join(", ");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tune Clinic//Booking//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${b.id}@tuneclinic-global.com`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(kst)}`, `DTEND:${fmt(end)}`,
    "SUMMARY:Tune Clinic Appointment",
    `DESCRIPTION:Program: ${treatments || "TBD"}\\nName: ${b.patient_name}`,
    "LOCATION:5F\\, 868 Nonhyeon-ro\\, Gangnam-gu\\, Seoul",
    "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Missing id" }, 400);

      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
      if (error || !data) return json({ error: "Booking not found" }, 404);

      if (url.searchParams.get("ics") === "1") {
        return new Response(generateICS(data), {
          headers: { ...CORS, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="tune-clinic-appointment.ics"' },
        });
      }

      return json(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, id } = body;

      if (!id || !action) return json({ error: "Missing id or action" }, 400);

      const { data: existing, error: fetchErr } = await supabase
        .from("bookings").select("*").eq("id", id).single();

      if (fetchErr || !existing) return json({ error: "Booking not found" }, 404);
      if (existing.status === "cancelled") return json({ error: "Booking is already cancelled" }, 400);

      if (action === "cancel") {
        const { data, error } = await supabase
          .from("bookings").update({ status: "cancelled" }).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);

        const emailResults = await notifyAll(
          data.patient_email,
          `Booking Cancelled — ${formatDate(data.appointment_date)}`,
          cancelPatientHtml(data),
          `❌ 예약 취소: ${data.patient_name} — ${data.appointment_date} ${(data.appointment_time as string).slice(0, 5)}`,
          clinicCancelKoHtml(data),
        );

        return json({ success: true, booking: data, emails: emailResults });
      }

      if (action === "reschedule") {
        const { appointment_date, appointment_time, treatment_interest } = body;
        if (!appointment_date || !appointment_time)
          return json({ error: "Missing date or time" }, 400);

        const updates: Record<string, unknown> = {
          appointment_date,
          appointment_time: appointment_time.length === 5 ? appointment_time + ":00" : appointment_time,
          status: "pending",
        };
        if (Array.isArray(treatment_interest) && treatment_interest.length > 0) {
          updates.treatment_interest = treatment_interest;
        }

        const { data, error } = await supabase
          .from("bookings").update(updates).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);

        const emailResults = await notifyAll(
          data.patient_email,
          `Appointment Rescheduled — ${formatDate(data.appointment_date)} at ${(data.appointment_time as string).slice(0, 5)} KST`,
          reschedulePatientHtml(data),
          `🔄 예약 변경: ${data.patient_name} — ${data.appointment_date} ${(data.appointment_time as string).slice(0, 5)}`,
          clinicRescheduleKoHtml(data),
        );

        return json({ success: true, booking: data, emails: emailResults });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("booking-manage error:", err);
    return json({ error: String(err) }, 500);
  }
});
