const SITE_URL = "https://tuneclinic-global.com";

function hrefLang(locale) {
  if (locale === "zh") return "zh-Hans";
  return locale;
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

module.exports = { SITE_URL, hrefLang, pageUrl, publicUrl };
