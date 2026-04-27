// P1-E: Reusable patient-review module renderer.
// Pulls verified Google reviews from src/_data/reviews.json and emits a
// pure-string <section> ready to be substituted into a fragment.
//
// Policy notes:
//   - We republish each Review with verifiable attribution (link to the
//     clinic's GMB profile) and a per-review schema.org/Review JSON-LD
//     node, but we deliberately do NOT emit AggregateRating using
//     Google's data — that surfaces real policy risk for medical
//     practices.
//   - Bodies stay in English on every locale per Q2 2026 strategy v1.2
//     §6.3 (Anglo LP consistency). Headers, labels, disclaimers, and
//     translation notices are localized per `global.json#reviews`.
//   - No reviewer photos are rendered; cards are text-only.

const { esc } = require("./head");
const reviewsData = require("../_data/reviews.json");

const reviewsById = reviewsData.reviews.reduce((acc, review) => {
  acc[review.id] = review;
  return acc;
}, {});

const DATE_LOCALE_MAP = {
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

function formatReviewDate(date, locale) {
  const [year, month] = String(date).split("-").map((v) => parseInt(v, 10));
  if (!year || !month) return esc(String(date));
  const d = new Date(Date.UTC(year, month - 1, 1));
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE_MAP[locale] || "en-US", {
      year: "numeric",
      month: "short",
    }).format(d);
  } catch (_) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
}

function lookupReviews(ids) {
  return ids
    .map((id) => reviewsById[id])
    .filter(Boolean);
}

function reviewCard(review, locale, reviewsLocale) {
  const stars = "★★★★★";
  const dateStr = formatReviewDate(review.date, locale);
  const isLocalGuide = review.displaySuffix === "Local Guide";
  const suffix = isLocalGuide
    ? reviewsLocale.localGuideBadge
    : review.displaySuffix;
  const suffixHtml = suffix
    ? `<span class="ml-1 text-[11px] font-normal text-slate-500">(${esc(suffix)})</span>`
    : "";
  const categoryChip = review.category
    ? `<span class="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] uppercase tracking-[0.14em] font-bold">${esc(review.category)}</span>`
    : "";
  const translationNotice = review.originalLang === "ko"
    ? `<p class="mt-3 text-[11px] text-slate-400 italic"><i class="fas fa-language mr-1 opacity-60"></i>${esc(reviewsLocale.translationNotice)}</p>`
    : "";

  return `
    <article class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition flex flex-col h-full">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="text-amber-500 tracking-[0.2em] text-sm leading-none" aria-label="${review.rating} out of 5 stars">${stars}</span>
        <span class="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-500"><i class="fab fa-google mr-1 text-[11px] opacity-70"></i>${esc(reviewsLocale.googleStarLine)}</span>
        <span class="ml-auto text-[11px] text-slate-400">${esc(dateStr)}</span>
      </div>
      <blockquote class="mt-4 text-sm text-slate-700 leading-relaxed italic flex-1 before:content-['“'] before:mr-0.5 before:text-slate-300 after:content-['”'] after:ml-0.5 after:text-slate-300">${esc(review.body)}</blockquote>
      <div class="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <p class="text-sm font-bold text-slate-900">${esc(review.displayName)}${suffixHtml}</p>
        ${categoryChip ? `<span class="ml-auto">${categoryChip}</span>` : ""}
      </div>
      ${translationNotice}
    </article>
  `;
}

// Patient interview portraits shown above the home reviews grid as a
// visual social-proof rail. Photos correspond 1:1 to the home review
// IDs in SURFACE_REVIEW_IDS.home, displayed in the same order.
const HOME_PATIENT_PHOTOS = [
  { file: "/patient-1.webp", alt: "Patient interviewed at Tune Clinic" },
  { file: "/patient-2.webp", alt: "Patient interviewed at Tune Clinic" },
  { file: "/patient-3.webp", alt: "Patient interviewed at Tune Clinic" },
  { file: "/patient-4.webp", alt: "Patient interviewed at Tune Clinic" },
  { file: "/patient-5.webp", alt: "Patient interviewed at Tune Clinic" },
  { file: "/patient-6.webp", alt: "Patient interviewed at Tune Clinic" },
];

function renderHomePatientRail(variant) {
  const ringCls = variant === "dark" ? "ring-white/10" : "ring-slate-200";
  const items = HOME_PATIENT_PHOTOS.map((p, i) => `
        <div class="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden ring-2 ${ringCls} shadow-sm" style="${i > 0 ? "margin-left:-0.75rem;" : ""}">
          <img src="${p.file}" alt="${esc(p.alt)} ${i + 1}" loading="lazy" class="w-full h-full object-cover">
        </div>`).join("");
  return `
    <div class="flex justify-center items-center mb-10 md:mb-12">
      ${items}
    </div>`;
}

