const fs = require("fs");
const path = require("path");
const { SITE_URL, hrefLang, pageUrl, publicUrl } = require("./url-helpers");
const {
  languageOrder,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  LOCALE_META,
  OG_LOCALE_TO_CODE,
  DATE_LOCALE_MAP,
  BLOG_PROSE_CSS,
  LINE_CLAMP_CSS,
} = require("./render/constants");
const {
  esc,
  absoluteAssetUrl,
  googleVerificationMeta,
  gaScript,
  metaPixelScript,
  structuredDataScript,
  siteAssets,
  consentBannerScript,
  consentBanner,
  alternateLinks,
} = require("./render/head");
const {
  pageStructuredData,
  resolveAuthors,
  blogPostStructuredData,
} = require("./render/structured-data");
const {
  substituteReviewPlaceholders,
} = require("./render/reviews-module");
const {
  substituteItineraryPlaceholders,
} = require("./render/itinerary-module");

function readFragment(fragmentPath) {
  return fs.readFileSync(path.join(__dirname, fragmentPath), "utf8");
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

// Locales that ship only a partial subset of the site (currently none, all full).
// For these locales we render a minimal navigation and footer.
const PARTIAL_LOCALES = new Set([]);

function mainNav(g, locale, localeData, switcher, options = {}) {
  const { activeKey, isHome, mobileLanguageLinksHtml } = options;
  // Per-page locale fallback: if a translated page exists for the current
  // locale, link to it; otherwise fall back to the English equivalent so
  // we never advertise a 404. Used by full locales whose nav advertises
  // pages we may not yet have translated for that language.
  const localePages = (localeData[locale] && localeData[locale].pages) || {};
  const urlFor = (pageKey) => {
    const target = localePages[pageKey] ? locale : "en";
    return pageUrl(target, pageKey);
  };
  const contactHref = pageUrl(locale, "booking");
  const activeClass = (key) =>
    activeKey === key
      ? "text-gold transition border-b-2 border-gold pb-1"
      : "hover:text-gold transition";

  // ─── Partial-locale nav (currently `ko`) ────────────────────────────
  if (PARTIAL_LOCALES.has(locale)) {
    return `
    <nav class="bg-white border-b border-slate-100 sticky top-0 z-40 transition-all duration-300" id="navbar">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <a href="${contactHref}" class="flex items-center gap-2">
            <img src="/logo.png" alt="Tune Clinic" class="h-8">
            <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
          </a>
          <div class="hidden md:flex items-center gap-6">
            <div class="flex items-center gap-8 text-sm font-bold text-slate-600">
              <a href="${contactHref}" class="${activeClass("booking")}">${g.contact}</a>
            </div>
            <div class="pl-5 border-l border-slate-200 text-slate-600">
              ${switcher}
            </div>
          </div>
          <button id="mobile-menu-btn" class="md:hidden text-slate-900 text-lg focus:outline-none"><i class="fas fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-xl">
        <div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${esc(g.langLabel)}</p>
          <div class="grid grid-cols-2 gap-x-4">
            ${mobileLanguageLinksHtml}
          </div>
        </div>
        <a href="${contactHref}" class="block px-6 py-4 font-bold ${activeKey === "booking" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.contact}</a>
      </div>
    </nav>
    <script>(function(){var b=document.getElementById("mobile-menu-btn"),m=document.getElementById("mobile-menu");if(b&&m)b.addEventListener("click",function(){m.classList.toggle("hidden")})})();</script>
    `;
  }

  // ─── Full-locale nav ────────────────────────────────────────────────
  // Blog is currently only published in BLOG_LANGUAGE_ORDER locales
  // (ko is excluded — see comment by BLOG_LANGUAGE_ORDER below).
  const blogTargetLocale = BLOG_LANGUAGE_ORDER.includes(locale) ? locale : "en";
  const blogHref = blogIndexUrl(blogTargetLocale);
  const faqHref = isHome ? "#faq" : `${urlFor("index")}#faq`;
  const blogLink = `<a href="${blogHref}" class="${activeKey === "blog" ? "text-gold transition border-b-2 border-gold pb-1" : "hover:text-gold transition"}">${g.blog || "Blog"}</a>`;
  const guidesLink = `<a href="${urlFor("guides")}" class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 hover:border-amber-300 hover:text-amber-800 transition ${activeKey === "guides" ? "ring-2 ring-amber-300" : ""}">${g.guides}</a>`;

  return `
    <nav class="bg-white border-b border-slate-100 sticky top-0 z-40 transition-all duration-300" id="navbar">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex justify-between items-center h-16">
          <a href="${urlFor("index")}" class="flex items-center gap-2">
            <img src="/logo.png" alt="Tune Clinic" class="h-8">
            <span class="font-serif text-xl font-bold text-slate-900 tracking-tight">Tune Clinic</span>
          </a>
          <div class="hidden md:flex items-center gap-6">
            <div class="flex items-center gap-8 text-sm font-bold text-slate-600">
              <a href="${urlFor("design-method")}" class="${activeClass("design-method")}">${g.method}</a>
              <div class="relative group h-16 flex items-center">
                <button class="hover:text-gold transition flex items-center gap-1 cursor-pointer focus:outline-none">
                  ${g.programs} <i class="fas fa-chevron-down text-[10px] opacity-50"></i>
                </button>
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-60 bg-white shadow-xl border border-slate-100 rounded-b-sm hidden group-hover:block">
                  <div class="py-2">
                    <a href="${urlFor("signature-lifting")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.sig}</a>
                    <a href="${urlFor("structural-reset")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.reset}</a>
                    <a href="${urlFor("metacell-protocol")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.metacell}</a>
                    <a href="${urlFor("collagen-builder")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.collagen}</a>
                    <a href="${urlFor("filler-chamaka-se")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700">${g.filler}</a>
                    <div class="border-t border-slate-100 mt-1 pt-1">
                      <a href="${urlFor("menu")}" class="block px-5 py-3 hover:bg-slate-50 hover:text-gold transition text-left text-slate-700"><i class="fas fa-list-ul text-[10px] mr-2 opacity-50"></i>${g.menu}</a>
                    </div>
                  </div>
                </div>
              </div>
              <a href="${urlFor("gallery")}" class="${activeClass("gallery")}">${g.gallery}</a>
              ${blogLink}
              ${guidesLink}
              <a href="${faqHref}" class="hover:text-gold transition">${g.faq}</a>
              <a href="${contactHref}" class="${activeClass("booking")}">${g.contact}</a>
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
            ${mobileLanguageLinksHtml}
          </div>
        </div>
        <a href="${urlFor("design-method")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${activeKey === "design-method" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.method}</a>
        <div class="bg-slate-50 px-6 py-4 border-b border-slate-50">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">${g.programs}</p>
          <a href="${urlFor("signature-lifting")}" class="block py-2 ${activeKey === "signature-lifting" ? "text-gold font-bold" : "text-slate-700"}">${g.sig}</a>
          <a href="${urlFor("structural-reset")}" class="block py-2 ${activeKey === "structural-reset" ? "text-gold font-bold" : "text-slate-700"}">${g.reset}</a>
          <a href="${urlFor("metacell-protocol")}" class="block py-2 ${activeKey === "metacell-protocol" ? "text-gold font-bold" : "text-slate-700"}">${g.metacell}</a>
          <a href="${urlFor("collagen-builder")}" class="block py-2 ${activeKey === "collagen-builder" ? "text-gold font-bold" : "text-slate-700"}">${g.collagen}</a>
          <a href="${urlFor("filler-chamaka-se")}" class="block py-2 ${activeKey === "filler-chamaka-se" ? "text-gold font-bold" : "text-slate-700"}">${g.filler}</a>
          <a href="${urlFor("menu")}" class="block py-2 text-slate-500 border-t border-slate-100 mt-2 pt-2"><i class="fas fa-list-ul text-[10px] mr-1 opacity-50"></i> ${g.menu}</a>
        </div>
        <a href="${urlFor("gallery")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${activeKey === "gallery" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.gallery}</a>
        <a href="${blogHref}" class="block px-6 py-4 font-bold border-b border-slate-50 ${activeKey === "blog" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.blog || "Blog"}</a>
        <a href="${urlFor("guides")}" class="block px-6 py-4 font-bold border-b border-slate-50 ${activeKey === "guides" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.guides}</a>
        <a href="${faqHref}" class="block px-6 py-4 font-bold border-b border-slate-50 text-slate-800">${g.faq}</a>
        <a href="${contactHref}" class="block px-6 py-4 font-bold ${activeKey === "booking" ? "text-gold bg-slate-50" : "text-slate-800"}">${g.contact}</a>
      </div>
    </nav>
    <script>(function(){var b=document.getElementById("mobile-menu-btn"),m=document.getElementById("mobile-menu");if(b&&m)b.addEventListener("click",function(){m.classList.toggle("hidden")})})();</script>
  `;
}

function homeChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const locales = entry.availableLocales || languageOrder;
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
              <i class="far fa-clock"></i> <span data-tc-clinic-status data-open="${g.openNow}" data-closed="${g.closedNow}">${g.hoursLabel}</span>
            </span>
            <div class="absolute right-0 top-full mt-2 w-48 bg-white text-slate-800 shadow-xl rounded-sm p-3 hidden group-hover:block z-50 border border-slate-100 text-[10px]">
              <div class="flex justify-between mb-1"><span>${g.monThu}</span><span class="font-bold">11:00 - 20:00</span></div>
              <div class="flex justify-between mb-1"><span>${g.fri}</span><span class="font-bold">11:00 - 21:00</span></div>
              <div class="flex justify-between mb-1"><span>${g.sat}</span><span class="font-bold">10:00 - 16:00</span></div>
              <div class="flex justify-between text-red-400"><span>${g.sun}</span><span class="font-bold">${g.closed}</span></div>
            </div>
          </div>
          <span class="font-bold uppercase tracking-wider text-[10px]">${g.location}</span>
        </div>
      </div>
    </div>
    <script>(function(){var el=document.querySelector('[data-tc-clinic-status]');if(!el)return;try{var p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());var d=p.find(function(x){return x.type==='weekday';}).value;var h=parseInt(p.find(function(x){return x.type==='hour';}).value,10);if(h===24)h=0;var m=parseInt(p.find(function(x){return x.type==='minute';}).value,10);var t=h*60+m;var open=false;if((d==='Mon'||d==='Tue'||d==='Wed'||d==='Thu')&&t>=660&&t<1200)open=true;else if(d==='Fri'&&t>=660&&t<1260)open=true;else if(d==='Sat'&&t>=600&&t<960)open=true;el.textContent=open?el.dataset.open:el.dataset.closed;if(!open)el.classList.add('text-red-300');else el.classList.add('text-emerald-300');}catch(e){}})();</script>
    ${mainNav(g, entry.locale, localeData, switcher, { activeKey: null, isHome: true, mobileLanguageLinksHtml: mobileLanguageLinks })}
  `;
}

function siteFooter(entry, localeData) {
  const g = localeData[entry.locale].global;
  const isHome = entry.template === "home";

  // Partial locales (currently `ko`) only ship the booking flow, so the
  // footer is reduced to a booking CTA panel + clinic contact details.
  // We deliberately omit the explore/programs columns to avoid linking to
  // English-only pages from a Korean experience.
  if (PARTIAL_LOCALES.has(entry.locale)) {
    const bookingHref = pageUrl(entry.locale, "booking");
    return `
    <footer id="footer" class="bg-slate-950 text-white border-t border-slate-800">
      <div class="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10 mb-14">
          <div class="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <span class="text-gold uppercase tracking-[0.22em] text-[10px] font-bold">${g.directPhysician || g.footerPlanTitle || ""}</span>
              <h2 class="text-3xl md:text-4xl font-serif mt-4">${g.footerTitle || g.footerPlanH2 || ""}</h2>
              <p class="text-slate-300 leading-relaxed mt-4 max-w-2xl">${g.footerSub || g.footerPlanDesc || ""}</p>
            </div>
            <div class="flex flex-col gap-3 lg:items-stretch">
              <a href="${bookingHref}" class="bg-white text-slate-950 px-8 py-4 font-bold rounded-sm hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg">
                <i class="fas fa-calendar-check"></i> ${g.footerCta || g.contact}
              </a>
              <a href="${g.consultationHref || g.whatsappHref || "#"}" target="_blank" rel="noopener noreferrer" class="border border-gold/60 text-gold px-8 py-4 font-bold rounded-sm hover:bg-gold/10 transition flex items-center justify-center gap-2">
                <i class="${g.consultationIcon || "fab fa-whatsapp"}"></i> ${g.footerCtaSecondary || ""}
              </a>
            </div>
          </div>
        </div>
        <div class="grid lg:grid-cols-[1.4fr_1fr] gap-10">
          <div>
            <a href="${bookingHref}" class="inline-flex items-center gap-3">
              <img src="/logo.png" alt="Tune Clinic" class="h-9">
              <span class="font-serif text-2xl text-white">Tune Clinic</span>
            </a>
            <p class="text-slate-300 leading-relaxed mt-5 max-w-md">${g.footerClinicDesc || ""}</p>
            <div class="flex flex-wrap gap-2 mt-6 text-[11px] uppercase tracking-[0.18em]">
              <span class="px-3 py-2 rounded-full border border-white/10 text-gold">${g.staffBadge || ""}</span>
              <span class="px-3 py-2 rounded-full border border-white/10 text-slate-300">${g.travelBadge || ""}</span>
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">${g.footerVisitContact || ""}</p>
            <div class="space-y-4 text-sm text-slate-300">
              <p class="leading-relaxed"><i class="fas fa-location-dot text-gold mr-2"></i>${g.footerAddress || ""}</p>
              <p><i class="fas fa-phone-alt text-gold mr-2"></i><a href="tel:+82-507-1438-8022" class="hover:text-gold transition">+82-507-1438-8022</a></p>
              <p><i class="far fa-clock text-gold mr-2"></i>${g.footerHours || ""}${g.footerHoursFri ? `<br><span class="pl-6">${g.footerHoursFri}</span>` : ""}<br><span class="pl-6">${g.footerHoursSat || ""}</span>${g.footerHoursClosed ? `<br><span class="pl-6 text-slate-400">${g.footerHoursClosed}</span>` : ""}</p>
              <div class="flex items-center gap-3 pt-2">
                <a href="${g.whatsappHref || "#"}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-green-400 hover:border-green-400 transition" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <a href="${g.instagramHref || "#"}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-pink-400 hover:border-pink-400 transition" title="Instagram"><i class="fab fa-instagram"></i></a>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p class="text-xs text-slate-500">${g.footerCopy || ""}</p>
          <p class="text-xs text-slate-500">Canonical domain: tuneclinic-global.com</p>
        </div>
      </div>
    </footer>
    `;
  }

  const blogFooterLink = `<a href="${blogIndexUrl(entry.locale)}" class="hover:text-gold transition">${localeData[entry.locale].global.blog || "Blog"}</a>`;
  const consultFooterLink = `<a href="${pageUrl(entry.locale, "booking")}" class="hover:text-gold transition">${g.contact}</a>`;
  const guideLink = `<a href="${pageUrl(entry.locale, "guides")}" class="hover:text-gold transition">${g.guidesLibrary}</a>`;
  const topPanel = isHome
    ? `
      <div class="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10 mb-14">
        <div class="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div>
            <span class="text-gold uppercase tracking-[0.22em] text-[10px] font-bold">${g.directPhysician}</span>
            <h2 class="text-3xl md:text-4xl font-serif mt-4">${g.footerTitle}</h2>
            <p class="text-slate-300 leading-relaxed mt-4 max-w-2xl">${g.footerSub}</p>
          </div>
          <div class="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
            <a href="${pageUrl(entry.locale, "booking")}" class="bg-white text-slate-950 px-8 py-4 font-bold rounded-sm hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg">
              <i class="fas fa-calendar-check"></i> ${g.footerCta}
            </a>
            <a href="${g.consultationHref}" target="_blank" rel="noopener noreferrer" class="border border-gold/60 text-gold px-8 py-4 font-bold rounded-sm hover:bg-gold/10 transition flex items-center justify-center gap-2">
              <i class="${g.consultationIcon}"></i> ${g.footerCtaSecondary}
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
            <span class="text-gold uppercase tracking-[0.22em] text-[10px] font-bold">${g.footerPlanTitle}</span>
            <h2 class="text-3xl md:text-4xl font-serif mt-4">${g.footerPlanH2}</h2>
            <p class="text-slate-300 leading-relaxed mt-4 max-w-2xl">${g.footerPlanDesc}</p>
          </div>
          <div class="flex flex-col gap-3 lg:items-stretch">
            <a href="${pageUrl(entry.locale, "booking")}" class="bg-white text-slate-950 px-8 py-4 font-bold rounded-sm hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg">
              <i class="fas fa-calendar-check"></i> ${g.footerCta}
            </a>
            <a href="${g.consultationHref}" target="_blank" rel="noopener noreferrer" class="border border-gold/60 text-gold px-8 py-4 font-bold rounded-sm hover:bg-gold/10 transition flex items-center justify-center gap-2">
              <i class="${g.consultationIcon}"></i> ${g.footerCtaSecondary}
            </a>
            <a href="${pageUrl(entry.locale, "menu")}" class="border border-white/15 text-white px-8 py-4 font-bold rounded-sm hover:border-gold hover:text-gold transition flex items-center justify-center gap-2">
              <i class="fas fa-list-ul"></i> ${g.menu}
            </a>
            <a href="${pageUrl(entry.locale, "guides")}" class="border border-white/15 text-white px-8 py-4 font-bold rounded-sm hover:border-gold hover:text-gold transition flex items-center justify-center gap-2"><i class="fas fa-book-open"></i> ${g.guidesLibrary}</a>
          </div>
        </div>
      </div>
    `;

  return `
    <footer id="footer" class="bg-slate-950 text-white border-t border-slate-800">
      <div class="max-w-6xl mx-auto px-6 pt-16 pb-10">
        ${topPanel}
        <div class="grid lg:grid-cols-[1.25fr_0.8fr_0.8fr_1fr] gap-10">
          <div>
            <a href="${pageUrl(entry.locale, "index")}" class="inline-flex items-center gap-3">
              <img src="/logo.png" alt="Tune Clinic" class="h-9">
              <span class="font-serif text-2xl text-white">Tune Clinic</span>
            </a>
            <p class="text-slate-300 leading-relaxed mt-5 max-w-md">
              ${g.footerClinicDesc}
            </p>
            <div class="flex flex-wrap gap-2 mt-6 text-[11px] uppercase tracking-[0.18em]">
              <span class="px-3 py-2 rounded-full border border-white/10 text-gold">${g.staffBadge}</span>
              <span class="px-3 py-2 rounded-full border border-white/10 text-slate-300">${g.travelBadge}</span>
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">${g.footerExplore}</p>
            <div class="flex flex-col gap-2.5 text-sm text-slate-300">
              <a href="${pageUrl(entry.locale, "index")}" class="hover:text-gold transition">${g.home}</a>
              <a href="${pageUrl(entry.locale, "design-method")}" class="hover:text-gold transition">${g.method}</a>
              <a href="${pageUrl(entry.locale, "menu")}" class="hover:text-gold transition">${g.menu}</a>
              <a href="${pageUrl(entry.locale, "gallery")}" class="hover:text-gold transition">${g.gallery}</a>
              ${blogFooterLink}
              ${consultFooterLink}
              ${guideLink}
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">${g.programs}</p>
            <div class="flex flex-col gap-2.5 text-sm text-slate-300">
              <a href="${pageUrl(entry.locale, "signature-lifting")}" class="hover:text-gold transition">${g.sig}</a>
              <a href="${pageUrl(entry.locale, "structural-reset")}" class="hover:text-gold transition">${g.reset}</a>
              <a href="${pageUrl(entry.locale, "metacell-protocol")}" class="hover:text-gold transition">${g.metacell}</a>
              <a href="${pageUrl(entry.locale, "collagen-builder")}" class="hover:text-gold transition">${g.collagen}</a>
              <a href="${pageUrl(entry.locale, "filler-chamaka-se")}" class="hover:text-gold transition">${g.filler}</a>
            </div>
          </div>
          <div>
            <p class="text-gold uppercase tracking-[0.2em] text-[10px] font-bold mb-5">${g.footerVisitContact}</p>
            <div class="space-y-4 text-sm text-slate-300">
              <p class="leading-relaxed"><i class="fas fa-location-dot text-gold mr-2"></i>${g.footerAddress}</p>
              <p><i class="fas fa-phone-alt text-gold mr-2"></i><a href="tel:+82-507-1438-8022" class="hover:text-gold transition">+82-507-1438-8022</a></p>
              <p><i class="far fa-clock text-gold mr-2"></i>${g.footerHours}${g.footerHoursFri ? `<br><span class="pl-6">${g.footerHoursFri}</span>` : ""}<br><span class="pl-6">${g.footerHoursSat}</span>${g.footerHoursClosed ? `<br><span class="pl-6 text-slate-400">${g.footerHoursClosed}</span>` : ""}</p>
              <p><i class="fas fa-globe text-gold mr-2"></i>${languageOrder.map(code => localeData[code].global.langLabel).join(' / ')}</p>
              <div class="flex items-center gap-3 pt-2">
                <a href="${g.whatsappHref}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-green-400 hover:border-green-400 transition" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <a href="${g.instagramHref}" target="_blank" rel="noopener noreferrer" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-pink-400 hover:border-pink-400 transition" title="Instagram"><i class="fab fa-instagram"></i></a>
                <button onclick="document.getElementById('line-qr-modal').classList.remove('hidden')" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-green-500 hover:border-green-500 transition cursor-pointer" title="LINE"><i class="fab fa-line"></i></button>
                <button onclick="document.getElementById('wechat-qr-modal').classList.remove('hidden')" class="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-slate-300 hover:text-green-400 hover:border-green-400 transition cursor-pointer" title="WeChat"><i class="fab fa-weixin"></i></button>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p class="text-xs text-slate-500">${g.footerCopy}</p>
          <p class="text-xs text-slate-500">Canonical domain: tuneclinic-global.com</p>
        </div>
      </div>
    </footer>
    <div id="line-qr-modal" class="hidden fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onclick="if(event.target===this)this.classList.add('hidden')">
      <div class="bg-white rounded-xl p-6 max-w-xs w-full text-center shadow-2xl relative">
        <button onclick="this.closest('#line-qr-modal').classList.add('hidden')" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 text-lg cursor-pointer">&times;</button>
        <i class="fab fa-line text-3xl text-green-500 mb-3"></i>
        <p class="font-bold text-slate-900 mb-1">LINE</p>
        <p class="text-xs text-slate-500 mb-4">Scan to add Tune Clinic on LINE</p>
        <img src="${g.lineQr}" alt="LINE QR Code" class="w-56 h-56 mx-auto rounded-lg">
      </div>
    </div>
    <div id="wechat-qr-modal" class="hidden fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onclick="if(event.target===this)this.classList.add('hidden')">
      <div class="bg-white rounded-xl p-6 max-w-xs w-full text-center shadow-2xl relative">
        <button onclick="this.closest('#wechat-qr-modal').classList.add('hidden')" class="absolute top-3 right-3 text-slate-400 hover:text-slate-800 text-lg cursor-pointer">&times;</button>
        <i class="fab fa-weixin text-3xl text-green-600 mb-3"></i>
        <p class="font-bold text-slate-900 mb-1">WeChat</p>
        <p class="text-xs text-slate-500 mb-4">Scan to add Tune Clinic on WeChat</p>
        <img src="${g.wechatQr}" alt="WeChat QR Code" class="w-56 h-56 mx-auto rounded-lg">
      </div>
    </div>
    ${isHome ? `
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div class="flex gap-3">
        <a href="#programs" class="flex-1 bg-slate-100 text-slate-900 font-bold py-3 rounded-sm text-center text-sm">${g.mobileCta1}</a>
        <a href="${pageUrl(entry.locale, "booking")}" class="flex-1 bg-slate-900 text-white font-extrabold py-3 rounded-sm text-center text-sm flex items-center justify-center gap-2">
          <i class="fas fa-calendar-check"></i> ${g.mobileCta2}
        </a>
      </div>
    </div>` : ""}
  `;
}

function editorialChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const mobileLanguageLinksHtml = (entry.availableLocales || languageOrder).map((code) => { const loc = localeData[code].global; const active = code === entry.locale; return `<a href="${pageUrl(code, entry.key)}" class="block py-2 ${active ? "font-bold text-gold" : "text-slate-700"}">${loc.languageName}</a>`; }).join("");

  return mainNav(g, entry.locale, localeData, switcher, { activeKey: entry.key, isHome: false, mobileLanguageLinksHtml });
}

function programChrome(entry, localeData) {
  const g = localeData[entry.locale].global;
  const switcher = languageSwitcher(entry, localeData);
  const mobileLanguageLinksHtml = (entry.availableLocales || languageOrder).map((code) => { const loc = localeData[code].global; const active = code === entry.locale; return `<a href="${pageUrl(code, entry.key)}" class="block py-2 ${active ? "font-bold text-gold" : "text-slate-700"}">${loc.languageName}</a>`; }).join("");

  return mainNav(g, entry.locale, localeData, switcher, { activeKey: entry.key, isHome: false, mobileLanguageLinksHtml });
}

function pageChrome(entry, localeData) {
  if (entry.template === "home") return homeChrome(entry, localeData);
  if (entry.template === "editorial") return editorialChrome(entry, localeData);
  return programChrome(entry, localeData);
}

function ogAlternateMeta(localeMeta, availableLocales) {
  return localeMeta.ogAlternates
    .filter((value) => {
      const code = OG_LOCALE_TO_CODE[value];
      return code && availableLocales.includes(code);
    })
    .map((value) => `<meta property="og:locale:alternate" content="${value}">`)
    .join("\n  ");
}

function renderPage(entry, localeData) {
  const g = localeData[entry.locale].global;
  const rawFragment = readFragment(entry.fragment);
  const reviewsSubstituted = substituteReviewPlaceholders(rawFragment, entry.locale, localeData);
  const fragment = substituteItineraryPlaceholders(reviewsSubstituted, entry.locale, localeData);
  const chrome = pageChrome(entry, localeData);
  const footer = siteFooter(entry, localeData);
  const canonicalUrl = publicUrl(entry.locale, entry.key);
  const localeMeta = LOCALE_META[entry.locale] || LOCALE_META.en;
  const ogImage = absoluteAssetUrl(entry.ogImage);
  const hreflang = alternateLinks(entry);
  const structuredData = pageStructuredData(entry, localeData, fragment);
  const availableLocales = entry.availableLocales || languageOrder;
  const ogAlternateTags = ogAlternateMeta(localeMeta, availableLocales);

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
  <link rel="icon" href="/logo.png">
  ${hreflang}
  ${gaScript()}
  ${metaPixelScript()}
  ${structuredDataScript(structuredData)}
  ${siteAssets()}
</head>
<body class="${esc(entry.bodyClass)}">
${chrome}
${fragment}
${footer}
${consentBanner(entry.locale)}
${consentBannerScript()}
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

// `ko` is now a full locale, so include it in the blog language switchers.
const BLOG_LANGUAGE_ORDER = languageOrder;

function blogIndexAlternateLinks(locale) {
  const links = BLOG_LANGUAGE_ORDER
    .map((l) => `<link rel="alternate" hreflang="${hrefLang(l)}" href="${publicBlogIndexUrl(l)}">`)
    .join("\n  ");
  return `${links}\n  <link rel="alternate" hreflang="x-default" href="${publicBlogIndexUrl("en")}">`;
}

function blogChrome(post, localeData) {
  const g = localeData[post.locale].global;
  const blogLocales = post.availableLocales || languageOrder;
  const currentLang = localeData[post.locale].global;
  const blogSwitcherRows = blogLocales.map((code) => {
    const lg = localeData[code].global;
    const active = code === post.locale;
    return `<a href="${blogUrl(code, post.slug)}" class="block px-4 py-2.5 ${active ? "font-bold text-gold border-b border-slate-50" : "hover:bg-slate-50 hover:text-gold transition"}">${lg.languageName}</a>`;
  }).join("");
  const switcher = `<div class="group relative cursor-pointer"><span class="hover:text-gold transition font-bold text-[10px] flex items-center gap-1"><i class="fas fa-globe"></i> ${esc(currentLang.langLabel)}</span><div class="absolute right-0 top-full pt-2 w-36 hidden group-hover:block z-50"><div class="bg-white text-slate-800 shadow-xl rounded-sm border border-slate-100 text-xs">${blogSwitcherRows}</div></div></div>`;
  const mobileLanguageLinksHtml = blogLocales.map((code) => { const loc = localeData[code].global; const active = code === post.locale; return `<a href="${blogUrl(code, post.slug)}" class="block py-2 ${active ? "font-bold text-gold" : "text-slate-700"}">${loc.languageName}</a>`; }).join("");

  return mainNav(g, post.locale, localeData, switcher, { activeKey: "blog", isHome: false, mobileLanguageLinksHtml });
}

function formatBlogDate(dateStr, locale) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(DATE_LOCALE_MAP[locale] || "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderBlogPost(post, localeData) {
  const g = localeData[post.locale].global;
  const chrome = blogChrome(post, localeData);
  const footer = siteFooter({ locale: post.locale, template: "editorial", key: `blog-${post.slug}` }, localeData);
  const canonicalUrl = publicBlogUrl(post.locale, post.slug);
  const localeMeta = LOCALE_META[post.locale] || LOCALE_META.en;
  const ogImage = absoluteAssetUrl(post.ogImage);
  const hreflangLinks = blogAlternateLinks(post);
  const structuredData = blogPostStructuredData(post, localeData, publicBlogIndexUrl, publicBlogUrl);
  const authors = resolveAuthors(post.author);
  const formattedDate = formatBlogDate(post.date, post.locale);
  const tagBadges = post.tags.map((t) => `<span class="px-3 py-1 rounded-full border border-slate-200 text-slate-500 text-[10px] uppercase tracking-[0.15em] font-bold">${esc(t)}</span>`).join(" ");
  const ogAlternateTags = ogAlternateMeta(localeMeta, post.availableLocales || []);
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
  <link rel="icon" href="/logo.png">
  ${hreflangLinks}
  ${gaScript()}
  ${metaPixelScript()}
  ${structuredDataScript(structuredData)}
  ${siteAssets({ extraStyles: BLOG_PROSE_CSS })}
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
    <p class="text-gold uppercase tracking-widest text-[10px] font-bold mb-3">${g.continueReading}</p>
    <a href="${blogIndexUrl(post.locale)}" class="inline-block px-8 py-3 bg-slate-900 text-white font-bold rounded-sm hover:bg-slate-800 transition">${g.blog || "Blog"} <i class="fas fa-arrow-right ml-1"></i></a>
  </div>
</section>
${footer}
${consentBanner(post.locale)}
${consentBannerScript()}
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
  const currentLang = localeData[locale].global;
  const blogIdxSwitcherRows = BLOG_LANGUAGE_ORDER.map((code) => {
    const lg = localeData[code].global;
    const active = code === locale;
    return `<a href="${blogIndexUrl(code)}" class="block px-4 py-2.5 ${active ? "font-bold text-gold border-b border-slate-50" : "hover:bg-slate-50 hover:text-gold transition"}">${lg.languageName}</a>`;
  }).join("");
  const switcher = `<div class="group relative cursor-pointer"><span class="hover:text-gold transition font-bold text-[10px] flex items-center gap-1"><i class="fas fa-globe"></i> ${esc(currentLang.langLabel)}</span><div class="absolute right-0 top-full pt-2 w-36 hidden group-hover:block z-50"><div class="bg-white text-slate-800 shadow-xl rounded-sm border border-slate-100 text-xs">${blogIdxSwitcherRows}</div></div></div>`;

  const pinnedLabel = g.doctorsPicks || "Doctor's Picks";
  const allArticlesLabel = g.allArticles || "All Articles";

  const cardHtml = (post, isPinned, isSlider) => {
    const authors = resolveAuthors(post.author);
    const fd = formatBlogDate(post.date, locale);
    const tb = post.tags.slice(0, 3).map((t) => `<span class="inline-block px-2.5 py-1 rounded-full border border-slate-200 text-slate-400 text-[9px] uppercase tracking-[0.12em] font-bold whitespace-nowrap">${esc(t)}</span>`).join(" ");
    const tagBoxCls = "flex flex-wrap gap-1.5 mb-4 h-[52px] overflow-hidden content-start";
    const authorNames = authors.map((a) => esc(a.name)).join(" & ");
    const cardBorder = isPinned ? "border-gold/40 hover:border-gold ring-1 ring-gold/10" : "border-slate-200 hover:border-gold";
    const pinnedBadge = isPinned ? `<div class="absolute top-3 right-3 z-10 bg-slate-950/90 text-gold text-[9px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full border border-gold/40 backdrop-blur"><i class="fas fa-star mr-1"></i>${esc(pinnedLabel)}</div>` : "";
    const widthCls = isSlider
      ? "flex-shrink-0 w-[78vw] sm:w-[44vw] md:w-[300px] lg:w-[280px] snap-start"
      : "h-full";
    return `
      <a href="${blogUrl(locale, post.slug)}" class="group ${widthCls} flex flex-col rounded-2xl border ${cardBorder} bg-white hover:shadow-lg transition overflow-hidden relative">
        ${pinnedBadge}
        ${post.ogImage ? `<div class="aspect-[16/9] overflow-hidden bg-slate-100"><img src="${post.ogImage}" alt="${esc(post.title)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500"></div>` : ""}
        <div class="p-6 flex flex-col flex-grow">
          <div class="${tagBoxCls}">${tb}</div>
          <h2 class="text-lg font-serif text-slate-900 group-hover:text-gold transition leading-snug mb-2">${esc(post.title)}</h2>
          <p class="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-5">${esc(post.description)}</p>
          <div class="mt-auto pt-4 border-t border-slate-100">
            <p class="text-xs font-medium text-slate-600">${authorNames}</p>
            <time class="text-[11px] text-slate-400 mt-0.5 block">${fd}</time>
          </div>
        </div>
      </a>`;
  };

  const pinnedPosts = localePosts.filter((p) => p.pinned);
  const regularPosts = localePosts.filter((p) => !p.pinned);

  const arrowBtns = (sliderId) => `<div class="flex items-center gap-2 ml-auto"><button type="button" data-slider-prev="${sliderId}" aria-label="Previous" class="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:text-gold hover:border-gold transition flex items-center justify-center"><i class="fas fa-chevron-left text-xs"></i></button><button type="button" data-slider-next="${sliderId}" aria-label="Next" class="w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:text-gold hover:border-gold transition flex items-center justify-center"><i class="fas fa-chevron-right text-xs"></i></button></div>`;

  const sectionHeader = (label, accent, rightSlot) => `<div class="flex items-center gap-3 mb-6"><i class="fas fa-star text-gold text-xs ${accent ? "" : "hidden"}"></i><h2 class="text-[11px] uppercase tracking-[0.22em] font-bold ${accent ? "text-slate-900" : "text-slate-500"}">${esc(label)}</h2><div class="hidden md:block flex-1 border-t border-slate-200 mx-2"></div>${rightSlot}</div>`;

  const pinnedSection = pinnedPosts.length ? `<div class="mb-16">${sectionHeader(pinnedLabel, true, pinnedPosts.length > 4 ? arrowBtns("slider-pinned") : "")}<div id="slider-pinned" class="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-6 px-6 items-stretch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">${pinnedPosts.map((p) => cardHtml(p, true, true)).join("\n")}</div></div>` : "";

  const regularSection = regularPosts.length ? `<div>${pinnedPosts.length ? sectionHeader(allArticlesLabel, false, "") : ""}<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">${regularPosts.map((p) => cardHtml(p, false, false)).join("\n")}</div></div>` : "";

  const sliderScript = pinnedPosts.length > 4 ? `<script>(function(){function step(id,dir){var el=document.getElementById(id);if(!el)return;var c=el.firstElementChild;var w=c?c.offsetWidth+24:340;el.scrollBy({left:dir*w,behavior:"smooth"})}document.querySelectorAll("[data-slider-prev],[data-slider-next]").forEach(function(b){b.addEventListener("click",function(){var id=b.dataset.sliderPrev||b.dataset.sliderNext;var dir=b.dataset.sliderPrev?-1:1;step(id,dir)})})})();</script>` : "";

  const postsGrid = `${pinnedSection}${regularSection}${sliderScript}`;
  const emptyState = `<div class="text-center py-20"><i class="fas fa-pen-nib text-5xl text-slate-300 mb-6"></i><p class="text-lg text-slate-500">Articles coming soon.</p></div>`;
  const structuredData = [{ "@context": "https://schema.org", "@type": "Blog", "@id": `${canonicalUrl}#blog`, url: canonicalUrl, name: `${SITE_NAME} ${blogTitle}`, description: `Evidence-based aesthetic medicine insights from ${SITE_NAME}.`, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: g.langAttr }];
  const footer = siteFooter({ locale, template: "editorial", key: "blog-index" }, localeData);

  return `<!DOCTYPE html>
<html lang="${g.langAttr}" class="scroll-smooth">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blogTitle} | ${SITE_NAME}</title>
  <meta name="description" content="${esc(g.blogMetaDesc)}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${blogTitle} | ${SITE_NAME}"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}"><meta property="og:type" content="website"><meta property="og:locale" content="${localeMeta.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" href="/logo.png">
  ${hreflangLinks}
  <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} Blog RSS" href="${SITE_URL}/blog/feed.xml">
  ${gaScript()}
  ${metaPixelScript()}
  ${structuredDataScript(structuredData)}
  ${siteAssets({ extraStyles: LINE_CLAMP_CSS })}
</head>
<body>
${mainNav(g, locale, localeData, switcher, { activeKey: "blog", isHome: false, mobileLanguageLinksHtml: BLOG_LANGUAGE_ORDER.map((code) => { const loc = localeData[code].global; const active = code === locale; return `<a href="${blogIndexUrl(code)}" class="block py-2 ${active ? "font-bold text-gold" : "text-slate-700"}">${loc.languageName}</a>`; }).join("") })}
<header class="bg-slate-950 text-white border-b border-slate-800">
  <div class="max-w-6xl mx-auto px-6 py-16 md:py-24">
    <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-gold text-[10px] uppercase tracking-[0.22em] font-bold bg-white/5"><i class="fas fa-pen-nib"></i> ${SITE_NAME} ${blogTitle}</span>
    <h1 class="text-4xl md:text-6xl font-serif leading-tight mt-7 max-w-4xl">${g.blogIndexTitle}</h1>
    <p class="text-slate-300 text-base md:text-lg leading-relaxed mt-6 max-w-3xl">${g.blogIndexDesc}</p>
  </div>
</header>
<section class="py-14 md:py-20 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    ${localePosts.length ? postsGrid : emptyState}
  </div>
</section>
${footer}
${consentBanner(locale)}
${consentBannerScript()}
</body>
</html>`;
}

module.exports = { renderPage, renderBlogPost, renderBlogIndex };
