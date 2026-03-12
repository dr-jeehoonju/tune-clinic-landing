const fs = require("fs");
const path = require("path");
const { SITE_URL, hrefLang, pageUrl, publicUrl } = require("./url-helpers");

const languageOrder = ["en", "ja", "zh", "th"];
const SITE_NAME = "Tune Clinic";
const DEFAULT_OG_IMAGE = `${SITE_URL}/.netlify/images?url=/main.jpeg&w=1200&fm=webp&q=75`;
const GA_MEASUREMENT_ID = "G-P68CDTNEV1";
const GOOGLE_SEARCH_CONSOLE_VERIFICATION = "";
const CONSENT_COPY = {
  en: {
    title: "Cookie Preferences",
    body: "We use analytics cookies to understand traffic and improve the experience for international patients.",
    accept: "Accept Analytics",
    reject: "Reject",
  },
  ja: {
    title: "クッキー設定",
    body: "アクセス解析クッキーを使用して、訪問状況を把握し、海外患者向けの体験を改善します。",
    accept: "分析を許可",
    reject: "拒否",
  },
  zh: {
    title: "Cookie 偏好设置",
    body: "我们使用分析 Cookie 来了解访问情况，并持续优化国际患者的浏览体验。",
    accept: "接受分析",
    reject: "拒绝",
  },
  th: {
    title: "การตั้งค่าคุกกี้",
    body: "เราใช้คุกกี้วิเคราะห์เพื่อทำความเข้าใจการเข้าชมและปรับปรุงประสบการณ์สำหรับผู้ป่วยต่างชาติ",
    accept: "ยอมรับการวิเคราะห์",
    reject: "ปฏิเสธ",
  },
};
const PHYSICIANS = [
  {
    slug: "cha-seung-yeon",
    name: "Dr. Seung Yeon Cha",
    image: `${SITE_URL}/.netlify/images?url=/cha.jpg&w=900&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Physician-led aesthetic planning focused on lifting, structural balance, and travel-conscious treatment design.",
  },
  {
    slug: "kim-kwang-yeon",
    name: "Dr. Kwang Yeon Kim",
    image: `${SITE_URL}/.netlify/images?url=/kim_ky.jpg&w=500&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Facial design strategy and physician supervision for structural protocols and international patient care.",
  },
  {
    slug: "ju-jee-hoon",
    name: "Dr. Jee Hoon Ju",
    image: `${SITE_URL}/.netlify/images?url=/ju.jpg&w=600&fm=webp&q=75`,
    avatarPosition: "object-top",
    jobTitle: "Aesthetic Medicine Physician",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Aesthetic medicine, hair treatment, and regenerative planning with international communication support.",
  },
  {
    slug: "jo-dong-hyun",
    name: "Dr. Dong Hyun Jo",
    image: `${SITE_URL}/.netlify/images?url=/jo.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Regenerative Medicine Physician",
    medicalSpecialty: "Regenerative Medicine",
    description:
      "Stem cell and regenerative strategy for tissue quality, recovery, and longer-term restoration planning.",
  },
  {
    slug: "kim-beom-jin",
    name: "Dr. Beom Jin Kim",
    image: `${SITE_URL}/.netlify/images?url=/kim_bj.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Plastic Surgery Advisor",
    medicalSpecialty: "Plastic Surgery",
    description:
      "Plastic surgery depth supporting structural assessment, referral judgment, and reconstructive context.",
  },
  {
    slug: "jang-seung-woo",
    name: "Dr. Seung Woo Jang",
    image: `${SITE_URL}/.netlify/images?url=/jang.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Medical Advisor",
    medicalSpecialty: "General Medicine",
    description:
      "MD, PhD advisory depth for broader medical evaluation and safety-focused treatment review.",
  },
];
const LOCALE_META = {
  en: { ogLocale: "en_US", ogAlternates: ["ja_JP", "zh_CN", "th_TH"] },
  ja: { ogLocale: "ja_JP", ogAlternates: ["en_US", "zh_CN", "th_TH"] },
  zh: { ogLocale: "zh_CN", ogAlternates: ["en_US", "ja_JP", "th_TH"] },
  th: { ogLocale: "th_TH", ogAlternates: ["en_US", "ja_JP", "zh_CN"] },
};

function readFragment(fragmentPath) {
  return fs.readFileSync(path.join(__dirname, fragmentPath), "utf8");
}

function esc(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absoluteAssetUrl(assetPath) {
  if (!assetPath) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//.test(assetPath)) return assetPath;
  return `${SITE_URL}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
}

function googleVerificationMeta() {
  if (!GOOGLE_SEARCH_CONSOLE_VERIFICATION) return "";
  return `<meta name="google-site-verification" content="${esc(GOOGLE_SEARCH_CONSOLE_VERIFICATION)}">`;
}

function consentBanner(locale) {
  const copy = CONSENT_COPY[locale] || CONSENT_COPY.en;
  return `
  <div id="cookie-consent-banner" class="hidden fixed bottom-4 left-4 right-4 md:left-6 md:right-6 z-[80]">
    <div class="max-w-4xl mx-auto bg-slate-950 text-white border border-slate-800 shadow-2xl rounded-2xl p-5 md:p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="max-w-2xl">
          <p class="text-gold text-[10px] font-bold uppercase tracking-[0.22em] mb-2">${esc(copy.title)}</p>
          <p class="text-sm text-slate-300 leading-relaxed">${esc(copy.body)}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 shrink-0">
          <button id="cookie-reject-btn" type="button" class="px-5 py-3 rounded-sm border border-slate-700 text-slate-200 text-sm font-bold hover:border-slate-500 transition">${esc(copy.reject)}</button>
          <button id="cookie-accept-btn" type="button" class="px-5 py-3 rounded-sm bg-gold text-white text-sm font-bold hover:opacity-90 transition">${esc(copy.accept)}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function alternateLinks(entry) {
  const locales = entry.availableLocales || languageOrder;
  const links = locales
    .map((locale) => {
      return `<link rel="alternate" hreflang="${hrefLang(locale)}" href="${publicUrl(locale, entry.key)}">`;
    })
    .join("\n  ");

  const fallbackLocale = locales.includes("en") ? "en" : locales[0];
  return `${links}\n  <link rel="alternate" hreflang="x-default" href="${publicUrl(fallbackLocale, entry.key)}">`;
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function breadcrumbName(entry, localeData) {
  const g = localeData[entry.locale].global;
  const map = {
    index: g.home,
    "design-method": g.method,
    "signature-lifting": g.sig,
    "structural-reset": g.reset,
    "collagen-builder": g.collagen,
    "filler-chamaka-se": g.filler,
    gallery: g.gallery,
    menu: g.menu,
  };
  return map[entry.key] || entry.title;
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

function faqStructuredData(fragment, canonicalUrl) {
  const matches = [...fragment.matchAll(/<details[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/details>/g)];
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
    provider: {
      "@id": `${SITE_URL}/#organization`,
    },
    areaServed: {
      "@type": "City",
      name: "Seoul",
    },
    serviceType: "Aesthetic medicine",
    url: canonicalUrl,
  };
}

