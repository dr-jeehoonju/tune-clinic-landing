// P1-D: Reusable 3–5 day Seoul itinerary module renderer.
//
// Mirrors the architecture of `reviews-module.js`:
//   - Pure-string render helper that returns a complete <section>.
//   - Surface-keyed placeholder substitution driven by the existing
//     render.js fragment pipeline.
//
// Policy notes:
//   - Day titles + bodies stay in English on every locale (Q2 2026
//     strategy v1.2 §6.3, mirroring the reviews-module convention).
//     Only the section heading, subheading, footer line, CTA label,
//     day-label prefix, and detail-page heading localize through
//     `global.json#itinerary`.
//   - We deliberately do NOT emit any new schema.org node here. The
//     home `MedicalClinic` already carries a clinic-level description
//     and Google does not have a stable `itinerary` semantic for
//     medical visits.
//   - Two variants:
//       `home`   — compact 5-cell day strip (snap-scroll on mobile,
//                  5 columns on md+). Used on the home page between
//                  the reviews module and the program grid.
//       `detail` — vertical 5-row block with longer descriptions.
//                  Used on structural-reset and the international FAQ
//                  page where context for a multi-day visit makes
//                  sense.

const { esc } = require("./head");
const { pageUrl } = require("../url-helpers");

// English bodies — identical across all locales by design.
// Source of truth lives here so the home variant, the detail variant,
// and any future surface stay 1:1 in sync.
const DAYS = [
  {
    n: 1,
    title: "Arrival & doctor consultation",
    body:
      "Rest from your flight. Evening visit for in-person consultation, indication-first planning, and a fully itemized KRW protocol — no broker handoff, no surprise pricing.",
  },
  {
    n: 2,
    title: "Treatment day",
    body:
      "Treatment per the protocol you confirmed yesterday. Detailed aftercare and recovery timeline are provided in your language.",
  },
  {
    n: 3,
    title: "Recovery & light Seoul",
    body:
      "Aftercare-first day. Most patients can do light Seoul exploration; the clinic stays reachable on WhatsApp / Instagram / email if questions come up.",
  },
  {
    n: 4,
    title: "Follow-up checkpoint",
    body:
      "In-person or remote follow-up. Optional second light treatment only if planned at consultation. We do not upsell at the checkpoint.",
  },
  {
    n: 5,
    title: "Departure",
    body:
      "Brief departure check, take-home regimen, and a written summary you can share with your home clinician if needed.",
  },
];

const DEFAULT_T = {
  kicker: "Travel-Conscious Itinerary",
  homeHeading: "Built for short-stay Seoul timelines",
  homeSubheading: "A typical 3–5 day visit, from arrival to departure.",
  homeFooterLine:
    "Need a different timeline? Tell us at the consultation — we plan around your trip, not the other way around.",
  homeCta: "Plan your visit →",
  detailHeading: "Your 3–5 day itinerary",
  detailSubheading:
    "What a 3–5 day visit normally looks like at Tune Clinic, end-to-end.",
  dayLabel: "Day",
};

function tFor(localeData, locale) {
  const g = (localeData && localeData[locale] && localeData[locale].global) || {};
  const itin = g.itinerary || {};
  return { ...DEFAULT_T, ...itin };
}

// P1-C navigation hook: small under-card link to the Decision Protection
// LP. Per-locale label so the home page's only entry-point to that
// surface localizes cleanly without polluting `global.json` (the string
// is used in exactly one place — see "no new locale keys for one-off
// strings" rule in v1.2 §6.3).
const DECISION_PROTECTION_LINK_LABEL = {
  en: "Read the doctor-led approach →",
  ko: "원장 주도 접근법 읽기 →",
  ja: "医師主導のアプローチを読む →",
  zh: "阅读医生主导的做法 →",
  de: "Den arztgeführten Ansatz lesen →",
  fr: "Lire l'approche médicale →",
  ru: "Подход врача — читать →",
  th: "อ่านแนวทางที่นำโดยแพทย์ →",
  vi: "Đọc cách tiếp cận do bác sĩ dẫn dắt →",
};

