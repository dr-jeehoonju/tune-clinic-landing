const { SITE_URL, publicUrl, hrefLang } = require("./url-helpers");
const BUILD_DATE = new Date().toISOString().slice(0, 10);

function blogPublicUrl(locale, slug) {
  const prefix = locale === "en" ? "" : `${locale}/`;
  return `${SITE_URL}/${prefix}blog/${slug}.html`;
}

function blogIndexPublicUrl(locale) {
  const prefix = locale === "en" ? "" : `${locale}/`;
  return `${SITE_URL}/${prefix}blog/`;
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

    const pageUrls = data.site.pages
      .map((entry) => {
        const alternates = alternateMap[entry.key]
          .map((alt) => `    <xhtml:link rel="alternate" hreflang="${hrefLang(alt.locale)}" href="${publicUrl(alt.locale, alt.key)}" />`)
          .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${publicUrl("en", entry.key)}" />`)
          .join("\n");

        return `  <url>
    <loc>${publicUrl(entry.locale, entry.key)}</loc>
${alternates}
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.key === "index" ? "1.0" : "0.8"}</priority>
  </url>`;
      })
      .join("\n");

    const blogPosts = data.blog?.posts || [];
    const blogSlugMap = blogPosts.reduce((acc, post) => {
      acc[post.slug] ||= [];
      acc[post.slug].push(post);
      return acc;
    }, {});

    const blogUrls = blogPosts
      .map((post) => {
        const alternates = (blogSlugMap[post.slug] || [])
          .map((alt) => `    <xhtml:link rel="alternate" hreflang="${hrefLang(alt.locale)}" href="${blogPublicUrl(alt.locale, alt.slug)}" />`)
          .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${blogPublicUrl("en", post.slug)}" />`)
          .join("\n");

        return `  <url>
    <loc>${blogPublicUrl(post.locale, post.slug)}</loc>
${alternates}
    <lastmod>${post.date || BUILD_DATE}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("\n");

    const locales = data.blog?.locales || ["en", "ja", "zh", "th"];
    const blogIndexUrls = locales
      .map((locale) => {
        const alternates = locales
          .map((l) => `    <xhtml:link rel="alternate" hreflang="${hrefLang(l)}" href="${blogIndexPublicUrl(l)}" />`)
          .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${blogIndexPublicUrl("en")}" />`)
          .join("\n");

        return `  <url>
    <loc>${blogIndexPublicUrl(locale)}</loc>
${alternates}
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pageUrls}
${blogIndexUrls}
${blogUrls}
</urlset>
`;
  }
};