function physicianStructuredData() {
  return PHYSICIANS.map((physician) => ({
    "@context": "https://schema.org",
    "@type": "Physician",
    "@id": `${SITE_URL}/#physician-${physician.slug}`,
    name: physician.name,
    image: physician.image,
    jobTitle: physician.jobTitle,
    medicalSpecialty: physician.medicalSpecialty,
    worksFor: {
      "@id": `${SITE_URL}/#organization`,
    },
    url: SITE_URL,
    description: physician.description,
  }));
}

function offerCatalogStructuredData(entry, localeData, canonicalUrl) {
  if (entry.key !== "index" && entry.key !== "menu") return null;

  const localePages = localeData[entry.locale].pages;
  const itemListElement = [
    "signature-lifting",
    "structural-reset",
    "collagen-builder",
    "filler-chamaka-se",
  ].map((key, index) => ({
    "@type": "Offer",
    position: index + 1,
    itemOffered: {
      "@type": "Service",
      name: breadcrumbName({ ...entry, key }, localeData),
      description: localePages[key]?.description ?? "",
      url: publicUrl(entry.locale, key),
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${canonicalUrl}#offers`,
    name: `${SITE_NAME} Programs`,
    itemListElement,
  };
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
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

function pageStructuredData(entry, localeData, fragment) {
  const g = localeData[entry.locale].global;
  const canonicalUrl = publicUrl(entry.locale, entry.key);
  const org = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    telephone: "+82-507-1438-8022",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5th floor, 868, Nonhyeon-ro, Gangnam-gu",
      addressLocality: "Seoul",
      addressCountry: "KR",
    },
    availableLanguage: languageOrder.map((locale) => localeData[locale].global.languageName),
    sameAs: ["https://www.instagram.com/tuneclinic_english/"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+82-507-1438-8022",
        contactType: "customer service",
        availableLanguage: languageOrder.map((locale) => localeData[locale].global.languageName),
        areaServed: "KR",
      },
    ],
  };
  const website = websiteStructuredData(localeData);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
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
    about: {
      "@id": `${SITE_URL}/#organization`,
    },
    breadcrumb: {
      "@id": `${canonicalUrl}#breadcrumb`,
    },
  };

  const breadcrumb = breadcrumbStructuredData(entry, localeData);
  breadcrumb["@id"] = `${canonicalUrl}#breadcrumb`;

  const faq = faqStructuredData(fragment, canonicalUrl);
  const service = serviceStructuredData(entry, localeData, canonicalUrl);
  const physicians = entry.key === "index" ? physicianStructuredData() : [];
  const offerCatalog = offerCatalogStructuredData(entry, localeData, canonicalUrl);
  const video = videoStructuredData(entry, canonicalUrl);

  return [org, website, webPage, breadcrumb, faq, service, offerCatalog, video, ...physicians].filter(Boolean);
}

function languageSwitcher(entry, localeData) {
  const current = localeData[entry.locale].global;
  const locales = entry.availableLocales || languageOrder;
  const rows = locales
    .map((code) => {
      const g = localeData[code].global;
      const active = code === entry.locale;
      return `<a href="${pageUrl(code, entry.key)}" class="block px-4 py-2.5 ${
        active
          ? "font-bold text-gold border-b border-slate-50"
          : "hover:bg-slate-50 hover:text-gold transition"
      }">${g.languageName}</a>`;
    })
    .join("");

  return `
    <div class="group relative cursor-pointer">
      <span class="hover:text-gold transition font-bold text-[10px] flex items-center gap-1">
        <i class="fas fa-globe"></i> ${esc(current.langLabel)}
      </span>
      <div class="absolute right-0 top-full pt-2 w-36 hidden group-hover:block z-50">
        <div class="bg-white text-slate-800 shadow-xl rounded-sm border border-slate-100 text-xs">
          ${rows}
        </div>
      </div>
    </div>
  `;
}

function homeChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const locales = entry.availableLocales || languageOrder;
  const blogLink = `<a href="${blogIndexUrl(entry.locale)}" class="hover:text-gold transition">${g.blog || "Blog"}</a>`;
  const guidesLink = entry.locale === "en"
    ? `<a href="/guides.html" class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 hover:border-amber-300 hover:text-amber-800 transition">Guides</a>`
    : "";
  const mobileLanguageLinks = locales
    .map((code) => {
      const locale = localeData[code].global;
      const active = code === entry.locale;
      return `<a href="${pageUrl(code, entry.key)}" class="block py-2 ${active ? "font-bold text-gold" : "text-slate-700"}">${locale.languageName}</a>`;
    })
    .join("");

  return `
    <div class="bg-slate-900 text-white text-xs py-3 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div class="flex items-center space-x-6">
          <span class="flex items-center"><i class="fas fa-user-md text-gold mr-2"></i> ${g.staffBadge}</span>
          <span class="hidden sm:inline text-slate-400">${g.travelBadge}</span>
        </div>
        <div class="hidden md:block absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-gold">
          ${g.tagline}
        </div>
        <div class="flex items-center gap-4">
          <div class="group relative cursor-pointer hidden md:block">
            <span class="hover:text-gold transition font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <i class="far fa-clock"></i> ${g.openToday}
            </span>
            <div class="absolute right-0 top-full mt-2 w-48 bg-white text-slate-800 shadow-xl rounded-sm p-3 hidden group-hover:block z-50 border border-slate-100 text-[10px]">
              <div class="flex justify-between mb-1"><span>${g.monFri}</span><span class="font-bold">10:00 - 21:00</span></div>
              <div class="flex justify-between mb-1"><span>${g.sat}</span><span class="font-bold">10:00 - 16:00</span></div>
              <div class="flex justify-between text-red-400"><span>${g.sun}</span><span class="font-bold">${g.closed}</span></div>
            </div>
          </div>
          <span class="font-bold uppercase tracking-wider text-[10px]">${g.location}</span>
        </div>
      </div>
    </div>
    <nav class="bg-white border-b border-slate-100 sticky top-0 z-40 transition-all duration-300" id="navbar">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <a href="${pageUrl(entry.locale, "index")}" class="flex items-center gap-2">
            <img src="/.netlify/images?url=/logo.png&w=200&fm=webp&q=90" alt="Tune Clinic" class="h-8">
            <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
          </a>
          <div class="hidden md:flex items-center gap-6">
            <div class="flex items-center gap-8 text-sm font-bold text-slate-600">
              <a href="${pageUrl(entry.locale, "index")}" class="hover:text-gold transition">${g.home}</a>
              <a href="${pageUrl(entry.locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
              <div class="relative group h-16 flex items-center">
                <button class="hover:text-gold transition flex items-center gap-1 cursor-pointer focus:outline-none">
                  ${g.programs} <i class="fas fa-chevron-down text-[10px] opacity-50"></i>
                </button>
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-56 bg-white shadow-xl border border-slate-100 rounded-b-sm hidden group-hover:block">
                  <div class="py-2">
                    <a href="${pageUrl(entry.locale, "signature-lifting")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.sig}</a>
                    <a href="${pageUrl(entry.locale, "structural-reset")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.reset}</a>
                    <a href="${pageUrl(entry.locale, "collagen-builder")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.collagen}</a>
                    <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.filler}</a>
                  </div>
                </div>
              </div>
              <a href="${pageUrl(entry.locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
              ${blogLink}
              ${guidesLink}
              <a href="#faq" class="hover:text-gold transition">${g.faq}</a>
              <a href="#contact" class="hover:text-gold transition">${g.contact}</a>
            </div>
            <div class="pl-5 border-l border-slate-200 text-slate-600">
              ${switcher}
            </div>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl max-h-[80vh] overflow-y-auto pb-24">
        <div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${esc(g.langLabel)}</p>
          <div class="grid grid-cols-2 gap-x-4">
            ${mobileLanguageLinks}
          </div>
        </div>
        <a href="${pageUrl(entry.locale, "index")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.home}</a>
        <a href="${pageUrl(entry.locale, "design-method")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.method}</a>
        <div class="bg-slate-50 px-6 py-4 border-b border-slate-50">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${g.programs}</p>
          <a href="${pageUrl(entry.locale, "signature-lifting")}" class="block py-2 text-slate-700">${g.sig}</a>
          <a href="${pageUrl(entry.locale, "structural-reset")}" class="block py-2 text-slate-700">${g.reset}</a>
          <a href="${pageUrl(entry.locale, "collagen-builder")}" class="block py-2 text-slate-700">${g.collagen}</a>
          <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="block py-2 text-slate-700">${g.filler}</a>
        </div>
        <a href="${pageUrl(entry.locale, "gallery")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.gallery}</a>
        <a href="${blogIndexUrl(entry.locale)}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.blog || "Blog"}</a>
        ${entry.locale === "en" ? `<a href="/guides.html" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">Guides</a>` : ""}
        <a href="#faq" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.faq}</a>
        <a href="#contact" class="block px-6 py-4 font-bold text-slate-800">${g.contact}</a>
      </div>
    </nav>
  `;
}

function siteFooter(entry, localeData) {
  const g = localeData[entry.locale].global;
  const isHome = entry.template === "home";
  const blogFooterLink = `<a href="${blogIndexUrl(entry.locale)}" class="hover:text-gold transition">${localeData[entry.locale].global.blog || "Blog"}</a>`;
  const guideLink = entry.locale === "en"
    ? `<a href="/guides.html" class="hover:text-gold transition">Guides Library</a>`
    : "";
  const topPanel = isHome
    ? `
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10 mb-14">
        <div class="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <span class="text-gold uppercase tracking-[0.22em] text-[10px] font-bold">Direct Physician Coordination</span>
            <h2 class="text-3xl md:text-4xl font-serif mt-4">${g.footerTitle}</h2>
            <p class="text-slate-300 leading-relaxed mt-4 max-w-2xl">${g.footerSub}</p>
          </div>
          <div class="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
            <a href="${g.consultationHref}" target="_blank" class="bg-white text-slate-950 px-8 py-4 font-bold rounded-sm hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg">
              <i class="${g.consultationIcon}"></i> ${g.footerCta}
            </a>
            <a href="${pageUrl(entry.locale, "menu")}" class="border border-white/15 text-white px-8 py-4 font-bold rounded-sm hover:border-gold hover:text-gold transition flex items-center justify-center gap-2">
              <i class="fas fa-list-ul"></i> ${g.menu}
            </a>
            <p class="text-xs text-slate-400 text-center lg:text-left">${g.footerResponse}</p>
          </div>
        </div>
      </div>
    `
    : `
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10 mb-14">
        <div class="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <span class="text-gold uppercase tracking-[0.22em] text-[10px] font-bold">Need a Clearer Plan?</span>
            <h2 class="text-3xl md:text-4xl font-serif mt-4">Use our guides to narrow the category. Let the consultation finalize the protocol.</h2>
            <p class="text-slate-300 leading-relaxed mt-4 max-w-2xl">The goal is not to create more choices. It is to help you arrive with better questions and a cleaner sense of what may actually fit your face and travel timing.</p>
          </div>
          <div class="flex flex-col gap-3 lg:items-stretch">
            <a href="${g.consultationHref}" target="_blank" class="bg-white text-slate-950 px-8 py-4 font-bold rounded-sm hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg">
              <i class="${g.consultationIcon}"></i> ${g.footerCta}
            </a>
            <a href="${pageUrl(entry.locale, "menu")}" class="border border-white/15 text-white px-8 py-4 font-bold rounded-sm hover:border-gold hover:text-gold transition flex items-center justify-center gap-2">
              <i class="fas fa-list-ul"></i> ${g.menu}
            </a>
            ${entry.locale === "en" ? `<a href="/guides.html" class="border border-white/15 text-white px-8 py-4 font-bold rounded-sm hover:border-gold hover:text-gold transition flex items-center justify-center gap-2"><i class="fas fa-book-open"></i> Guides Library</a>` : ""}
          </div>
        </div>
      </div>
    `;

  return `
    <footer id="contact" class="bg-slate-950 text-white border-t border-slate-800">
      <div class="max-w-6xl mx-auto px-6 pt-16 pb-10">
        ${topPanel}
        <div class="grid lg:grid-cols-[1.25fr_0.8fr_0.8fr_1fr] gap-10">
          <div>
            <a href="${pageUrl(entry.locale, "index")}" class="inline-flex items-center gap-3">
              <img src="/.netlify/images?url=/logo.png&w=200&fm=webp&q=90" alt="Tune Clinic" class="h-9">
              <span class="font-serif text-2xl text-white">Tune Clinic</span>
            </a>
            <p class="text-slate-300 leading-relaxed mt-5 max-w-md">
              Physician-led aesthetic planning for international patients seeking rational treatment design, clearer sequencing, and a more travel-conscious Seoul clinic experience.
            </p>
            <div class="flex flex-wrap gap-2 mt-6 text-[11px] uppercase tracking-[0.18em]">
              <span class="px-3 py-2 rounded-full border border-white/10 text-gold">${g.staffBadge}</span>
              <span class="px-3 py-2 rounded-full border border-white/10 text-slate-300">${g.travelBadge}</span>
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">Explore</p>
            <div class="flex flex-col gap-2.5 text-sm text-slate-300">
              <a href="${pageUrl(entry.locale, "index")}" class="hover:text-gold transition">${g.home}</a>
              <a href="${pageUrl(entry.locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
              <a href="${pageUrl(entry.locale, "menu")}" class="hover:text-gold transition">${g.menu}</a>
              <a href="${pageUrl(entry.locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
              ${blogFooterLink}
              ${guideLink}
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">${g.programs}</p>
            <div class="flex flex-col gap-2.5 text-sm text-slate-300">
              <a href="${pageUrl(entry.locale, "signature-lifting")}" class="hover:text-gold transition">${g.sig}</a>
              <a href="${pageUrl(entry.locale, "structural-reset")}" class="hover:text-gold transition">${g.reset}</a>
              <a href="${pageUrl(entry.locale, "collagen-builder")}" class="hover:text-gold transition">${g.collagen}</a>
              <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="hover:text-gold transition">${g.filler}</a>
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">Visit and Contact</p>
            <div class="space-y-4 text-sm text-slate-300">
              <p class="leading-relaxed"><i class="fas fa-location-dot text-gold mr-2"></i>5th floor, 868, Nonhyeon-ro, Gangnam-gu, Seoul</p>
              <p><i class="fas fa-phone-alt text-gold mr-2"></i><a href="tel:+82-507-1438-8022" class="hover:text-gold transition">+82-507-1438-8022</a></p>
              <p><i class="far fa-clock text-gold mr-2"></i>Mon-Fri 10:00 - 21:00<br><span class="pl-6">Sat 10:00 - 16:00</span></p>
              <p><i class="fas fa-globe text-gold mr-2"></i>${g.languageName} / 日本語 / 中文 / ไทย</p>
            </div>
          </div>
        </div>
        <div class="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p class="text-xs text-slate-500">${g.footerCopy}</p>
          <p class="text-xs text-slate-500">Canonical domain: tuneclinic-global.com</p>
        </div>
      </div>
    </footer>
    ${isHome ? `
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div class="flex gap-3">
        <a href="#programs" class="flex-1 bg-slate-100 text-slate-900 font-bold py-3 rounded-sm text-center text-sm">${g.mobileCta1}</a>
        <a href="${g.consultationHref}" target="_blank" class="flex-1 bg-slate-900 text-white font-extrabold py-3 rounded-sm text-center text-sm flex items-center justify-center gap-2">
          <i class="${g.consultationIcon}"></i> ${g.mobileCta2}
        </a>
      </div>
    </div>` : ""}
    <script>
      (function () {
        const btn = document.getElementById("mobile-menu-btn");
        const menu = document.getElementById("mobile-menu");
        if (btn && menu) btn.addEventListener("click", () => menu.classList.toggle("hidden"));
      })();
    </script>
  `;
}

function editorialChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const activeMap = {
    "design-method": g.method,
    gallery: g.gallery,
    menu: g.menu,
    guides: "Guides",
  };
  const activeClass = (key) =>
    entry.key === key
      ? "text-gold transition border-b-2 border-gold pb-1"
      : "hover:text-gold transition";
  const chromeLabel = entry.chromeLabel || activeMap[entry.key] || "SEO Guide";
  const guidesLink = entry.locale === "en"
    ? `<a href="/guides.html" class="${activeClass("guides")}">Guides</a>`
    : "";

  return `
    <div class="bg-slate-900 text-white text-xs py-3 border-b border-slate-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="${pageUrl(entry.locale, "index")}" class="flex items-center text-slate-300 hover:text-white transition">
          <i class="fas fa-arrow-left mr-2 text-gold"></i> ${g.backHome}
        </a>
        <div class="flex items-center gap-6">
          <span class="text-gold uppercase tracking-widest font-bold text-[10px] hidden sm:inline">${esc(chromeLabel)}</span>
          <a href="${pageUrl(entry.locale, "index")}#programs" class="text-slate-300 hover:text-white transition uppercase tracking-widest font-bold text-[10px]">
            ${g.viewPrograms} <i class="fas fa-arrow-right ml-1 text-gold"></i>
          </a>
          ${switcher}
        </div>
      </div>
    </div>
    <nav class="bg-white border-b border-slate-100 relative z-40" id="navbar">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <a href="${pageUrl(entry.locale, "index")}" class="flex items-center gap-2">
            <img src="/.netlify/images?url=/logo.png&w=200&fm=webp&q=90" alt="Tune Clinic" class="h-8">
            <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
          </a>
          <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="${pageUrl(entry.locale, "index")}" class="hover:text-gold transition">${g.home}</a>
            <a href="${pageUrl(entry.locale, "design-method")}" class="${activeClass("design-method")}">${g.method}</a>
            <div class="relative group h-16 flex items-center">
              <button class="hover:text-gold transition flex items-center gap-1 cursor-pointer focus:outline-none">
                ${g.programs} <i class="fas fa-chevron-down text-[10px] opacity-50"></i>
              </button>
              <div class="absolute top-full left-1/2 -translate-x-1/2 w-56 bg-white shadow-xl border border-slate-100 rounded-b-sm hidden group-hover:block">
                <div class="py-2">
                  <a href="${pageUrl(entry.locale, "signature-lifting")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.sig}</a>
                  <a href="${pageUrl(entry.locale, "structural-reset")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.reset}</a>
                  <a href="${pageUrl(entry.locale, "collagen-builder")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.collagen}</a>
                  <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.filler}</a>
                </div>
              </div>
            </div>
            <a href="${pageUrl(entry.locale, "menu")}" class="${activeClass("menu")}">${g.menu}</a>
            <a href="${pageUrl(entry.locale, "gallery")}" class="${activeClass("gallery")}">${g.gallery}</a>
            <a href="${blogIndexUrl(entry.locale)}" class="hover:text-gold transition">${g.blog || "Blog"}</a>
            ${guidesLink}
            <a href="${pageUrl(entry.locale, "index")}#faq" class="hover:text-gold transition">${g.faq}</a>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl max-h-[80vh] overflow-y-auto pb-24">
        <a href="${pageUrl(entry.locale, "index")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.home}</a>
        <a href="${pageUrl(entry.locale, "design-method")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${entry.key === "design-method" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.method}</a>
        <div class="bg-slate-50/50 px-6 py-4 border-b border-slate-50">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${g.programs}</p>
          <a href="${pageUrl(entry.locale, "signature-lifting")}" class="block py-2 text-slate-700">${g.sig}</a>
          <a href="${pageUrl(entry.locale, "structural-reset")}" class="block py-2 text-slate-700">${g.reset}</a>
          <a href="${pageUrl(entry.locale, "collagen-builder")}" class="block py-2 text-slate-700">${g.collagen}</a>
          <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="block py-2 text-slate-700">${g.filler}</a>
        </div>
        <a href="${pageUrl(entry.locale, "menu")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${entry.key === "menu" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.menu}</a>
        <a href="${pageUrl(entry.locale, "gallery")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${entry.key === "gallery" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.gallery}</a>
        <a href="${blogIndexUrl(entry.locale)}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.blog || "Blog"}</a>
        ${entry.locale === "en" ? `<a href="/guides.html" class="block px-6 py-4 font-bold border-b border-slate-50 ${entry.key === "guides" ? "text-gold bg-slate-50" : "text-slate-800"}">Guides</a>` : ""}
        <a href="${pageUrl(entry.locale, "index")}#faq" class="block px-6 py-4 font-bold text-slate-800">${g.faq}</a>
      </div>
    </nav>
    <script>
      (function () {
        const btn = document.getElementById("mobile-menu-btn");
        const menu = document.getElementById("mobile-menu");
        if (btn && menu) btn.addEventListener("click", () => menu.classList.toggle("hidden"));
      })();
    </script>
  `;
}

function programChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const item = (key, labelKey) =>
    entry.key === key
      ? `<span class="text-gold">${g[labelKey]}</span>`
      : `<a href="${pageUrl(entry.locale, key)}" class="hover:text-gold transition hidden sm:inline">${g[labelKey]}</a>`;
  const blogLink = `<span class="text-slate-700 hidden sm:inline">|</span><a href="${blogIndexUrl(entry.locale)}" class="hover:text-gold transition hidden sm:inline">${g.blog || "Blog"}</a>`;
  const guidesLink = entry.locale === "en"
    ? `<span class="text-slate-700 hidden sm:inline">|</span><a href="/guides.html" class="hover:text-gold transition hidden sm:inline">Guides</a>`
    : "";

  return `
    <div class="bg-slate-900 text-white text-xs py-3 border-b border-slate-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="${pageUrl(entry.locale, "index")}" class="flex items-center text-slate-300 hover:text-white transition">
          <i class="fas fa-arrow-left mr-2 text-gold"></i> ${g.backHome}
        </a>
        <div class="flex items-center gap-3 md:gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
          <a href="${pageUrl(entry.locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
          <span class="text-slate-700">|</span>
          <a href="${pageUrl(entry.locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
          <span class="text-slate-700">|</span>
          ${item("signature-lifting", "sig")}
          <span class="text-slate-700 hidden sm:inline">|</span>
          ${item("structural-reset", "reset")}
          <span class="text-slate-700 hidden sm:inline">|</span>
          ${item("collagen-builder", "collagen")}
          <span class="text-slate-700 hidden sm:inline">|</span>
          ${item("filler-chamaka-se", "filler")}
          ${blogLink}
          ${guidesLink}
          <span class="text-slate-700 ml-3 md:ml-4">|</span>
          ${switcher}
        </div>
      </div>
    </div>
  `;
}

function pageChrome(entry, localeData) {
  if (entry.template === "home") return homeChrome(entry, localeData);
  if (entry.template === "editorial") return editorialChrome(entry, localeData);
  return programChrome(entry, localeData);
}

function renderPage(entry, localeData) {
  const g = localeData[entry.locale].global;
  const fragment = readFragment(entry.fragment);
  const chrome = pageChrome(entry, localeData);
  const footer = siteFooter(entry, localeData);
  const canonicalUrl = publicUrl(entry.locale, entry.key);
  const localeMeta = LOCALE_META[entry.locale] || LOCALE_META.en;
  const ogImage = absoluteAssetUrl(entry.ogImage);
  const hreflang = alternateLinks(entry);
  const structuredData = pageStructuredData(entry, localeData, fragment);
  const availableLocales = entry.availableLocales || languageOrder;
  const ogAlternateTags = localeMeta.ogAlternates
    .filter((value) => {
      const localeMap = { en_US: "en", ja_JP: "ja", zh_CN: "zh", th_TH: "th" };
      const code = localeMap[value];
      return code && availableLocales.includes(code);
    })
    .map((value) => `<meta property="og:locale:alternate" content="${value}">`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="${g.langAttr}" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(entry.title)}</title>
  <meta name="description" content="${esc(entry.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="${SITE_NAME}">
  <meta property="og:title" content="${esc(entry.title)}">
  <meta property="og:description" content="${esc(entry.description)}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:alt" content="${esc(entry.title)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${localeMeta.ogLocale}">
  ${ogAlternateTags}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(entry.title)}">
  <meta name="twitter:description" content="${esc(entry.description)}">
  <meta name="twitter:image" content="${ogImage}">
  ${googleVerificationMeta()}
  <link rel="canonical" href="${canonicalUrl}">
  ${hreflang}
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(structuredData)}
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');
    body { font-family: 'Lato', sans-serif; }
    .font-serif { font-family: 'Playfair Display', serif; }
    .text-gold { color: #C5A059; }
    .bg-gold { background-color: #C5A059; }
    .border-gold { border-color: #C5A059; }
    .bg-gold-light { background-color: #F9F5F0; }
  </style>
</head>
<body class="${esc(entry.bodyClass)}">
${chrome}
${fragment}
${footer}
${consentBanner(entry.locale)}
<script>
  (function () {
    const storageKey = 'tune-cookie-consent';
    const banner = document.getElementById('cookie-consent-banner');
    const acceptBtn = document.getElementById('cookie-accept-btn');
    const rejectBtn = document.getElementById('cookie-reject-btn');

    if (!banner || !acceptBtn || !rejectBtn || typeof window.gtag !== 'function') return;

    function updateConsent(granted) {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }

    function saveChoice(value) {
      try {
        localStorage.setItem(storageKey, value);
      } catch (error) {
      }
    }

    function readChoice() {
      try {
        return localStorage.getItem(storageKey);
      } catch (error) {
        return null;
      }
    }

    const savedChoice = readChoice();

    if (savedChoice === 'accepted') {
      updateConsent(true);
    } else if (savedChoice === 'rejected') {
      updateConsent(false);
    } else {
      banner.classList.remove('hidden');
    }

    acceptBtn.addEventListener('click', function () {
      updateConsent(true);
      saveChoice('accepted');
      banner.classList.add('hidden');
    });

    rejectBtn.addEventListener('click', function () {
      updateConsent(false);
      saveChoice('rejected');
      banner.classList.add('hidden');
    });
  })();
</script>
</body>
</html>`;
}

