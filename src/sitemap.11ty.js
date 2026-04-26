const { SITE_URL, publicUrl, hrefLang } = require("./url-helpers");

// P1-3: per-page lastmod map. Update the value for a page's `entry.key`
// when its content changes so Google Search Console keeps trusting our
// `<lastmod>` signals. Pages absent from this map fall back to
// FALLBACK_PAGE_DATE, which should be bumped only when many pages move
// at once. Blog posts use the post's own `date` field instead.
const PAGE_LAST_MODIFIED = {
  // Touched 2026-04-26: marquee a11y, hours block, structured data,
  // booking attribution + new success copy.
  index: "2026-04-26",
  booking: "2026-04-26",
  consult: "2026-04-26",
  "booking-manage": "2026-04-26",
  // Stable program / informational pages — bump when the body copy
  // is meaningfully revised (not just a build).
  "design-method": "2026-03-01",
  "signature-lifting": "2026-03-01",
  "structural-reset": "2026-03-01",
  "collagen-builder": "2026-03-01",
  "filler-chamaka-se": "2026-03-01",
  "skin-boosters-and-regenerative-treatments": "2026-03-01",
  "hair-loss-and-scalp-regeneration-in-korea": "2026-03-01",
  "dermal-fillers-in-korea": "2026-03-01",
  "ultherapy-vs-thermage": "2026-03-01",
  "korean-lifting-guide": "2026-03-01",
  "how-to-choose-the-right-lifting-treatment": "2026-03-01",
  "international-patients-guide": "2026-03-01",
  "apgujeong-aesthetic-clinic-for-foreign-patients": "2026-03-01",
  "aesthetic-treatment-faq-for-foreign-patients": "2026-03-01",
  gallery: "2026-03-01",
  guides: "2026-03-01",
  menu: "2026-03-01",
};

const FALLBACK_PAGE_DATE = "2026-03-01";

function pageLastMod(entry) {
  return PAGE_LAST_MODIFIED[entry.key] || FALLBACK_PAGE_DATE;
}

function blogIndexLastMod(locale, postsByLocale) {
  // Use the most recent post date per locale; fall back to the
  // fallback static date so empty locales don't flap with builds.
  const dates = (postsByLocale[locale] || [])
    .map((p) => p.date)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : FALLBACK_PAGE_DATE;
}

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
    <lastmod>${pageLastMod(entry)}</lastmod>
    <changefreq>${entry.key === "index" ? "weekly" : "monthly"}</changefreq>
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
    const postsByLocale = blogPosts.reduce((acc, post) => {
      acc[post.locale] ||= [];
      acc[post.locale].push(post);
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
    <lastmod>${post.updated || post.date || FALLBACK_PAGE_DATE}</lastmod>
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
    <lastmod>${blogIndexLastMod(locale, postsByLocale)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