// ── Variant: home (compact 5-cell day strip) ─────────────────────────
function renderHomeVariant(locale, t) {
  const bookingHref = pageUrl(locale, "booking");
  const dpHref = pageUrl(locale, "decision-protection");
  const dpLabel = DECISION_PROTECTION_LINK_LABEL[locale] || DECISION_PROTECTION_LINK_LABEL.en;

  const cards = DAYS.map((day) => `
        <article class="snap-start shrink-0 w-[78vw] sm:w-auto sm:shrink rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition flex flex-col">
          <span class="inline-flex items-center justify-center self-start w-10 h-10 rounded-full bg-gold-light text-gold text-sm font-bold border border-gold/30 mb-4">${day.n}</span>
          <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">${esc(t.dayLabel)} ${day.n}</p>
          <h3 class="text-base font-serif text-slate-900 leading-snug mb-2">${esc(day.title)}</h3>
          <p class="text-sm text-slate-500 leading-relaxed">${esc(day.body)}</p>
        </article>
      `).join("\n");

  return `
<section id="itinerary" class="itinerary-module py-16 md:py-20 bg-white border-y border-slate-100" data-tc-itinerary="${esc(locale)}">
  <div class="max-w-7xl mx-auto px-6">
    <div class="text-center mb-10 md:mb-12">
      <span class="inline-flex items-center gap-2 text-gold uppercase tracking-[0.22em] text-[10px] font-bold mb-3">
        <i class="fas fa-plane-departure text-xs"></i> ${esc(t.kicker)}
      </span>
      <h2 class="text-3xl md:text-4xl font-serif text-slate-900 mb-3">${esc(t.homeHeading)}</h2>
      <p class="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">${esc(t.homeSubheading)}</p>
    </div>

    <div class="flex sm:grid sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory pb-4 sm:pb-0 -mx-6 px-6 sm:mx-0 sm:px-0 [&amp;::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] items-stretch">
      ${cards}
    </div>

            <div class="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p class="text-xs md:text-sm text-slate-500 italic max-w-3xl">${esc(t.homeFooterLine)}</p>
              <a href="${bookingHref}" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 text-slate-800 hover:border-slate-900 text-xs font-bold transition shrink-0">
                <i class="fas fa-calendar-check"></i> ${esc(t.homeCta)}
              </a>
            </div>

            <div class="mt-4 text-center md:text-right">
              <a href="${dpHref}" class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-gold hover:text-slate-900 transition">
                <i class="fas fa-shield-halved text-[10px]"></i> ${esc(dpLabel)}
              </a>
            </div>
  </div>
</section>
`;
}

// ── Variant: detail (vertical 5-row block with longer copy) ─────────
function renderDetailVariant(locale, t) {
  const bookingHref = pageUrl(locale, "booking");

  const rows = DAYS.map((day) => `
        <div class="grid grid-cols-[auto_1fr] gap-5 md:gap-7 items-start py-6 border-b border-slate-100 last:border-b-0">
          <div class="flex flex-col items-center pt-1">
            <span class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-light text-gold text-base font-bold border border-gold/30">${day.n}</span>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">${esc(t.dayLabel)} ${day.n}</p>
            <h3 class="text-lg md:text-xl font-serif text-slate-900 leading-snug mb-2">${esc(day.title)}</h3>
            <p class="text-sm md:text-base text-slate-600 leading-relaxed">${esc(day.body)}</p>
          </div>
        </div>
      `).join("\n");

  return `
<section id="itinerary" class="itinerary-module py-16 md:py-20 bg-slate-50 border-y border-slate-100" data-tc-itinerary="${esc(locale)}">
  <div class="max-w-3xl mx-auto px-6">
    <div class="text-center mb-10 md:mb-12">
      <span class="inline-flex items-center gap-2 text-gold uppercase tracking-[0.22em] text-[10px] font-bold mb-3">
        <i class="fas fa-plane-departure text-xs"></i> ${esc(t.kicker)}
      </span>
      <h2 class="text-3xl md:text-4xl font-serif text-slate-900 mb-3">${esc(t.detailHeading)}</h2>
      <p class="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">${esc(t.detailSubheading)}</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white px-6 md:px-8">
      ${rows}
    </div>

    <div class="mt-8 text-center">
      <a href="${bookingHref}" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition">
        <i class="fas fa-calendar-check"></i> ${esc(t.homeCta)}
      </a>
    </div>
  </div>
</section>
`;
}

function renderItineraryCard({ locale, localeData, variant = "home" } = {}) {
  const t = tFor(localeData, locale);
  if (variant === "detail") return renderDetailVariant(locale, t);
  return renderHomeVariant(locale, t);
}

const PLACEHOLDER_RE = /<!--\s*TC_ITINERARY:(home|detail)\s*-->/g;

function substituteItineraryPlaceholders(fragment, locale, localeData) {
  return fragment.replace(PLACEHOLDER_RE, (_match, variant) => {
    return renderItineraryCard({ locale, localeData, variant });
  });
}

module.exports = {
  renderItineraryCard,
  substituteItineraryPlaceholders,
  DAYS,
};