function blogUrl(locale, slug) {
  const prefix = locale === "en" ? "" : `${locale}/`;
  return `/${prefix}blog/${slug}.html`;
}

function publicBlogUrl(locale, slug) {
  return `${SITE_URL}${blogUrl(locale, slug)}`;
}

function blogIndexUrl(locale) {
  const prefix = locale === "en" ? "" : `${locale}/`;
  return `/${prefix}blog/`;
}

function publicBlogIndexUrl(locale) {
  return `${SITE_URL}${blogIndexUrl(locale)}`;
}

function blogAlternateLinks(post) {
  const locales = post.availableLocales || ["en"];
  const links = locales
    .map((locale) => `<link rel="alternate" hreflang="${hrefLang(locale)}" href="${publicBlogUrl(locale, post.slug)}">`)
    .join("\n  ");
  const fallback = locales.includes("en") ? "en" : locales[0];
  return `${links}\n  <link rel="alternate" hreflang="x-default" href="${publicBlogUrl(fallback, post.slug)}">`;
}

function blogIndexAlternateLinks(locale) {
  const links = languageOrder
    .map((l) => `<link rel="alternate" hreflang="${hrefLang(l)}" href="${publicBlogIndexUrl(l)}">`)
    .join("\n  ");
  return `${links}\n  <link rel="alternate" hreflang="x-default" href="${publicBlogIndexUrl("en")}">`;
}

