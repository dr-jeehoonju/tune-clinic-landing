const { publicUrl, hrefLang } = require("./url-helpers");
const BUILD_DATE = new Date().toISOString().slice(0, 10);

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
          const url = publicUrl(entry.locale, entry.key);
          const alternates = alternateMap[entry.key]
            .map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${hrefLang(alt.locale)}" href="${publicUrl(alt.locale, alt.key)}" />`,
            )
            .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${publicUrl("en", entry.key)}" />`)
            .join("\n");

          return `  <url>
    <loc>${url}</loc>
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
