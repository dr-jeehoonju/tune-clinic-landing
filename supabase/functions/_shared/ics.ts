interface IcsBooking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  treatment_interest?: string[];
  patient_name: string;
}

export function generateICS(b: IcsBooking): string {
  const kst = new Date(`${b.appointment_date}T${b.appointment_time}+09:00`);
  const end = new Date(kst.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const treatments = (b.treatment_interest || []).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tune Clinic//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@tuneclinic-global.com`,
    `DTSTAMP:${fmt(new Date())}`,
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