function resolveAuthors(authorSlugs) {
  const slugs = Array.isArray(authorSlugs) ? authorSlugs : [authorSlugs || "cha-seung-yeon"];
  return slugs.map((s) => PHYSICIANS.find((p) => p.slug === s) || PHYSICIANS[0]);
}

function blogPostStructuredData(post, localeData) {
  const canonicalUrl = publicBlogUrl(post.locale, post.slug);
  const authors = resolveAuthors(post.author);
  const g = localeData[post.locale].global;

  const org = { "@context": "https://schema.org", "@type": "MedicalClinic", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL };

  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList", "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: g.home, item: publicUrl(post.locale, "index") },
      { "@type": "ListItem", position: 2, name: g.blog || "Blog", item: publicBlogIndexUrl(post.locale) },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const authorLD = authors.length === 1
    ? { "@type": "Physician", "@id": `${SITE_URL}/#physician-${authors[0].slug}`, name: authors[0].name }
    : authors.map((a) => ({ "@type": "Physician", "@id": `${SITE_URL}/#physician-${a.slug}`, name: a.name }));

  const article = {
    "@context": "https://schema.org", "@type": "BlogPosting", "@id": `${canonicalUrl}#article`,
    headline: post.title, description: post.description,
    datePublished: post.dateISO, dateModified: post.dateISO,
    url: canonicalUrl, inLanguage: localeData[post.locale].global.langAttr,
    author: authorLD,
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${canonicalUrl}#webpage` },
    image: post.ogImage ? absoluteAssetUrl(post.ogImage) : DEFAULT_OG_IMAGE,
  };

  return [org, breadcrumb, article];
}

