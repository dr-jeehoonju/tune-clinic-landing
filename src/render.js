const fs = require("fs");
const path = require("path");

const languageOrder = ["en", "ja", "zh", "th"];
const SITE_URL = "https://tuneclinic-global.com";
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
    title: "Cookie Preferences",
    body: "アクセス解析クッキーを使用して、訪問状況を把握し、海外患者向けの体験を改善します。",
    accept: "Accept Analytics",
    reject: "Reject",
  },
  zh: {
    title: "Cookie Preferences",
    body: "我们使用分析 Cookie 来了解访问情况，并持续优化国际患者的浏览体验。",
    accept: "Accept Analytics",
    reject: "Reject",
  },
  th: {
    title: "Cookie Preferences",
    body: "เราใช้คุกกี้วิเคราะห์เพื่อทำความเข้าใจการเข้าชมและปรับปรุงประสบการณ์สำหรับผู้ป่วยต่างชาติ",
    accept: "Accept Analytics",
    reject: "Reject",
  },
};
const PHYSICIANS = [
  {
    slug: "cha-seung-yeon",
    name: "Dr. Cha Seung-yeon",
    image: `${SITE_URL}/.netlify/images?url=/cha.jpg&w=900&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Physician-led aesthetic planning focused on lifting, structural balance, and travel-conscious treatment design.",
  },
  {
    slug: "kim-kwang-yeon",
    name: "Dr. Kim Kwang-yeon",
    image: `${SITE_URL}/.netlify/images?url=/kim_ky.jpg&w=500&fm=webp&q=75`,
    jobTitle: "Medical Director",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Facial design strategy and physician supervision for structural protocols and international patient care.",
  },
  {
    slug: "ju-jee-hoon",
    name: "Dr. Ju Jee-hoon",
    image: `${SITE_URL}/.netlify/images?url=/ju.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Aesthetic Medicine Physician",
    medicalSpecialty: "Aesthetic Medicine",
    description:
      "Aesthetic medicine, hair treatment, and regenerative planning with international communication support.",
  },
  {
    slug: "jo-dong-hyun",
    name: "Dr. Jo Dong-hyun",
    image: `${SITE_URL}/.netlify/images?url=/jo.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Regenerative Medicine Physician",
    medicalSpecialty: "Regenerative Medicine",
    description:
      "Stem cell and regenerative strategy for tissue quality, recovery, and longer-term restoration planning.",
  },
  {
    slug: "kim-beom-jin",
    name: "Dr. Kim Beom-jin",
    image: `${SITE_URL}/.netlify/images?url=/kim_bj.jpg&w=600&fm=webp&q=75`,
    jobTitle: "Plastic Surgery Advisor",
    medicalSpecialty: "Plastic Surgery",
    description:
      "Plastic surgery depth supporting structural assessment, referral judgment, and reconstructive context.",
  },
  {
    slug: "jang-seung-woo",
    name: "Dr. Jang Seung-woo",
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

function hrefLang(locale) {
  if (locale === "zh") return "zh-Hans";
  return locale;
}

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

function pageUrl(locale, pageKey) {
  const prefix = locale === "en" ? "" : `${locale}/`;
  const file = pageKey === "index" ? "index.html" : `${pageKey}.html`;
  return `/${prefix}${file}`;
}

function publicUrl(locale, pageKey) {
  const pathname = pageKey === "index"
    ? locale === "en"
      ? "/"
      : `/${locale}/`
    : pageUrl(locale, pageKey);
  return `${SITE_URL}${pathname}`;
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
      description: localePages[key].description,
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
    uploadDate: "2026-02-17",
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
          ${switcher}
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
          <div class="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
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
            <a href="#faq" class="hover:text-gold transition">${g.faq}</a>
            <a href="#contact" class="hover:text-gold transition">${g.contact}</a>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl">
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
        <a href="#faq" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.faq}</a>
        <a href="#contact" class="block px-6 py-4 font-bold text-slate-800">${g.contact}</a>
      </div>
    </nav>
  `;
}

function homeFooter(locale, localeData) {
  const g = localeData[locale].global;
  return `
    <footer id="contact" class="bg-slate-900 text-white py-24 text-center border-t border-slate-800">
      <div class="max-w-xl mx-auto px-6">
        <h2 class="text-3xl font-serif mb-6">${g.footerTitle}</h2>
        <p class="text-slate-400 mb-10 leading-relaxed">${g.footerSub}</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${g.consultationHref}" target="_blank" class="bg-slate-800 text-white px-10 py-4 font-bold rounded-sm hover:bg-slate-700 transition flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto text-lg border border-slate-700">
            <i class="${g.consultationIcon}"></i> ${g.footerCta}
          </a>
        </div>
        <p class="text-xs text-slate-400 mt-4">${g.footerResponse}</p>
        <p class="text-slate-400 text-sm mt-8">
          <i class="fas fa-map-marker-alt mr-1"></i> 5th floor, 868, Nonhyeon-ro, Gangnam-gu, Seoul
          &nbsp;·&nbsp;
          <i class="fas fa-phone-alt mr-1"></i> <a href="tel:+82-507-1438-8022" class="hover:text-gold transition">+82-507-1438-8022</a>
        </p>
        <p class="text-xs text-slate-600 mt-12">${g.footerCopy}</p>
      </div>
    </footer>
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div class="flex gap-3">
        <a href="#programs" class="flex-1 bg-slate-100 text-slate-900 font-bold py-3 rounded-sm text-center text-sm">${g.mobileCta1}</a>
        <a href="${g.consultationHref}" target="_blank" class="flex-1 bg-slate-900 text-white font-extrabold py-3 rounded-sm text-center text-sm flex items-center justify-center gap-2">
          <i class="${g.consultationIcon}"></i> ${g.mobileCta2}
        </a>
      </div>
    </div>
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
  };
  const activeClass = (key) =>
    entry.key === key
      ? "text-gold transition border-b-2 border-gold pb-1"
      : "hover:text-gold transition";
  const chromeLabel = entry.chromeLabel || activeMap[entry.key] || "SEO Guide";

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
            <a href="${pageUrl(entry.locale, "index")}#faq" class="hover:text-gold transition">${g.faq}</a>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl">
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
  const footer = entry.template === "home" ? homeFooter(entry.locale, localeData) : "";
  const canonicalUrl = publicUrl(entry.locale, entry.key);
  const localeMeta = LOCALE_META[entry.locale] || LOCALE_META.en;
  const ogImage = absoluteAssetUrl(entry.ogImage);
  const hreflang = alternateLinks(entry);
  const structuredData = pageStructuredData(entry, localeData, fragment);
  const ogAlternateTags = localeMeta.ogAlternates
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

module.exports = { renderPage };
