const SITE_URL = "https://tuneclinic.com";

function publicUrl(entry) {
  if (entry.key === "index") {
    return entry.locale === "en" ? `${SITE_URL}/` : `${SITE_URL}/${entry.locale}/`;
  }
  return `${SITE_URL}/${entry.permalink}`;
}

module.exports = class {
  data() {
    return {
      permalink: "sitemap.xml",
    };
  }

  render(data) {
    const urls = data.site.pages
      .map(
        (entry) => `  <url>
    <loc>${publicUrl(entry)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${entry.key === "index" ? "1.0" : "0.8"}</priority>
  </url>`,
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  }
};
