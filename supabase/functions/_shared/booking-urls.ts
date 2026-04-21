// URL builders shared by booking-confirmation and booking-manage.
// All sensitive (mutating) URLs are HMAC-signed.

import { localePrefix } from "./locale.ts";
import { signToken, type TokenAction } from "./token.ts";

export const SITE_URL = "https://tuneclinic-global.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  "https://jwlfffpyeczyyojcutcx.supabase.co";

export const MANAGE_FN_URL = `${SUPABASE_URL}/functions/v1/booking-manage`;

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("압구정 튠클리닉 논현로 868 강남구 서울");

export function googleMapsUrl(): string {
  return GOOGLE_MAPS_URL;
}

interface MinimalBooking {
  id: string;
  locale?: string | null;
  appointment_date?: string;
  appointment_time?: string;
  treatment_interest?: string[];
  patient_name?: string;
}

export async function manageUrl(b: MinimalBooking): Promise<string> {
  const token = await signToken(b.id, "manage");
  const prefix = localePrefix(b.locale ?? "en");
  return `${SITE_URL}/${prefix}booking-manage.html?id=${b.id}&t=${token}`;
}

export async function confirmUrl(b: MinimalBooking): Promise<string> {
  const token = await signToken(b.id, "confirm");
  return `${MANAGE_FN_URL}?id=${b.id}&action=confirm&t=${token}`;
}

export async function icsUrl(b: MinimalBooking): Promise<string> {
  const token = await signToken(b.id, "ics");
  return `${MANAGE_FN_URL}?id=${b.id}&ics=1&t=${token}`;
}

export function googleCalUrl(b: MinimalBooking): string {
  const date = b.appointment_date as string;
  const time = b.appointment_time as string;
  const kst = new Date(`${date}T${time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = (b.treatment_interest || []).join(", ");
  return [
    "https://calendar.google.com/calendar/render?action=TEMPLATE",
    `text=${encodeURIComponent("Tune Clinic Appointment")}`,
    `dates=${fmt(kst)}/${fmt(end)}`,
    `details=${encodeURIComponent("Program: " + (treatments || "TBD"))}`,
    `location=${encodeURIComponent("5F, 868 Nonhyeon-ro, Gangnam-gu, Seoul")}`,
  ].join("&");
}

export function bookingPageUrl(locale: string | null | undefined): string {
  return `${SITE_URL}/${localePrefix(locale ?? "en")}booking.html`;
}

// Re-exported here for backwards compatibility with the old monolithic
// files; new callers should import from `./token.ts` directly.
export { signToken, type TokenAction };
