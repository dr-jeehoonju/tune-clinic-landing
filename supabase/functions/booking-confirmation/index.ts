import "@supabase/functions-js/edge-runtime.d.ts";

import {
  CLINIC_EMAILS,
  notifyAll,
  sendEmail,
} from "../_shared/email.ts";
import { dDayLabel, formatDate, kstToLocal } from "../_shared/format.ts";
import { LOCALE_LABELS_KO, treatmentList } from "../_shared/locale.ts";
import { manageUrl } from "../_shared/booking-urls.ts";
import {
  clinicActionsHtml,
  clinicContactHtml,
  clinicLocationHtml,
  clinicQuickReplyHtml,
} from "../_shared/clinic-html.ts";

interface BookingRecord {
  id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  treatment_interest: string[];
  message: string | null;
  locale: string;
  patient_timezone: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: BookingRecord;
  schema: string;
}

async function patientEmailHtml(b: BookingRecord): Promise<string> {
  const dateFormatted = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(
    b.appointment_date,
    b.appointment_time,
    b.patient_timezone,
  );
  const treatments = treatmentList(b.treatment_interest, b.locale);
  const manageHref = await manageUrl(b);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Booking Request Received</p>
      </div>

      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          Hi <strong>${b.patient_name}</strong>,<br>
          Thank you for your booking request. Here are the details we received:
        </p>

        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;width:100px;">Date</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Time</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST${timeLocal !== "—" ? ` (${timeLocal} ${b.patient_timezone})` : ""}</td>
            </tr>
            ${treatments ? `<tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;">Program</td>
              <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${treatments}</td>
            </tr>` : ""}
          </table>
        </div>

        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:#fef3c7;color:#92400e;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;">⏳ Awaiting Confirmation</span>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;">What happens next?</p>
          <ol style="margin:0;padding:0 0 0 18px;color:#92400e;font-size:13px;line-height:1.8;">
            <li>Send us a message with your name via any messenger below</li>
            <li>Our counselor will assist you during business hours</li>
            <li>Once confirmed, you'll receive a confirmation email</li>
          </ol>
        </div>

        <div style="background:#0f172a;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
          <p style="margin:0 0 14px;color:#c9a55a;font-size:14px;font-weight:700;">Contact us to confirm your booking</p>
          <div>
            <a href="https://wa.me/821076744128" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">💬 WhatsApp</a>
            <a href="https://www.instagram.com/tuneclinic_english/" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">📸 Instagram</a>
          </div>
          <div style="margin-top:8px;">
            <a href="https://line.me/R/ti/p/@tuneclinic" style="display:inline-block;background:#06c755;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">💚 LINE</a>
            <a href="https://wa.me/821076744128" style="display:inline-block;background:#07c160;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">🟢 WeChat</a>
          </div>
          <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">Mon–Fri 10:00–21:00 · Sat 10:00–16:00 (KST)</p>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Need to change your plans?</p>
          <a href="${manageHref}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">Reschedule or Cancel</a>
          <a href="${manageHref}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">Change Program</a>
        </div>

        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;margin-top:8px;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:700;">📍 Apgujeong Tune Clinic</p>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
            5th floor, 868 Nonhyeon-ro, Gangnam-gu, Seoul<br>
            Mon–Fri 10:00–21:00 · Sat 10:00–16:00
          </p>
        </div>
      </div>

      <div style="background:#f8fafc;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">© 2026 Apgujeong Tune Clinic · Evidence-Based Aesthetics</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function clinicNotificationKoHtml(b: BookingRecord): Promise<string> {
  const dateFormatted = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest, "en");
  const dday = dDayLabel(b.appointment_date);
  const actions = await clinicActionsHtml(b, true);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #c9a55a;">
      <div style="background:#c9a55a;padding:16px 24px;">
        <table style="width:100%;"><tr>
          <td><h1 style="margin:0;color:#fff;font-size:16px;">🔔 새 예약 접수</h1></td>
          <td style="text-align:right;"><span style="background:rgba(255,255,255,0.25);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${dday}</span></td>
        </tr></table>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">예약일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFormatted}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">프로그램</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간대</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_timezone}</td></tr>
          ${b.message ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">메모</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.message}</td></tr>` : ""}
        </table>
        ${clinicContactHtml(b)}
        ${clinicQuickReplyHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Internal-only function. Deployed with `--no-verify-jwt` so the gateway
// does not reject Supabase's new non-JWT secret keys, but we enforce a
// shared-secret check here: only callers that present the project's
// service role key in the Authorization header are accepted. submit-booking
// (Phase 5) and the legacy bookings INSERT database webhook both already
// send this header.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "bookings") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const booking = payload.record;
    const [patientHtml, clinicHtml] = await Promise.all([
      patientEmailHtml(booking),
      clinicNotificationKoHtml(booking),
    ]);

    const results: string[] = [];

    if (booking.patient_email) {
      const { ok, error } = await sendEmail(
        booking.patient_email,
        `Booking Request Received — ${formatDate(booking.appointment_date)} at ${booking.appointment_time.slice(0, 5)} KST`,
        patientHtml,
      );
      results.push(ok ? "patient: sent" : `patient: failed (${error})`);
    } else {
      results.push("patient: skipped (no email)");
    }

    if (CLINIC_EMAILS.length > 0) {
      await new Promise((r) => setTimeout(r, 600));
      const { ok, error } = await sendEmail(
        CLINIC_EMAILS,
        `🔔 새 예약: ${booking.patient_name} — ${booking.appointment_date} ${booking.appointment_time.slice(0, 5)}`,
        clinicHtml,
      );
      results.push(
        ok
          ? `clinic: sent to ${CLINIC_EMAILS.join(", ")}`
          : `clinic: failed (${error})`,
      );
    }

    console.log("Email results:", results.join(" | "));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("booking-confirmation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Touch unused imports so the bundler keeps them (notifyAll is exported
// from the shared module for consistency with booking-manage).
void notifyAll;
