// Shared formatting helpers used by booking-confirmation and booking-manage.

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  return d.toLocaleDateString("en-US", {
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
