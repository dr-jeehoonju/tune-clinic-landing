import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { notifyAll } from "../_shared/email.ts";
import { dDayLabel, formatDate, kstToLocal } from "../_shared/format.ts";
import { LOCALE_LABELS_KO, treatmentList } from "../_shared/locale.ts";
import {
  bookingPageUrl,
  googleCalUrl,
  icsUrl,
  manageUrl,
  signToken,
  type TokenAction,
} from "../_shared/booking-urls.ts";
import {
  clinicActionsHtml,
  clinicContactHtml,
  clinicLocationHtml,
  clinicQuickReplyHtml,
} from "../_shared/clinic-html.ts";
import { generateICS } from "../_shared/ics.ts";
import { verifyToken } from "../_shared/token.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Booking = Record<string, unknown> & {
  id: string;
  locale: string;
  appointment_date: string;
  appointment_time: string;
  treatment_interest?: string[];
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  patient_timezone: string;
  status: string;
};

// ── Patient-facing email templates ──

async function reschedulePatientHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(b.appointment_date, b.appointment_time, b.patient_timezone);
  const treatments = treatmentList(b.treatment_interest);
  const manageHref = await manageUrl(b);
  const ics = await icsUrl(b);

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
          <a href="${ics}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">📥 Apple / Outlook</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Need to make more changes?</p>
          <a href="${manageHref}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;">Manage Booking</a>
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
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest);
  const newBookingHref = bookingPageUrl(b.locale);

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
          <a href="${newBookingHref}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">Book New Appointment</a>
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

async function programChangePatientHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(b.appointment_date, b.appointment_time, b.patient_timezone);
  const treatments = treatmentList(b.treatment_interest);
  const manageHref = await manageUrl(b);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Program Updated</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          Hi <strong>${b.patient_name}</strong>,<br>
          Your program selection has been updated. Here are your current booking details:
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:100px;">Date</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Time</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST${timeLocal !== "—" ? ` (${timeLocal} ${b.patient_timezone})` : ""}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Program</td><td style="padding:8px 0;color:#c9a55a;font-size:14px;font-weight:700;">${treatments || "—"}</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${manageHref}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;">Manage Booking</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;">
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

async function confirmPatientHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(b.appointment_date, b.appointment_time, b.patient_timezone);
  const treatments = treatmentList(b.treatment_interest);
  const manageHref = await manageUrl(b);
  const ics = await icsUrl(b);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Appointment Confirmed</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
          Hi <strong>${b.patient_name}</strong>,<br>
          Great news! Your appointment has been confirmed by our team.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:100px;">Date</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Time</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST${timeLocal !== "—" ? ` (${timeLocal} ${b.patient_timezone})` : ""}</td></tr>
            ${treatments ? `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Program</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${treatments}</td></tr>` : ""}
          </table>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;">Add to your calendar:</p>
          <a href="${googleCalUrl(b)}" target="_blank" style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">📅 Google Calendar</a>
          <a href="${ics}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">📥 Apple / Outlook</a>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Need to make changes?</p>
          <a href="${manageHref}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700;">Manage Booking</a>
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

// ── Clinic-internal templates (Korean) ──

async function clinicRescheduleKoHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest);
  const dday = dDayLabel(b.appointment_date);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  const actions = await clinicActionsHtml(b, true);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #3b82f6;">
      <div style="background:#3b82f6;padding:16px 24px;">
        <table style="width:100%;"><tr>
          <td><h1 style="margin:0;color:#fff;font-size:16px;">🔄 예약 변경</h1></td>
          <td style="text-align:right;"><span style="background:rgba(255,255,255,0.25);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${dday}</span></td>
        </tr></table>
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
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
        </table>
        ${clinicContactHtml(b)}
        ${clinicQuickReplyHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body></html>`;
}

async function clinicCancelKoHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  const actions = await clinicActionsHtml(b, false);

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
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
        </table>
        ${clinicContactHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body></html>`;
}