function renderReviewsSection({ ids, locale, localeData, headingOverride, variant = "light", surface } = {}) {
  if (!Array.isArray(ids) || !ids.length) return "";
  const g = (localeData && localeData[locale] && localeData[locale].global) || {};
  const r = g.reviews || {};
  const reviews = lookupReviews(ids);
  if (!reviews.length) return "";

  const heading = headingOverride || r.sectionHeading || "What patients say";
  const subheading = r.sectionSubheading || "";
  const disclaimer = r.disclaimer || "";
  const seeAll = r.seeAllOnGoogle || "See all reviews on Google →";
  const gmbUrl = "https://maps.app.goo.gl/q4jqivgPKaMs9nAy9";

  // Pure grid layout — adapts naturally without overflow:
  //   ≥4 reviews → 1 col mobile / 2 col tablet / 3 col desktop
  //   3 reviews  → 1 col mobile / 3 col desktop
  //   2 reviews  → 1 col mobile / 2 col desktop
  //   1 review   → centered single card
  const gridCls = reviews.length >= 4
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch"
    : reviews.length === 3
      ? "grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
      : reviews.length === 2
        ? "grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch max-w-4xl mx-auto"
        : "grid grid-cols-1 gap-5 max-w-2xl mx-auto";

  const cardsHtml = reviews.map((rv) => reviewCard(rv, locale, r)).join("\n");

  const wrapperBg = variant === "dark"
    ? "bg-slate-950 text-white border-y border-white/10"
    : "bg-slate-50 border-y border-slate-100";
  const headingColor = variant === "dark" ? "text-white" : "text-slate-900";
  const subheadColor = variant === "dark" ? "text-slate-300" : "text-slate-500";
  const accentColor = "text-gold";

  return `
<section class="reviews-module py-16 md:py-20 ${wrapperBg}" data-tc-reviews="${esc(locale)}">
  <div class="max-w-6xl mx-auto px-6">
    <div class="text-center mb-10">
      <span class="inline-flex items-center gap-2 ${accentColor} uppercase tracking-[0.22em] text-[10px] font-bold mb-3">
        <i class="fab fa-google text-xs"></i> ${esc(r.googleStarLine || "Verified on Google")}
      </span>
      <h2 class="text-3xl md:text-4xl font-serif ${headingColor} mb-3">${esc(heading)}</h2>
      ${subheading ? `<p class="text-sm md:text-base ${subheadColor} max-w-2xl mx-auto leading-relaxed">${esc(subheading)}</p>` : ""}
    </div>
    ${surface === "home" ? renderHomePatientRail(variant) : ""}
    <div class="${gridCls}">
      ${cardsHtml}
    </div>
    <div class="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <p class="text-xs ${subheadColor} italic">${esc(disclaimer)}</p>
      <a href="${gmbUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border ${variant === "dark" ? "border-white/20 text-white hover:border-white" : "border-slate-300 text-slate-800 hover:border-slate-900"} text-xs font-bold transition">
        <i class="fab fa-google"></i> ${esc(seeAll)}
      </a>
    </div>
  </div>
</section>
`;
}

// Per-surface review IDs map. Single source of truth so render.js, the
// JSON-LD builder, and the placeholder substitution stay in sync.
const SURFACE_REVIEW_IDS = {
  home: ["janice-c", "teri-t", "sejoo-k", "so-eun", "long-time-patient", "chanmany-t"],
  menu: ["s", "five-year-regular"],
  "signature-lifting": ["h", "sejoo-k"],
  "structural-reset": ["yeon-d"],
  "collagen-builder": ["teri-t", "chanmany-t", "anna-k"],
  // P1-C: Decision Protection LP. The trio combines an anti-broker /
  // anti-sales-pressure narrative (so-eun), a first-procedure trust
  // narrative (h), and a multi-year longevity narrative
  // (long-time-patient) — the three message families that align with
  // the indication-first ad hook.
  "decision-protection": ["so-eun", "h", "long-time-patient"],
  // Q2 2026: Metacell Protocol LP. Trio combines a regenerative voice
  // (yeon-d, the original Structural Reset case), a combination/longevity
  // narrative (anna-k), and a multi-year longevity narrative
  // (long-time-patient) — aligned with the autologous-regenerative-plus-
  // physician-designed-energy-device positioning of the page.
  "metacell-protocol": ["yeon-d", "anna-k", "long-time-patient"],
};

const PLACEHOLDER_RE = /<!--\s*TC_REVIEWS:([a-z0-9-]+)\s*-->/g;

function substituteReviewPlaceholders(fragment, locale, localeData) {
  return fragment.replace(PLACEHOLDER_RE, (_match, surface) => {
    const ids = SURFACE_REVIEW_IDS[surface];
    if (!ids) return "";
    return renderReviewsSection({ ids, locale, localeData, surface });
  });
}

function getSurfaceForEntry(entry) {
  if (!entry) return null;
  if (entry.key === "index") return "home";
  if (entry.key === "menu") return "menu";
  if (entry.key === "signature-lifting") return "signature-lifting";
  if (entry.key === "structural-reset") return "structural-reset";
  if (entry.key === "collagen-builder") return "collagen-builder";
  if (entry.key === "decision-protection") return "decision-protection";
  if (entry.key === "metacell-protocol") return "metacell-protocol";
  return null;
}

function reviewIdsForEntry(entry) {
  const surface = getSurfaceForEntry(entry);
  return surface ? SURFACE_REVIEW_IDS[surface].slice() : [];
}

module.exports = {
  renderReviewsSection,
  substituteReviewPlaceholders,
  reviewIdsForEntry,
  getSurfaceForEntry,
  SURFACE_REVIEW_IDS,
  reviewsById,
};
