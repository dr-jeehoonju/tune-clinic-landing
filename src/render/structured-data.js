// JSON-LD builders for the standard pages and the blog templates.
// All builders return plain objects shaped for schema.org; the head
// helper wraps them in a graph-style <script type="application/ld+json">.

const { SITE_URL, publicUrl } = require("../url-helpers");
const {
  PHYSICIANS,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  languageOrder,
} = require("./constants");
const { stripHtml, absoluteAssetUrl } = require("./head");
const {
  reviewsById,
  reviewIdsForEntry,
} = require("./reviews-module");

function breadcrumbName(entry, localeData) {
  const g = localeData[entry.locale].global;
  const map = {
    index: g.home,
    "design-method": g.method,
    "signature-lifting": g.sig,
    "structural-reset": g.reset,
    "collagen-builder": g.collagen,
    "filler-chamaka-se": g.filler,
    "metacell-protocol": g.metacell || "Metacell Protocol",
    gallery: g.gallery,
    menu: g.menu,
    booking: g.contact,
  };
  return map[entry.key] || entry.title;
}

// Q2 2026: Per-locale exact H1 headline for the Metacell Protocol LP.
// Schema.org Article.headline must match the visible H1 verbatim. EN +
// KO use translated H1 strings; the 7 non-en/ko locales currently render
// the EN page body under a localized chrome (native review pending), so
// we keep the EN headline for those locales until translations land.
const METACELL_PROTOCOL_HEADLINES = {
  en: "Metacell Protocol",
  ko: "메타셀 프로토콜",
  ja: "Metacell Protocol",
  zh: "Metacell Protocol",
  de: "Metacell Protocol",
  fr: "Metacell Protocol",
  ru: "Metacell Protocol",
  th: "Metacell Protocol",
  vi: "Metacell Protocol",
};

function metacellProtocolHeadline(locale) {
  return METACELL_PROTOCOL_HEADLINES[locale] || METACELL_PROTOCOL_HEADLINES.en;
}

// P1-C: Per-locale exact H1 for the Decision Protection LP. The
// `Article.headline` MUST match the visible H1 verbatim so the ad copy,
// the page heading, and the schema all line up. Body markup contains
// HTML entities (`&mdash;`, `&laquo;`, `&ldquo;`, etc.) — we keep the
// schema string in already-decoded plain text so Search Console reads it
// cleanly. Bodies (`<p>`) localize inline; only this H1 is reused across
// the page + schema, so it earns a single source of truth here.
const DECISION_PROTECTION_HEADLINES = {
  en: "Ultherapy vs Thermage is the wrong first question.",
  ko: "“울쎄라 vs 써마지” — 첫 질문이 틀렸습니다.",
  ja: "「ウルセラ対サーマージ」は最初の質問が違います。",
  zh: "“Ultherapy 还是 Thermage” — 这个问题问错了。",
  de: "„Ulthera oder Thermage“ — die falsche erste Frage.",
  fr: "« Ultherapy ou Thermage » — la mauvaise première question.",
  ru: "«Ultherapy или Thermage» — неверный первый вопрос.",
  th: "「Ultherapy หรือ Thermage」 — เป็นคำถามแรกที่ผิด",
  vi: "“Ultherapy hay Thermage” — câu hỏi đầu tiên sai rồi.",
};

function decisionProtectionHeadline(locale) {
  return DECISION_PROTECTION_HEADLINES[locale] || DECISION_PROTECTION_HEADLINES.en;
}

function breadcrumbStructuredData(entry, localeData) {
  const g = localeData[entry.locale].global;
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: g.home,
      item: publicUrl(entry.locale, "index"),
    },
  ];

  if (entry.key !== "index") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: breadcrumbName(entry, localeData),
      item: publicUrl(entry.locale, entry.key),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function websiteStructuredData(localeData) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: languageOrder.map((locale) => localeData[locale].global.langAttr),
  };
}

function faqStructuredData(fragment, canonicalUrl, locale) {
  const matches = [
    ...fragment.matchAll(
      /<details[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/details>/g,
    ),
  ];
  if (!matches.length) return null;

  const entities = matches
    .map((match) => ({
      "@type": "Question",
      name: stripHtml(match[1]),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(match[2]),
      },
    }))
    .filter((item) => item.name && item.acceptedAnswer.text);

  if (!entities.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    inLanguage: locale || "en",
    mainEntity: entities,
  };
}

function serviceStructuredData(entry, localeData, canonicalUrl) {
  if (entry.template !== "program") return null;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    name: breadcrumbName(entry, localeData),
    description: entry.description,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "City", name: "Seoul" },
    serviceType: "Aesthetic medicine",
    url: canonicalUrl,
  };
}

