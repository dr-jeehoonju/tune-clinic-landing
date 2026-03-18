const { SITE_URL } = require("./url-helpers");

const languageOrder = ["en", "ja", "zh", "th"];
const langNames = { en: "en", ja: "ja", zh: "zh", th: "th" };

function escXml(str) {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

module.exports = class {
  data() {
    return {
      pagination: {
        data: "blog.locales",
        size: 1,
        alias: "feedLocale",
        addAllPagesToCollections: true,
      },
      permalink: (data) => {
        const loc = data.feedLocale || "en";
        const prefix = loc === "en" ? "" : `${loc}/`;
        return `${prefix}blog/feed.xml`;
      },
    };
  }

  render(data) {
    const locale = data.feedLocale || "en";
    const posts = (data.blog.posts || []).filter((p) => p.locale === locale).slice(0, 20);
    const buildDate = new Date().toUTCString();
    const prefix = locale === "en" ? "" : `${locale}/`;

    const items = posts
      .map((post) => {
        const url = `${SITE_URL}/${prefix}blog/${post.slug}.html`;
        return `    <item>
      <title>${escXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escXml(post.description)}</description>
    </item>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tune Clinic Blog</title>
    <link>${SITE_URL}/${prefix}blog/</link>
    <description>Evidence-based aesthetic medicine insights from the physicians at Tune Clinic.</description>
    <language>${locale}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/${prefix}blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
  }
};
