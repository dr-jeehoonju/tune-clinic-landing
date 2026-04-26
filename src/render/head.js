// Shared <head>/asset helpers and small string utilities used by all
// render functions. Extracted from the original monolithic render.js
// so individual page templates can stay focused on body markup.

const { hrefLang, publicUrl } = require("../url-helpers");
const {
  CONSENT_COPY,
  DEFAULT_OG_IMAGE,
  GA_MEASUREMENT_ID,
  META_PIXEL_ID,
  GOOGLE_SEARCH_CONSOLE_VERIFICATION,
  SITE_URL,
  SITE_CSS_HREF,
  FA_CSS_HREF,
  GOOGLE_FONTS_HREF,
  PRETENDARD_CSS_HREF,
  BRAND_INLINE_CSS,
  languageOrder,
} = require("./constants");

function esc(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteAssetUrl(assetPath) {
  if (!assetPath) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//.test(assetPath)) return assetPath;
  return `${SITE_URL}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;
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

function googleVerificationMeta() {
  if (!GOOGLE_SEARCH_CONSOLE_VERIFICATION) return "";
  return `<meta name="google-site-verification" content="${esc(
    GOOGLE_SEARCH_CONSOLE_VERIFICATION,
  )}">`;
}

function gaScript() {
  // Default consent state is "denied" — upgraded by the consent banner
  // when the user accepts. Anonymized IP is set to comply with GDPR.
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{anonymize_ip:true});</script>`;
}

// P0-3: Meta Pixel base snippet. Loader is always defined so the
// booking form's `fbq('track','Lead', …, {eventID})` call never throws,
// but `PageView` and other events only fire after the visitor accepts
// the cookie banner (the consent script flips `__metaPixelConsent`).
// Skipped entirely when `META_PIXEL_ID` is empty (preview/dev).
function metaPixelScript() {
  if (!META_PIXEL_ID) return "";
  return `<script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('consent','revoke');
  fbq('init','${META_PIXEL_ID}');
  window.__metaPixelTrackPageView=function(){try{fbq('consent','grant');fbq('track','PageView');}catch(e){}};
  </script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1"/></noscript>`;
}

function structuredDataScript(structuredData) {
  const graph = structuredData.map((item) => {
    const { ["@context"]: _ctx, ...rest } = item;
    return rest;
  });
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  })}</script>`;
}

// Single source of truth for the asset stack injected into every
// rendered HTML page. Replaces the three previously-duplicated CDN
// blocks for tailwindcss, font awesome, and google fonts.
function siteAssets({ extraStyles = "" } = {}) {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="${SITE_CSS_HREF}">
  <link rel="stylesheet" href="${FA_CSS_HREF}">
  <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}">
  <link rel="stylesheet" href="${PRETENDARD_CSS_HREF}">
  <style>${BRAND_INLINE_CSS}${extraStyles ? extraStyles : ""}</style>`;
}

// Cookie consent JS injected at end-of-body. Reads/writes a single
// localStorage entry and calls gtag('consent','update', ...).
function consentBannerScript() {
  // P0-3: also grants/revokes Meta Pixel consent and triggers the
  // gated PageView when the visitor accepts. fbq is created by
  // metaPixelScript() above with consent revoked by default.
  return `<script>(function(){var k='tune-cookie-consent',b=document.getElementById('cookie-consent-banner'),a=document.getElementById('cookie-accept-btn'),r=document.getElementById('cookie-reject-btn');if(!b||!a||!r||typeof window.gtag!=='function')return;function pixel(g){if(typeof window.fbq!=='function')return;try{window.fbq('consent',g?'grant':'revoke');if(g&&typeof window.__metaPixelTrackPageView==='function'){window.__metaPixelTrackPageView();}}catch(e){}}function u(g){window.gtag('consent','update',{analytics_storage:g?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});pixel(g);}function s(v){try{localStorage.setItem(k,v)}catch(e){}}function rd(){try{return localStorage.getItem(k)}catch(e){return null}}var c=rd();if(c==='accepted')u(true);else if(c==='rejected')u(false);else b.classList.remove('hidden');a.addEventListener('click',function(){u(true);s('accepted');b.classList.add('hidden')});r.addEventListener('click',function(){u(false);s('rejected');b.classList.add('hidden')})})();</script>`;
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

module.exports = {
  esc,
  absoluteAssetUrl,
  stripHtml,
  googleVerificationMeta,
  gaScript,
  metaPixelScript,
  structuredDataScript,
  siteAssets,
  consentBannerScript,
  consentBanner,
  alternateLinks,
};