function physicianStructuredData(locale) {
  const lang = locale || "en";
  return PHYSICIANS.map((physician) => {
    const node = {
      "@context": "https://schema.org",
      "@type": "Physician",
      "@id": `${SITE_URL}/#physician-${physician.slug}`,
      name: physician.name,
      image: physician.image,
      jobTitle: physician.jobTitle,
      medicalSpecialty: physician.medicalSpecialty,
      worksFor: { "@id": `${SITE_URL}/#organization` },
      url: SITE_URL,
      description: physician.description,
      inLanguage: lang,
    };
    if (physician.alumniOf) {
      node.alumniOf = {
        "@type": "EducationalOrganization",
        name: physician.alumniOf,
      };
    }
    if (Array.isArray(physician.knowsLanguage) && physician.knowsLanguage.length) {
      node.knowsLanguage = physician.knowsLanguage;
    }
    return node;
  });
}

function offerCatalogStructuredData(entry, localeData, canonicalUrl) {
  if (entry.key !== "index" && entry.key !== "menu") return null;

  const localePages = localeData[entry.locale].pages;
  // Visual order on the homepage program grid is collagen / volume / lifting /
  // elite, but the offerCatalog historically lists the 4 program slugs in
  // the order below. The "structural-reset" slot has been repositioned as
  // the Metacell Protocol premium tier (autologous regenerative + custom
  // energy device lifting) — emitted inline as a MedicalProcedure node so
  // it does not depend on a per-locale page bundle. Array length and the
  // remaining slugs are preserved.
  const itemListElement = [
    "signature-lifting",
    "structural-reset",
    "collagen-builder",
    "filler-chamaka-se",
  ].map((key, index) => {
    if (key === "structural-reset") {
      return {
        "@type": "Offer",
        position: index + 1,
        itemOffered: {
          "@type": "MedicalProcedure",
          name: "Metacell Protocol",
          alternateName: [
            "Autologous Regenerative Protocol",
            "Physician-Designed Cellular Regeneration",
          ],
          description:
            "Physician-designed protocol combining autologous cellular regeneration (Metacell PRP + PBM) with custom energy device lifting. Tailored to individual facial structure and recovery timeline.",
          procedureType: "https://schema.org/TherapeuticProcedure",
          bodyLocation: "Face",
          preparation: "Initial physician consultation required",
          followup: "Customized aftercare plan included",
          howPerformed:
            "Autologous PRP activation via PBM technology, followed by physician-customized energy device lifting (Ultherapy or Thermage based on individual assessment)",
          offers: {
            "@type": "Offer",
            price: "2000000",
            priceCurrency: "KRW",
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: "2000000",
              priceCurrency: "KRW",
            },
            availability: "https://schema.org/InStock",
          },
          performer: {
            "@type": "Physician",
            "@id": `${SITE_URL}/#physician-cha-seung-yeon`,
            name: "Dr. Seung Yeon Cha",
          },
        },
      };
    }
    return {
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: breadcrumbName({ ...entry, key }, localeData),
        description: localePages[key]?.description ?? "",
        url: publicUrl(entry.locale, key),
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${canonicalUrl}#offers`,
    name: `${SITE_NAME} Programs`,
    itemListElement,
  };
}

// P1-E: per-review schema.org/Review nodes for surfaces that display
// curated Google reviews. We deliberately do NOT emit AggregateRating
// — Google's review counts are not data we own, and republishing them
// as a clinic-side aggregate carries policy risk for medical surfaces.
// Per-Review nodes ARE allowed because we republish each review with
// verifiable attribution (link to the public GMB profile).
function reviewsStructuredData(reviewIds) {
  if (!Array.isArray(reviewIds) || !reviewIds.length) return [];
  return reviewIds
    .map((id) => reviewsById[id])
    .filter(Boolean)
    .map((review) => ({
      "@context": "https://schema.org",
      "@type": "Review",
      author: { "@type": "Person", "name": review.displayName },
      datePublished: `${review.date}-01`,
      reviewBody: review.body,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
      itemReviewed: {
        "@type": "MedicalClinic",
        name: "Tune Clinic Apgujeong",
        url: SITE_URL + "/",
      },
    }));
}

function videoStructuredData(entry, canonicalUrl) {
  if (entry.key !== "index") return null;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${canonicalUrl}#hero-video`,
    name: `${SITE_NAME} Hero Video`,
    description: entry.description,
    thumbnailUrl: [DEFAULT_OG_IMAGE],
    contentUrl: `${SITE_URL}/hero-video.mp4`,
    embedUrl: canonicalUrl,
    uploadDate: "2026-02-17T00:00:00+09:00",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

function pageStructuredData(entry, localeData, fragment) {
  const g = localeData[entry.locale].global;
  const canonicalUrl = publicUrl(entry.locale, entry.key);
  // P1-2: LocalBusiness/MedicalClinic schema. Hours, geo, and the
  // Google Maps URL strengthen Local SEO and help Meta/Google verify
  // the clinic as a real venue. Hours match the visible schedule on
  // the Visit/footer block (KST). Sunday is intentionally omitted —
  // Schema.org treats a missing day as closed.
  const org = {
    "@context": "https://schema.org",
    "@type": ["MedicalClinic", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    description: "Physician-led aesthetic medicine in the Apgujeong-Gangnam corridor — direct MD planning, transparent KRW pricing, protocols built for short-stay Seoul travelers.",
    telephone: "+82-507-1438-8022",
    priceRange: "$$",
    currenciesAccepted: "KRW, USD",
    paymentAccepted: "Cash, Credit Card",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5th floor, 868, Nonhyeon-ro, Gangnam-gu",
      addressLocality: "Seoul",
      addressRegion: "Seoul",
      postalCode: "06022",
      addressCountry: "KR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.526159,
      longitude: 127.028864,
    },
    hasMap: "https://maps.app.goo.gl/QPzFkQ9EpJP7D99y6",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "11:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "11:00",
        closes: "21:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    availableLanguage: languageOrder.map((locale) => localeData[locale].global.languageName),
    sameAs: [
      "https://www.instagram.com/tuneclinic_english/",
      "https://wa.me/821076744128",
      "https://maps.app.goo.gl/q4jqivgPKaMs9nAy9",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+82-507-1438-8022",
        contactType: "customer service",
        availableLanguage: languageOrder.map((locale) => localeData[locale].global.languageName),
        areaServed: "KR",
      },
      {
        "@type": "ContactPoint",
        contactType: "international patient coordination",
        url: "https://wa.me/821076744128",
        availableLanguage: ["en", "ko"],
        areaServed: ["US", "GB", "CA", "AU", "SG", "AE"],
      },
    ],
  };
  const website = websiteStructuredData(localeData);

  // P1-C: Decision Protection LP is a doctor-led explainer about a
  // medical decision, so the page itself is a `MedicalWebPage` rather
  // than a generic `WebPage`. Q2 2026 extension: the Metacell Protocol
  // LP describes a clinical protocol and likewise gets `MedicalWebPage`.
  const webPageType =
    entry.key === "decision-protection" || entry.key === "metacell-protocol"
      ? "MedicalWebPage"
      : "WebPage";
  const webPage = {
    "@context": "https://schema.org",
    "@type": webPageType,
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: entry.title,
    description: entry.description,
    inLanguage: g.langAttr,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
    },
    about: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
  };
  if (entry.key === "decision-protection") {
    webPage.lastReviewed = "2026-04-26";
    webPage.reviewedBy = { "@id": `${SITE_URL}/#physician-cha-seung-yeon` };
  }
  if (entry.key === "metacell-protocol") {
    webPage.lastReviewed = "2026-04-26";
    webPage.reviewedBy = { "@id": `${SITE_URL}/#physician-cha-seung-yeon` };
  }

  const breadcrumb = breadcrumbStructuredData(entry, localeData);
  breadcrumb["@id"] = `${canonicalUrl}#breadcrumb`;

  const faq = faqStructuredData(fragment, canonicalUrl, entry.locale);
  const service = serviceStructuredData(entry, localeData, canonicalUrl);
  const physicians = entry.key === "index" ? physicianStructuredData(entry.locale) : [];
  const offerCatalog = offerCatalogStructuredData(entry, localeData, canonicalUrl);
  const video = videoStructuredData(entry, canonicalUrl);
  const reviews = reviewsStructuredData(reviewIdsForEntry(entry));

  // P1-C: Article node for the Decision Protection LP. `headline` MUST
  // be the exact visible H1 string per locale. Author = the clinic's
  // Representative Director (Dr. Cha Seung Yeon), matching the
  // physician-led editorial precedent already used by blog posts.
  let article = null;
  if (entry.key === "decision-protection") {
    article = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${canonicalUrl}#article`,
      headline: decisionProtectionHeadline(entry.locale),
      description: entry.description,
      url: canonicalUrl,
      inLanguage: g.langAttr,
      datePublished: "2026-04-26",
      dateModified: "2026-04-26",
      mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` },
      author: {
        "@type": "Physician",
        "@id": `${SITE_URL}/#physician-cha-seung-yeon`,
        name: "Dr. Seung Yeon Cha",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      image: DEFAULT_OG_IMAGE,
      isPartOf: { "@id": `${canonicalUrl}#webpage` },
      about: { "@id": `${SITE_URL}/#organization` },
    };
  }

  // Q2 2026: Metacell Protocol LP emits a doctor-led `Article` (the
  // page is an explainer about the protocol itself) plus a richer
  // `MedicalProcedure` node so Search Console picks the protocol up
  // as a real procedure with a real procedureType / bodyLocation /
  // performer rather than a generic Service. The OfferCatalog at index
  // 1 already carries a Metacell `MedicalProcedure` for the home page;
  // this node lives at the protocol page itself.
  let metacellProcedure = null;
  if (entry.key === "metacell-protocol") {
    article = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${canonicalUrl}#article`,
      headline: metacellProtocolHeadline(entry.locale),
      description: entry.description,
      url: canonicalUrl,
      inLanguage: g.langAttr,
      datePublished: "2026-04-26",
      dateModified: "2026-04-26",
      mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` },
      author: {
        "@type": "Physician",
        "@id": `${SITE_URL}/#physician-cha-seung-yeon`,
        name: "Dr. Seung Yeon Cha",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
      image: DEFAULT_OG_IMAGE,
      isPartOf: { "@id": `${canonicalUrl}#webpage` },
      about: { "@id": `${SITE_URL}/#organization` },
    };
    metacellProcedure = {
      "@context": "https://schema.org",
      "@type": "MedicalProcedure",
      "@id": `${canonicalUrl}#procedure`,
      name: "Metacell Protocol",
      alternateName: [
        "Autologous Regenerative Protocol",
        "Physician-Designed Cellular Regeneration",
      ],
      description: entry.description,
      procedureType: "https://schema.org/TherapeuticProcedure",
      bodyLocation: "Face",
      preparation: "Initial physician consultation required",
      followup: "Customized aftercare plan included",
      howPerformed:
        "Autologous PRP activation via PBM (photobiomodulation), followed by physician-customized energy device lifting (Ultherapy and/or Thermage based on individual assessment).",
      performer: {
        "@type": "Physician",
        "@id": `${SITE_URL}/#physician-cha-seung-yeon`,
        name: "Dr. Seung Yeon Cha",
      },
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        price: "2000000",
        priceCurrency: "KRW",
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: "2000000",
          priceCurrency: "KRW",
        },
        availability: "https://schema.org/InStock",
      },
    };
  }

  return [org, website, webPage, breadcrumb, faq, service, offerCatalog, video, article, metacellProcedure, ...physicians, ...reviews].filter(Boolean);
}

