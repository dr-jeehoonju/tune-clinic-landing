// Small reusable HTML fragments injected into clinic-internal email
// templates (Korean copy). Patient-facing templates live alongside
// each Edge Function because their copy varies per action.

import {
  bookingPageUrl,
  confirmUrl,
  googleMapsUrl,
  manageUrl,
} from "./booking-urls.ts";
import { formatDate, phoneDigits } from "./format.ts";
import { LOCALE_LABELS_KO, QUICK_REPLY } from "./locale.ts";

interface ClinicBooking {
  id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  locale: string;
  appointment_date: string;
  appointment_time: string;
}

export function clinicContactHtml(b: ClinicBooking): string {
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

export function quickReplyMailto(b: ClinicBooking): string {
  const tmpl = QUICK_REPLY[b.locale] || QUICK_REPLY.en;
  const dateFmt = formatDate(b.appointment_date);
  const timeKST = b.appointment_time.slice(0, 5);
  const subject = encodeURIComponent(tmpl.subject);
  const body = encodeURIComponent(
    tmpl.body
      .replace("{name}", b.patient_name)
      .replace("{date}", dateFmt)
      .replace("{time}", timeKST),
  );
  return `mailto:${b.patient_email || ""}?subject=${subject}&body=${body}`;
}

export function clinicQuickReplyHtml(b: ClinicBooking): string {
  const langLabel = LOCALE_LABELS_KO[b.locale] || b.locale.toUpperCase();
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;">빠른 답장 (환자 언어: ${langLabel})</p>
          <a href="${quickReplyMailto(b)}" style="display:inline-block;background:#c9a55a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;">📝 확정 답장 보내기</a>
        </div>`;
}

export async function clinicActionsHtml(
  b: ClinicBooking,
  showConfirm: boolean,
): Promise<string> {
  const [manageHref, confirmHref] = await Promise.all([
    manageUrl(b),
    showConfirm ? confirmUrl(b) : Promise.resolve(""),
  ]);
  const confirmBtn = showConfirm
    ? `<a href="${confirmHref}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">✅ 예약 확정</a>`
    : "";
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;text-align:center;">
          ${confirmBtn}
          <a href="${manageHref}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;margin:4px;">📋 예약 관리</a>
        </div>`;
}

export function clinicLocationHtml(): string {
  return `
        <div style="margin:16px 0 0;padding:16px 0 0;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 4px;color:#0f172a;font-size:13px;font-weight:700;">📍 압구정 튠클리닉</p>
          <p style="margin:0 0 8px;color:#64748b;font-size:12px;line-height:1.4;">서울 강남구 논현로 868, 5층</p>
          <a href="${googleMapsUrl()}" style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;">🗺️ 지도 보기</a>
        </div>`;
}

export { bookingPageUrl };