function blogChrome(post, localeData) {
  const g = localeData[post.locale].global;
  const switcher = languageSwitcher({ locale: post.locale, key: "index", availableLocales: post.availableLocales || languageOrder }, localeData);
  return `
    <div class="bg-slate-900 text-white text-xs py-3 border-b border-slate-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="${blogIndexUrl(post.locale)}" class="flex items-center text-slate-300 hover:text-white transition">
          <i class="fas fa-arrow-left mr-2 text-gold"></i> ${g.blog || "Blog"}
        </a>
        <div class="flex items-center gap-6">
          <span class="text-gold uppercase tracking-widest font-bold text-[10px] hidden sm:inline">${g.blog || "Blog"}</span>
          <a href="${pageUrl(post.locale, "index")}#programs" class="text-slate-300 hover:text-white transition uppercase tracking-widest font-bold text-[10px]">
            ${g.viewPrograms} <i class="fas fa-arrow-right ml-1 text-gold"></i>
          </a>
          ${switcher}
        </div>
      </div>
    </div>
    <nav class="bg-white border-b border-slate-100 relative z-40" id="navbar">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <a href="${pageUrl(post.locale, "index")}" class="flex items-center gap-2">
            <img src="/.netlify/images?url=/logo.png&w=200&fm=webp&q=90" alt="Tune Clinic" class="h-8">
            <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
          </a>
          <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="${pageUrl(post.locale, "index")}" class="hover:text-gold transition">${g.home}</a>
            <a href="${blogIndexUrl(post.locale)}" class="text-gold transition border-b-2 border-gold pb-1">${g.blog || "Blog"}</a>
            <a href="${pageUrl(post.locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
            <a href="${pageUrl(post.locale, "menu")}" class="hover:text-gold transition">${g.menu}</a>
            <a href="${pageUrl(post.locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl max-h-[80vh] overflow-y-auto pb-24">
        <a href="${pageUrl(post.locale, "index")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.home}</a>
        <a href="${blogIndexUrl(post.locale)}" class="block px-6 py-4 font-bold border-b border-slate-50 text-gold bg-slate-50">${g.blog || "Blog"}</a>
        <a href="${pageUrl(post.locale, "design-method")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.method}</a>
        <a href="${pageUrl(post.locale, "menu")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.menu}</a>
        <a href="${pageUrl(post.locale, "gallery")}" class="block px-6 py-4 font-bold text-slate-800">${g.gallery}</a>
      </div>
    </nav>
    <script>(function(){var b=document.getElementById("mobile-menu-btn"),m=document.getElementById("mobile-menu");if(b&&m)b.addEventListener("click",function(){m.classList.toggle("hidden")})})();</script>
  `;
}

