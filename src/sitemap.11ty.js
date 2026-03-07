const SITE_URL = "https://tuneclinic-global.com";
const BUILD_DATE = new Date().toISOString().slice(0, 10);

function publicUrl(entry) {
  if (entry.key === "index") {
    return entry.locale === "en" ? `${SITE_URL}/` : `${SITE_URL}/${entry.locale}/`;
  }
  return `${SITE_URL}/${entry.permalink}`;
}

function localeHrefLang(entry) {
  if (entry.locale === "en") return "en";
  if (entry.locale === "ja") return "ja";
  if (entry.locale === "zh") return "zh-Hans";
  if (entry.locale === "th") return "th";
  return entry.locale;
}

module.exports = class {
  data() {
    return {
      permalink: "sitemap.xml",
    };
  }

  render(data) {
    const alternateMap = data.site.pages.reduce((acc, entry) => {
      acc[entry.key] ||= [];
      acc[entry.key].push(entry);
      return acc;
    }, {});

    const urls = data.site.pages
      .map(
        (entry) => {
          const alternates = alternateMap[entry.key]
            .map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${localeHrefLang(alt)}" href="${publicUrl(alt)}" />`,
            )
            .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${publicUrl(alternateMap[entry.key].find((alt) => alt.locale === "en") || entry)}" />`)
            .join("\n");

          return `  <url>
    <loc>${publicUrl(entry)}</loc>
${alternates}
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.key === "index" ? "1.0" : "0.8"}</priority>
  </url>`;
        },
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  }
};
