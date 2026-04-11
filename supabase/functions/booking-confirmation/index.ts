import "@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CLINIC_EMAILS = (Deno.env.get("CLINIC_NOTIFICATION_EMAIL") || "").split(",").map(e => e.trim()).filter(Boolean);
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Tune Clinic <booking@tuneclinic-global.com>";

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

const TREATMENT_LABELS: Record<string, Record<string, string>> = {
  en: {
    "signature-lifting": "Signature Lifting",
    "structural-reset": "Structural Reset Elite",
    "collagen-builder": "The Collagen Builder",
    "filler-chamaka-se": "Volume Chamaka-se",
    other: "Other / Not sure yet",
  },
  ja: {
    "signature-lifting": "Signature Lifting",
    "structural-reset": "Structural Reset Elite",
    "collagen-builder": "The Collagen Builder",
    "filler-chamaka-se": "Volume Chamaka-se",
    other: "その他 / 未定",
  },
  zh: {
    "signature-lifting": "Signature Lifting",
    "structural-reset": "Structural Reset Elite",
    "collagen-builder": "The Collagen Builder",
    "filler-chamaka-se": "Volume Chamaka-se",
    other: "其他 / 尚未确定",
  },
  th: {
    "signature-lifting": "Signature Lifting",
    "structural-reset": "Structural Reset Elite",
    "collagen-builder": "The Collagen Builder",
    "filler-chamaka-se": "Volume Chamaka-se",
    other: "อื่นๆ / ยังไม่แน่ใจ",
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

function kstToLocal(dateStr: string, timeStr: string, tz: string): string {
  try {
    const kst = new Date(`${dateStr}T${timeStr}+09:00`);
    return kst.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return "—";
  }
}

function treatmentList(
  interests: string[],
  locale: string,
): string {
  const labels = TREATMENT_LABELS[locale] || TREATMENT_LABELS.en;
  return interests.map((t) => labels[t] || t).join(", ");
}

const SITE_URL = "https://tuneclinic-global.com";
const MANAGE_FN_URL = `${Deno.env.get("SUPABASE_URL") || "https://jwlfffpyeczyyojcutcx.supabase.co"}/functions/v1/booking-manage`;

const LOCALE_PREFIX: Record<string, string> = { en: "", ja: "ja/", zh: "zh/", th: "th/" };

function manageUrl(b: BookingRecord): string {
  const prefix = LOCALE_PREFIX[b.locale] || "";
  return `${SITE_URL}/${prefix}booking-manage.html?id=${b.id}`;
}

function googleCalUrl(b: BookingRecord): string {
  const kst = new Date(`${b.appointment_date}T${b.appointment_time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = treatmentList(b.treatment_interest || [], b.locale);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Tune Clinic Appointment")}&dates=${fmt(kst)}/${fmt(end)}&details=${encodeURIComponent("Program: " + (treatments || "TBD"))}&location=${encodeURIComponent("5F, 868 Nonhyeon-ro, Gangnam-gu, Seoul")}`;
}

function icsUrl(b: BookingRecord): string {
  return `${MANAGE_FN_URL}?id=${b.id}&ics=1`;
}

// ── Shared clinic-email helpers ──

const GOOGLE_MAPS_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("압구정 튠클리닉 논현로 868 강남구 서울");
const LOCALE_LABELS_KO: Record<string, string> = { en: "영어", ja: "일본어", zh: "중국어", th: "태국어" };

function dDayLabel(dateStr: string): string {
  const kstStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const todayMs = new Date(kstStr + "T00:00:00+09:00").getTime();
  const apptMs = new Date(dateStr + "T00:00:00+09:00").getTime();
  const days = Math.round((apptMs - todayMs) / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  if (days === 2) return "모레";
  if (days < 0) return `D+${Math.abs(days)}`;
  return `D-${days}`;
}

function confirmUrl(b: BookingRecord): string {
  return `${MANAGE_FN_URL}?id=${b.id}&action=confirm`;
}

function phoneDigits(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

const QUICK_REPLY: Record<string, { subject: string; body: string }> = {
  en: {
    subject: "Your Tune Clinic Appointment is Confirmed",
    body: "Dear {name},\n\nYour appointment at Tune Clinic on {date} at {time} KST has been confirmed.\n\nWe look forward to seeing you!\n\nBest regards,\nTune Clinic Team",
  },
  ja: {
    subject: "Tune Clinic ご予約確定のお知らせ",
    body: "{name}様\n\n{date} {time} KSTのTune Clinicのご予約が確定いたしました。\n\nお会いできることを楽しみにしております。\n\nTune Clinic",
  },
  zh: {
    subject: "Tune Clinic 预约确认通知",
    body: "{name}您好，\n\n您在Tune Clinic {date} {time} KST的预约已确认。\n\n期待您的到来！\n\nTune Clinic",
  },
  th: {
    subject: "ยืนยันนัดหมาย Tune Clinic",
    body: "สวัสดี {name}\n\nการนัดหมายที่ Tune Clinic วันที่ {date} เวลา {time} KST ได้รับการยืนยันแล้ว\n\nเราตั้งตาคอยที่จะพบคุณ!\n\nTune Clinic",
  },
};

function quickReplyMailto(b: BookingRecord): string {
  const tmpl = QUICK_REPLY[b.locale] || QUICK_REPLY.en;
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const subject = encodeURIComponent(tmpl.subject);
  const body = encodeURIComponent(
    tmpl.body
      .replace("{name}", b.patient_name)
      .replace("{date}", dateFmt)
      .replace("{time}", timeKST)
  );
  return `mailto:${b.patient_email || ""}?subject=${subject}&body=${body}`;
}

function clinicContactHtml(b: BookingRecord): string {
  const phone = b.patient_phone || "";
  const email = b.patient_email || "";
  const digits = phoneDigits(phone);
  const phoneBtn = digits
    ? `<a href="tel:${phone}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;margin:3px;">📞 전화</a>`
    : `<span style="display:inline-block;background:#e2e8f0;color:#94a3b8;padding:8px 14px;border-radius:6px;font-size:12px;margin:3px;">📞 번호 없음</span>`;
  const emailBtn = email
    ? `<a href="mailto:${email}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;margin:3px;">✉️ 이메일</a>`
    : "";
  const waBtn = digits
    ? `<a href="https://wa.me/${digits}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;margin:3px;">💬 WhatsApp</a>`
    : "";
  return `
        <div style="margin:20px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;">빠른 연락</p>
          <div style="text-align:center;">${phoneBtn}${emailBtn}${waBtn}</div>
        </div>`;
}

function clinicQuickReplyHtml(b: BookingRecord): string {
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;">빠른 답장 (환자 언어: ${langLabel})</p>
          <a href="${quickReplyMailto(b)}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;">📝 확정 답장 보내기</a>
        </div>`;
}

function clinicActionsHtml(b: BookingRecord): string {
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;text-align:center;">
          <a href="${confirmUrl(b)}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">✅ 예약 확정</a>
          <a href="${manageUrl(b)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">📋 예약 관리</a>
        </div>`;
}

function clinicLocationHtml(): string {
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:13px;font-weight:700;">📍 압구정 튠클리닉</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:12px;line-height:1.4;">서울 강남구 논현로 868, 5층</p>
          <a href="${GOOGLE_MAPS_URL}" style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;">🗺️ 지도 보기</a>
        </div>`;
}

function patientEmailHtml(b: BookingRecord): string {
  const dateFormatted = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const timeLocal = kstToLocal(
    b.appointment_date,
    b.appointment_time,
    b.patient_timezone,
  );
  const treatments = treatmentList(b.treatment_interest || [], b.locale);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <!-- Header -->
      <div style="background:#0f172a;padding:32px 28px;text-align:center;">
        <h1 style="margin:0;color:#c9a55a;font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Tune Clinic</h1>
        <p style="margin:12px 0 0;color:#fff;font-size:22px;font-family:Georgia,serif;">Booking Request Received</p>
      </div>

      <!-- Body -->
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

        <!-- Status Badge -->
        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:#fef3c7;color:#92400e;padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;">⏳ Awaiting Confirmation</span>
        </div>

        <!-- Next Steps -->
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:700;">What happens next?</p>
          <ol style="margin:0;padding:0 0 0 18px;color:#92400e;font-size:13px;line-height:1.8;">
            <li>Send us a message with your name via any messenger below</li>
            <li>Our counselor will assist you during business hours</li>
            <li>Once confirmed, you'll receive a confirmation email</li>
          </ol>
        </div>

        <!-- Messenger Contact -->
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

        <!-- Manage Booking -->
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;">Need to change your plans?</p>
          <a href="${manageUrl(b)}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">Reschedule or Cancel</a>
          <a href="${manageUrl(b)}" style="display:inline-block;background:#334155;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:0 4px;">Change Program</a>
        </div>

        <!-- Location -->
        <div style="border-top:1px solid #e2e8f0;padding:20px 0 0;margin-top:8px;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:700;">📍 Apgujeong Tune Clinic</p>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">
            5th floor, 868 Nonhyeon-ro, Gangnam-gu, Seoul<br>
            Mon–Fri 10:00–21:00 · Sat 10:00–16:00
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">© 2026 Apgujeong Tune Clinic · Evidence-Based Aesthetics</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function clinicNotificationKoHtml(b: BookingRecord): string {
  const dateFormatted = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const treatments = treatmentList(b.treatment_interest || [], "en");
  const dday = dDayLabel(b.appointment_date);

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
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">언어</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase()}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">시간대</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.patient_timezone}</td></tr>
          ${b.message ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;">메모</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${b.message}</td></tr>` : ""}
        </table>
        ${clinicContactHtml(b)}
        ${clinicQuickReplyHtml(b)}
        ${clinicActionsHtml(b)}
        ${clinicLocationHtml()}
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  const recipients = Array.isArray(to) ? to : [to];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: recipients, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `${res.status}: ${body}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "bookings") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const booking = payload.record;
    const results: string[] = [];

    // 1. Patient confirmation email
    if (booking.patient_email) {
      const { ok, error } = await sendEmail(
        booking.patient_email,
        `Booking Request Received — ${formatDate(booking.appointment_date)} at ${booking.appointment_time.slice(0, 5)} KST`,
        patientEmailHtml(booking),
      );
      results.push(ok ? "patient: sent" : `patient: failed (${error})`);
    } else {
      results.push("patient: skipped (no email)");
    }

    // 2. Clinic notification — Korean to all staff
    if (CLINIC_EMAILS.length > 0) {
      const { ok, error } = await sendEmail(
        CLINIC_EMAILS,
        `🔔 새 예약: ${booking.patient_name} — ${booking.appointment_date} ${booking.appointment_time.slice(0, 5)}`,
        clinicNotificationKoHtml(booking),
      );
      results.push(ok ? `clinic: sent to ${CLINIC_EMAILS.join(", ")}` : `clinic: failed (${error})`);
    }

    console.log("Email results:", results.join(" | "));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
