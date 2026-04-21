// Single source of truth for locale-specific labels used by both
// Edge Functions. Keep in sync with src/_data/site.js.

export const SUPPORTED_LOCALES = [
  "en",
  "ja",
  "zh",
  "th",
  "de",
  "fr",
  "ru",
  "vi",
  "ko",
] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

// Map locale → URL path prefix (en is the root, no prefix). `ko` is a
// partial locale that only ships /ko/booking/ and /ko/booking-manage/
// (rest of the site has no Korean pages).
export const LOCALE_PREFIX: Record<string, string> = {
  en: "",
  ja: "ja/",
  zh: "zh/",
  th: "th/",
  de: "de/",
  fr: "fr/",
  ru: "ru/",
  vi: "vi/",
  ko: "ko/",
};

// Korean labels used in clinic-internal email notifications.
export const LOCALE_LABELS_KO: Record<string, string> = {
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  th: "태국어",
  de: "독일어",
  fr: "프랑스어",
  ru: "러시아어",
  vi: "베트남어",
  ko: "한국어",
};

const TREATMENT_KEYS = [
  "signature-lifting",
  "structural-reset",
  "collagen-builder",
  "filler-chamaka-se",
  "other",
] as const;

type TreatmentKey = typeof TREATMENT_KEYS[number];

const PROGRAM_NAMES: Record<TreatmentKey, string> = {
  "signature-lifting": "Signature Lifting",
  "structural-reset": "Structural Reset Elite",
  "collagen-builder": "The Collagen Builder",
  "filler-chamaka-se": "Volume Chamaka-se",
  other: "Other",
};

const OTHER_LABEL: Record<string, string> = {
  en: "Other / Not sure yet",
  ja: "その他 / 未定",
  zh: "其他 / 尚未确定",
  th: "อื่นๆ / ยังไม่แน่ใจ",
  de: "Andere / Noch unsicher",
  fr: "Autre / Pas encore décidé",
  ru: "Другое / Ещё не выбрано",
  vi: "Khác / Chưa chắc chắn",
  ko: "기타 / 아직 정하지 못함",
};

function treatmentLabel(key: string, locale: string): string {
  if (key === "other") return OTHER_LABEL[locale] || OTHER_LABEL.en;
  return PROGRAM_NAMES[key as TreatmentKey] || key;
}

export function treatmentList(
  interests: string[] | null | undefined,
  locale: string = "en",
): string {
  if (!interests || interests.length === 0) return "";
  return interests.map((t) => treatmentLabel(t, locale)).join(", ");
}

// Localized "quick reply" template the clinic staff uses to confirm
// the booking from their email client.
export const QUICK_REPLY: Record<
  string,
  { subject: string; body: string }
> = {
  en: {
    subject: "Your Tune Clinic Appointment is Confirmed",
    body:
      "Dear {name},\n\nYour appointment at Tune Clinic on {date} at {time} KST has been confirmed.\n\nWe look forward to seeing you!\n\nBest regards,\nTune Clinic Team",
  },
  ja: {
    subject: "Tune Clinic ご予約確定のお知らせ",
    body:
      "{name}様\n\n{date} {time} KSTのTune Clinicのご予約が確定いたしました。\n\nお会いできることを楽しみにしております。\n\nTune Clinic",
  },
  zh: {
    subject: "Tune Clinic 预约确认通知",
    body:
      "{name}您好，\n\n您在Tune Clinic {date} {time} KST的预约已确认。\n\n期待您的到来！\n\nTune Clinic",
  },
  th: {
    subject: "ยืนยันนัดหมาย Tune Clinic",
    body:
      "สวัสดี {name}\n\nการนัดหมายที่ Tune Clinic วันที่ {date} เวลา {time} KST ได้รับการยืนยันแล้ว\n\nเราตั้งตาคอยที่จะพบคุณ!\n\nTune Clinic",
  },
  de: {
    subject: "Ihr Tune Clinic Termin ist bestätigt",
    body:
      "Liebe/r {name},\n\nIhr Termin bei Tune Clinic am {date} um {time} KST wurde bestätigt.\n\nWir freuen uns auf Sie!\n\nMit besten Grüßen,\nTune Clinic",
  },
  fr: {
    subject: "Votre rendez-vous à Tune Clinic est confirmé",
    body:
      "Bonjour {name},\n\nVotre rendez-vous à Tune Clinic le {date} à {time} KST a été confirmé.\n\nNous nous réjouissons de vous accueillir.\n\nCordialement,\nTune Clinic",
  },
  ru: {
    subject: "Ваша запись в Tune Clinic подтверждена",
    body:
      "Здравствуйте, {name}!\n\nВаша запись в Tune Clinic {date} в {time} KST подтверждена.\n\nЖдём вас!\n\nС уважением,\nTune Clinic",
  },
  vi: {
    subject: "Lịch hẹn Tune Clinic đã được xác nhận",
    body:
      "Xin chào {name},\n\nLịch hẹn của bạn tại Tune Clinic vào {date} lúc {time} KST đã được xác nhận.\n\nChúng tôi rất mong được gặp bạn!\n\nTrân trọng,\nTune Clinic",
  },
  ko: {
    subject: "Tune Clinic 예약 확정 안내",
    body:
      "{name}님,\n\n{date} {time} KST Tune Clinic 예약이 확정되었습니다.\n\n방문을 기다리겠습니다.\n\nTune Clinic 드림",
  },
};

export function localePrefix(locale: string | null | undefined): string {
  if (!locale) return "";
  return LOCALE_PREFIX[locale] ?? "";
}