async function clinicProgramChangeKoHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest);
  const dday = dDayLabel(b.appointment_date);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  const actions = await clinicActionsHtml(b, true);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #8b5cf6;">
      <div style="background:#8b5cf6;padding:16px 24px;">
        <table style="width:100%;"><tr>
          <td><h1 style="margin:0;color:#fff;font-size:16px;">🔀 프로그램 변경</h1></td>
          <td style="text-align:right;"><span style="background:rgba(255,255,255,0.25);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${dday}</span></td>
        </tr></table>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#334155;font-size:14px;">환자가 프로그램을 변경했습니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">예약일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">변경된 프로그램</td><td style="padding:6px 0;color:#8b5cf6;font-size:14px;font-weight:700;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
        </table>
        ${clinicContactHtml(b)}
        ${clinicQuickReplyHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body></html>`;
}

async function clinicConfirmKoHtml(b: Booking): Promise<string> {
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest);
  const dday = dDayLabel(b.appointment_date);
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  const actions = await clinicActionsHtml(b, false);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:2px solid #16a34a;">
      <div style="background:#16a34a;padding:16px 24px;">
        <table style="width:100%;"><tr>
          <td><h1 style="margin:0;color:#fff;font-size:16px;">✅ 예약 확정됨</h1></td>
          <td style="text-align:right;"><span style="background:rgba(255,255,255,0.25);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">${dday}</span></td>
        </tr></table>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#334155;font-size:14px;">예약이 확정 처리되었습니다. 환자에게 확정 이메일이 발송되었습니다.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:110px;">환자명</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${b.patient_name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">이메일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_email || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">연락처</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_phone || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">예약일</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${dateFmt}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${timeKST} KST</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">프로그램</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${treatments || "미정"}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${langLabel}</td></tr>
        </table>
        ${clinicContactHtml(b)}
        ${actions}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body></html>`;
}

// ── Helpers ──

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function loadBooking(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as Booking;
}

async function requireToken(
  url: URL,
  id: string,
  actions: TokenAction[],
): Promise<string | null> {
  const t = url.searchParams.get("t");
  const result = await verifyToken(t, id, actions);
  if (result.ok) return null;
  return result.reason ?? "invalid_token";
}

