// Shared formatting helpers used by booking-confirmation and booking-manage.

const DATE_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  th: "th-TH",
  de: "de-DE",
  fr: "fr-FR",
  ru: "ru-RU",
  vi: "vi-VN",
  ko: "ko-KR",
};

export function formatDate(dateStr: string, locale: string = "en"): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const intlLocale = DATE_LOCALE_MAP[locale] || "en-US";
  return d.toLocaleDateString(intlLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function kstToLocal(
  dateStr: string,
  timeStr: string,
  tz: string,
): string {
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

export function dDayLabel(dateStr: string): string {
  const kstStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const todayMs = new Date(kstStr + "T00:00:00+09:00").getTime();
  const apptMs = new Date(dateStr + "T00:00:00+09:00").getTime();
  const days = Math.round((apptMs - todayMs) / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  if (days === 2) return "모레";
  if (days < 0) return `D+${Math.abs(days)}`;
  return `D-${days}`;
}

export function phoneDigits(phone: unknown): string {
  if (!phone) return "";
  return String(phone).replace(/[^0-9]/g, "");
}