function resolveAuthors(authorSlugs) {
  const slugs = Array.isArray(authorSlugs) ? authorSlugs : [authorSlugs || "cha-seung-yeon"];
  return slugs.map((s) => PHYSICIANS.find((p) => p.slug === s) || PHYSICIANS[0]);
}

function blogPostStructuredData(post, localeData, blogIndexUrlBuilder, blogPostUrlBuilder) {
  const canonicalUrl = blogPostUrlBuilder(post.locale, post.slug);
  const authors = resolveAuthors(post.author);
  const g = localeData[post.locale].global;

  const org = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: g.home, item: publicUrl(post.locale, "index") },
      { "@type": "ListItem", position: 2, name: g.blog || "Blog", item: blogIndexUrlBuilder(post.locale) },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const authorLD = authors.length === 1
    ? { "@type": "Physician", "@id": `${SITE_URL}/#physician-${authors[0].slug}`, name: authors[0].name }
    : authors.map((a) => ({ "@type": "Physician", "@id": `${SITE_URL}/#physician-${a.slug}`, name: a.name }));

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline: post.title,
    description: post.description,
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    url: canonicalUrl,
    inLanguage: localeData[post.locale].global.langAttr,
    author: authorLD,
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${canonicalUrl}#webpage` },
    image: post.ogImage ? absoluteAssetUrl(post.ogImage) : DEFAULT_OG_IMAGE,
  };

  return [org, breadcrumb, article];
}

module.exports = {
  breadcrumbName,
  breadcrumbStructuredData,
  websiteStructuredData,
  faqStructuredData,
  serviceStructuredData,
  physicianStructuredData,
  offerCatalogStructuredData,
  videoStructuredData,
  reviewsStructuredData,
  pageStructuredData,
  resolveAuthors,
  blogPostStructuredData,
};
