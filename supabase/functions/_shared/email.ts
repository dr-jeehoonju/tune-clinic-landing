// Resend wrapper used by all booking edge functions.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ||
  "Tune Clinic <booking@tuneclinic-global.com>";

if (!RESEND_API_KEY) {
  console.warn(
    "[email] RESEND_API_KEY is not set. All sendEmail() calls will fail.",
  );
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const recipients = Array.isArray(to) ? to : [to];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export const CLINIC_EMAILS = (Deno.env.get("CLINIC_NOTIFICATION_EMAIL") || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export async function notifyAll(
  patientEmail: string | null,
  patientSubject: string,
  patientHtml: string,
  clinicSubject: string,
  clinicHtml: string,
): Promise<string[]> {
  const results: string[] = [];

  if (patientEmail) {
    const { ok, error } = await sendEmail(
      patientEmail,
      patientSubject,
      patientHtml,
    );
    results.push(ok ? "patient: sent" : `patient: failed (${error})`);
  } else {
    results.push("patient: skipped (no email)");
  }

  if (CLINIC_EMAILS.length > 0) {
    // brief gap to avoid Resend's burst rate limit
    await new Promise((r) => setTimeout(r, 600));
    const { ok, error } = await sendEmail(
      CLINIC_EMAILS,
      clinicSubject,
      clinicHtml,
    );
    results.push(
      ok
        ? `clinic: sent to ${CLINIC_EMAILS.join(", ")}`
        : `clinic: failed (${error})`,
    );
  } else {
    results.push("clinic: skipped (no recipients)");
  }

  return results;
}