function formatBlogDate(dateStr, locale) {
  const d = new Date(dateStr);
  const langMap = { en: "en-US", ja: "ja-JP", zh: "zh-CN", th: "th-TH" };
  return d.toLocaleDateString(langMap[locale] || "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderBlogPost(post, localeData) {
  const g = localeData[post.locale].global;
  const chrome = blogChrome(post, localeData);
  const footer = siteFooter({ locale: post.locale, template: "editorial", key: `blog-${post.slug}` }, localeData);
  const canonicalUrl = publicBlogUrl(post.locale, post.slug);
  const localeMeta = LOCALE_META[post.locale] || LOCALE_META.en;
  const ogImage = absoluteAssetUrl(post.ogImage);
  const hreflangLinks = blogAlternateLinks(post);
  const structuredData = blogPostStructuredData(post, localeData);
  const authors = resolveAuthors(post.author);
  const formattedDate = formatBlogDate(post.date, post.locale);
  const tagBadges = post.tags.map((t) => `<span class="px-3 py-1 rounded-full border border-slate-200 text-slate-500 text-[10px] uppercase tracking-[0.15em] font-bold">${esc(t)}</span>`).join(" ");
  const ogAlternateTags = localeMeta.ogAlternates
    .filter((v) => { const m = { en_US: "en", ja_JP: "ja", zh_CN: "zh", th_TH: "th" }; return m[v] && (post.availableLocales || []).includes(m[v]); })
    .map((v) => `<meta property="og:locale:alternate" content="${v}">`).join("\n  ");
  const authorNames = authors.map((a) => esc(a.name)).join(", ");
  const authorMeta = authors.map((a) => `<meta property="article:author" content="${esc(a.name)}">`).join("\n  ");
  const authorAvatars = authors.map((a) => `
      <div class="flex items-center gap-3">
        <img src="${a.image}" alt="${esc(a.name)}" class="w-11 h-11 rounded-full object-cover ${a.avatarPosition || "object-center"} border-2 border-gold">
        <div><p class="font-bold text-sm">${esc(a.name)}</p><p class="text-slate-400 text-xs">${esc(a.jobTitle)}</p></div>
      </div>`).join("");

  return `<!DOCTYPE html>
<html lang="${g.langAttr}" class="scroll-smooth">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(post.title)} | ${SITE_NAME} Blog</title>
  <meta name="description" content="${esc(post.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="${authorNames}">
  <meta property="og:title" content="${esc(post.title)}">
  <meta property="og:description" content="${esc(post.description)}">
  <meta property="og:site_name" content="${SITE_NAME}"><meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${ogImage}"><meta property="og:type" content="article">
  <meta property="og:locale" content="${localeMeta.ogLocale}">
  <meta property="article:published_time" content="${post.dateISO}">
  ${authorMeta}
  ${ogAlternateTags}
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(post.title)}">
  <meta name="twitter:description" content="${esc(post.description)}"><meta name="twitter:image" content="${ogImage}">
  <link rel="canonical" href="${canonicalUrl}">
  ${hreflangLinks}
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{anonymize_ip:true});</script>
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');
    body{font-family:'Lato',sans-serif}.font-serif{font-family:'Playfair Display',serif}.text-gold{color:#C5A059}.bg-gold{background-color:#C5A059}.border-gold{border-color:#C5A059}.bg-gold-light{background-color:#F9F5F0}
    .prose h2{font-family:'Playfair Display',serif;font-size:1.75rem;font-weight:600;color:#0f172a;margin-top:2.5rem;margin-bottom:1rem}
    .prose h3{font-size:1.25rem;font-weight:700;color:#1e293b;margin-top:2rem;margin-bottom:0.75rem}
    .prose p{color:#475569;line-height:1.8;margin-bottom:1.25rem}
    .prose ul,.prose ol{color:#475569;margin-bottom:1.25rem;padding-left:1.5rem}.prose li{margin-bottom:0.5rem;line-height:1.7}.prose ul{list-style-type:disc}.prose ol{list-style-type:decimal}
    .prose blockquote{border-left:4px solid #C5A059;padding:1rem 1.5rem;margin:1.5rem 0;background:#F9F5F0;color:#334155;font-style:italic}
    .prose img{border-radius:0.75rem;margin:1.5rem 0;max-width:100%}
    .prose a{color:#C5A059;text-decoration:underline;text-underline-offset:2px}.prose a:hover{color:#b8913f}
    .prose table{width:100%;border-collapse:collapse;margin:1.5rem 0}.prose th,.prose td{border:1px solid #e2e8f0;padding:0.75rem 1rem;text-align:left;font-size:0.875rem}.prose th{background:#f8fafc;font-weight:700}
    .prose hr{border:none;border-top:1px solid #e2e8f0;margin:2rem 0}.prose code{background:#f1f5f9;padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.875rem}
  </style>
</head>
<body>
${chrome}
<header class="bg-slate-950 text-white border-b border-slate-800">
  <div class="max-w-4xl mx-auto px-6 py-16 md:py-24">
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <a href="${blogIndexUrl(post.locale)}" class="text-gold text-[10px] uppercase tracking-[0.22em] font-bold hover:text-white transition"><i class="fas fa-arrow-left mr-1"></i> ${g.blog || "Blog"}</a>
      <span class="text-slate-600">|</span>
      <time class="text-slate-400 text-sm">${formattedDate}</time>
    </div>
    <h1 class="text-3xl md:text-5xl font-serif leading-tight">${esc(post.title)}</h1>
    <p class="text-slate-300 text-base md:text-lg leading-relaxed mt-5 max-w-3xl">${esc(post.description)}</p>
    <div class="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-white/10">
      ${authorAvatars}
    </div>
  </div>
</header>
<article class="py-14 md:py-20 bg-white">
  <div class="max-w-3xl mx-auto px-6 prose">${post.htmlContent}</div>
  ${post.tags.length ? `<div class="max-w-3xl mx-auto px-6 mt-10 pt-8 border-t border-slate-200 flex flex-wrap gap-2">${tagBadges}</div>` : ""}
</article>
<section class="py-14 bg-slate-50 border-t border-slate-200">
  <div class="max-w-3xl mx-auto px-6 text-center">
    <p class="text-gold uppercase tracking-widest text-[10px] font-bold mb-3">Continue Reading</p>
    <a href="${blogIndexUrl(post.locale)}" class="inline-block px-8 py-3 bg-slate-900 text-white font-bold rounded-sm hover:bg-slate-800 transition">${g.blog || "Blog"} <i class="fas fa-arrow-right ml-1"></i></a>
  </div>
</section>
${footer}
${consentBanner(post.locale)}
<script>(function(){var k='tune-cookie-consent',b=document.getElementById('cookie-consent-banner'),a=document.getElementById('cookie-accept-btn'),r=document.getElementById('cookie-reject-btn');if(!b||!a||!r||typeof window.gtag!=='function')return;function u(g){window.gtag('consent','update',{analytics_storage:g?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})}function s(v){try{localStorage.setItem(k,v)}catch(e){}}function rd(){try{return localStorage.getItem(k)}catch(e){return null}}var c=rd();if(c==='accepted')u(true);else if(c==='rejected')u(false);else b.classList.remove('hidden');a.addEventListener('click',function(){u(true);s('accepted');b.classList.add('hidden')});r.addEventListener('click',function(){u(false);s('rejected');b.classList.add('hidden')})})();</script>
</body>
</html>`;
}

function renderBlogIndex(locale, posts, localeData) {
  const g = localeData[locale].global;
  const canonicalUrl = publicBlogIndexUrl(locale);
  const localeMeta = LOCALE_META[locale] || LOCALE_META.en;
  const hreflangLinks = blogIndexAlternateLinks(locale);
  const blogTitle = g.blog || "Blog";
  const localePosts = posts.filter((p) => p.locale === locale);
  const switcher = languageSwitcher({ locale, key: "index", availableLocales: languageOrder }, localeData);

  const postCards = localePosts.map((post) => {
    const authors = resolveAuthors(post.author);
    const fd = formatBlogDate(post.date, locale);
    const tb = post.tags.slice(0, 3).map((t) => `<span class="inline-block px-2.5 py-1 rounded-full border border-slate-200 text-slate-400 text-[9px] uppercase tracking-[0.12em] font-bold whitespace-nowrap">${esc(t)}</span>`).join(" ");
    const authorNames = authors.map((a) => esc(a.name)).join(" & ");
    return `
      <a href="${blogUrl(locale, post.slug)}" class="group block rounded-2xl border border-slate-200 bg-white hover:border-gold hover:shadow-lg transition overflow-hidden">
        ${post.ogImage ? `<div class="aspect-[16/9] overflow-hidden"><img src="/.netlify/images?url=${post.ogImage}&w=600&fm=webp&q=80" alt="${esc(post.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"></div>` : ""}
        <div class="p-6">
          <div class="flex flex-wrap gap-1.5 mb-4">${tb}</div>
          <h2 class="text-lg font-serif text-slate-900 group-hover:text-gold transition leading-snug mb-2">${esc(post.title)}</h2>
          <p class="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-5">${esc(post.description)}</p>
          <div class="pt-4 border-t border-slate-100">
            <p class="text-xs font-medium text-slate-600">${authorNames}</p>
            <time class="text-[11px] text-slate-400 mt-0.5 block">${fd}</time>
          </div>
        </div>
      </a>`;
  }).join("\n");

  const emptyState = `<div class="text-center py-20"><i class="fas fa-pen-nib text-5xl text-slate-300 mb-6"></i><p class="text-lg text-slate-500">Articles coming soon.</p></div>`;
  const structuredData = [{ "@context": "https://schema.org", "@type": "Blog", "@id": `${canonicalUrl}#blog`, url: canonicalUrl, name: `${SITE_NAME} ${blogTitle}`, description: `Evidence-based aesthetic medicine insights from ${SITE_NAME}.`, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: g.langAttr }];
  const footer = siteFooter({ locale, template: "editorial", key: "blog-index" }, localeData);

  return `<!DOCTYPE html>
<html lang="${g.langAttr}" class="scroll-smooth">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blogTitle} | ${SITE_NAME}</title>
  <meta name="description" content="Evidence-based aesthetic medicine insights from the physicians at ${SITE_NAME}. Treatment education, physician perspectives, and travel planning for international patients.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${blogTitle} | ${SITE_NAME}"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}"><meta property="og:type" content="website"><meta property="og:locale" content="${localeMeta.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${canonicalUrl}">
  ${hreflangLinks}
  <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} Blog RSS" href="${SITE_URL}/blog/feed.xml">
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{anonymize_ip:true});</script>
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');
    body{font-family:'Lato',sans-serif}.font-serif{font-family:'Playfair Display',serif}.text-gold{color:#C5A059}.bg-gold{background-color:#C5A059}.border-gold{border-color:#C5A059}.bg-gold-light{background-color:#F9F5F0}
    .line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  </style>
</head>
<body>
<div class="bg-slate-900 text-white text-xs py-3 border-b border-slate-800 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
    <a href="${pageUrl(locale, "index")}" class="flex items-center text-slate-300 hover:text-white transition"><i class="fas fa-arrow-left mr-2 text-gold"></i> ${g.backHome}</a>
    <div class="flex items-center gap-6">
      <span class="text-gold uppercase tracking-widest font-bold text-[10px] hidden sm:inline">${blogTitle}</span>
      <a href="${pageUrl(locale, "index")}#programs" class="text-slate-300 hover:text-white transition uppercase tracking-widest font-bold text-[10px]">${g.viewPrograms} <i class="fas fa-arrow-right ml-1 text-gold"></i></a>
      ${switcher}
    </div>
  </div>
</div>
<nav class="bg-white border-b border-slate-100 relative z-40" id="navbar">
  <div class="max-w-7xl mx-auto px-6">
    <div class="flex justify-between items-center h-16">
      <a href="${pageUrl(locale, "index")}" class="flex items-center gap-2">
        <img src="/.netlify/images?url=/logo.png&w=200&fm=webp&q=90" alt="Tune Clinic" class="h-8">
        <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
      </a>
      <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
        <a href="${pageUrl(locale, "index")}" class="hover:text-gold transition">${g.home}</a>
        <a href="${blogIndexUrl(locale)}" class="text-gold transition border-b-2 border-gold pb-1">${blogTitle}</a>
        <a href="${pageUrl(locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
        <a href="${pageUrl(locale, "menu")}" class="hover:text-gold transition">${g.menu}</a>
        <a href="${pageUrl(locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
      </div>
      <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
    </div>
  </div>
  <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl max-h-[80vh] overflow-y-auto pb-24">
    <a href="${pageUrl(locale, "index")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.home}</a>
    <a href="${blogIndexUrl(locale)}" class="block px-6 py-4 font-bold border-b border-slate-50 text-gold bg-slate-50">${blogTitle}</a>
    <a href="${pageUrl(locale, "design-method")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.method}</a>
    <a href="${pageUrl(locale, "menu")}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.menu}</a>
    <a href="${pageUrl(locale, "gallery")}" class="block px-6 py-4 font-bold text-slate-800">${g.gallery}</a>
  </div>
</nav>
<script>(function(){var b=document.getElementById("mobile-menu-btn"),m=document.getElementById("mobile-menu");if(b&&m)b.addEventListener("click",function(){m.classList.toggle("hidden")})})();</script>
<header class="bg-slate-950 text-white border-b border-slate-800">
  <div class="max-w-6xl mx-auto px-6 py-16 md:py-24">
    <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-gold text-[10px] uppercase tracking-[0.22em] font-bold bg-white/5"><i class="fas fa-pen-nib"></i> ${SITE_NAME} ${blogTitle}</span>
    <h1 class="text-4xl md:text-6xl font-serif leading-tight mt-7 max-w-4xl">Physician Insights on Aesthetic Medicine</h1>
    <p class="text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-3xl">Evidence-based perspectives on lifting, injectables, regenerative treatments, and rational planning for international patients visiting Seoul.</p>
  </div>
</header>
<section class="py-14 md:py-20 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    ${localePosts.length ? `<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">${postCards}</div>` : emptyState}
  </div>
</section>
${footer}
${consentBanner(locale)}
<script>(function(){var k='tune-cookie-consent',b=document.getElementById('cookie-consent-banner'),a=document.getElementById('cookie-accept-btn'),r=document.getElementById('cookie-reject-btn');if(!b||!a||!r||typeof window.gtag!=='function')return;function u(g){window.gtag('consent','update',{analytics_storage:g?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})}function s(v){try{localStorage.setItem(k,v)}catch(e){}}function rd(){try{return localStorage.getItem(k)}catch(e){return null}}var c=rd();if(c==='accepted')u(true);else if(c==='rejected')u(false);else b.classList.remove('hidden');a.addEventListener('click',function(){u(true);s('accepted');b.classList.add('hidden')});r.addEventListener('click',function(){u(false);s('rejected');b.classList.add('hidden')})})();</script>
</body>
</html>`;
}

module.exports = { renderPage, renderBlogPost, renderBlogIndex };