async function requireBodyToken(
  body: { token?: string },
  id: string,
  actions: TokenAction[],
): Promise<string | null> {
  const result = await verifyToken(body.token, id, actions);
  if (result.ok) return null;
  return result.reason ?? "invalid_token";
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

      // ICS download — token-protected (anyone with calendar URL would
      // otherwise know the booking exists).
      if (url.searchParams.get("ics") === "1") {
        const reason = await requireToken(url, id, ["ics", "manage"]);
        if (reason) return json({ error: "unauthorized", reason }, 401);

        const data = await loadBooking(id);
        if (!data) return json({ error: "Booking not found" }, 404);

        return new Response(generateICS(data), {
          headers: {
            ...CORS,
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="tune-clinic-appointment.ics"',
          },
        });
      }

      // Confirm action — token-protected, redirects to manage page.
      if (url.searchParams.get("action") === "confirm") {
        const reason = await requireToken(url, id, ["confirm"]);
        if (reason) return json({ error: "unauthorized", reason }, 401);

        const data = await loadBooking(id);
        if (!data) return json({ error: "Booking not found" }, 404);

        const manageHref = await manageUrl(data);
        const redirect = (msg: string) =>
          new Response(null, {
            status: 302,
            headers: {
              "Location": `${manageHref}&msg=${encodeURIComponent(msg)}`,
            },
          });

        if (data.status === "confirmed") return redirect("already_confirmed");
        if (data.status === "cancelled") return redirect("cancelled");

        const { error: updateErr } = await supabase
          .from("bookings").update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          }).eq("id", id);

        if (updateErr) return redirect("error");

        data.status = "confirmed";

        const [patientHtml, clinicHtml] = await Promise.all([
          confirmPatientHtml(data),
          clinicConfirmKoHtml(data),
        ]);

        const emailResults = await notifyAll(
          data.patient_email,
          `Appointment Confirmed — ${formatDate(data.appointment_date)} at ${data.appointment_time.slice(0, 5)} KST`,
          patientHtml,
          `✅ 예약 확정: ${data.patient_name} — ${data.appointment_date} ${data.appointment_time.slice(0, 5)}`,
          clinicHtml,
        );
        console.log("Confirm email results:", emailResults.join(" | "));

        return redirect("confirmed");
      }

      // Read-only fetch — used by the booking-manage.html page.
      // Token-protected so anonymous users with a UUID can't enumerate
      // patient PII through the function endpoint.
      const reason = await requireToken(url, id, ["manage"]);
      if (reason) return json({ error: "unauthorized", reason }, 401);

      const data = await loadBooking(id);
      if (!data) return json({ error: "Booking not found" }, 404);
      return json(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action, id, token } = body;

      if (!id || !action) return json({ error: "Missing id or action" }, 400);

      // All mutating actions require a manage token (broad scope so the
      // patient can perform any self-service action from one link).
      const reason = await requireBodyToken({ token }, id, ["manage"]);
      if (reason) return json({ error: "unauthorized", reason }, 401);

      const existing = await loadBooking(id);
      if (!existing) return json({ error: "Booking not found" }, 404);
      if (existing.status === "cancelled") {
        return json({ error: "Booking is already cancelled" }, 400);
      }

      if (action === "cancel") {
        const { data, error } = await supabase
          .from("bookings").update({ status: "cancelled" }).eq("id", id)
          .select().single();
        if (error) return json({ error: error.message }, 500);

        const booking = data as Booking;
        const [patientHtml, clinicHtml] = await Promise.all([
          Promise.resolve(cancelPatientHtml(booking)),
          clinicCancelKoHtml(booking),
        ]);

        const emailResults = await notifyAll(
          booking.patient_email,
          `Booking Cancelled — ${formatDate(booking.appointment_date)}`,
          patientHtml,
          `❌ 예약 취소: ${booking.patient_name} — ${booking.appointment_date} ${booking.appointment_time.slice(0, 5)}`,
          clinicHtml,
        );

        return json({ success: true, booking, emails: emailResults });
      }

      if (action === "reschedule") {
        const { appointment_date, appointment_time, treatment_interest } = body;
        if (!appointment_date || !appointment_time) {
          return json({ error: "Missing date or time" }, 400);
        }

        const updates: Record<string, unknown> = {
          appointment_date,
          appointment_time:
            appointment_time.length === 5
              ? appointment_time + ":00"
              : appointment_time,
          status: "pending",
        };
        if (Array.isArray(treatment_interest) && treatment_interest.length > 0) {
          updates.treatment_interest = treatment_interest;
        }

        const { data, error } = await supabase
          .from("bookings").update(updates).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);

        const booking = data as Booking;
        const [patientHtml, clinicHtml] = await Promise.all([
          reschedulePatientHtml(booking),
          clinicRescheduleKoHtml(booking),
        ]);

        const emailResults = await notifyAll(
          booking.patient_email,
          `Appointment Rescheduled — ${formatDate(booking.appointment_date)} at ${booking.appointment_time.slice(0, 5)} KST`,
          patientHtml,
          `🔄 예약 변경: ${booking.patient_name} — ${booking.appointment_date} ${booking.appointment_time.slice(0, 5)}`,
          clinicHtml,
        );

        return json({ success: true, booking, emails: emailResults });
      }

      if (action === "update_program") {
        const { treatment_interest } = body;
        if (!Array.isArray(treatment_interest) || treatment_interest.length === 0) {
          return json({ error: "Missing treatment_interest" }, 400);
        }

        const { data, error } = await supabase
          .from("bookings").update({ treatment_interest }).eq("id", id)
          .select().single();
        if (error) return json({ error: error.message }, 500);

        const booking = data as Booking;
        const [patientHtml, clinicHtml] = await Promise.all([
          programChangePatientHtml(booking),
          clinicProgramChangeKoHtml(booking),
        ]);

        const emailResults = await notifyAll(
          booking.patient_email,
          `Program Updated — ${treatmentList(booking.treatment_interest)}`,
          patientHtml,
          `🔀 프로그램 변경: ${booking.patient_name} — ${treatmentList(booking.treatment_interest)}`,
          clinicHtml,
        );

        return json({ success: true, booking, emails: emailResults });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("booking-manage error:", err);
    return json({ error: String(err) }, 500);
  }
});

// Token mint endpoint is intentionally not exposed; tokens are minted
// only inside trusted server contexts (this function and
// booking-confirmation) and delivered via email.
void signToken;
