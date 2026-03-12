const { SITE_URL } = require("./url-helpers");

module.exports = class {
  data() {
    return {
      permalink: "blog/feed.xml",
    };
  }

  render(data) {
    const posts = (data.blog.posts || []).filter((p) => p.locale === "en").slice(0, 20);
    const buildDate = new Date().toUTCString();

    const items = posts
      .map((post) => {
        const url = `${SITE_URL}/blog/${post.slug}.html`;
        const desc = post.description
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        return `    <item>
      <title>${post.title.replaceAll("&", "&amp;")}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${desc}</description>
    </item>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tune Clinic Blog</title>
    <link>${SITE_URL}/blog/</link>
    <description>Evidence-based aesthetic medicine insights from the physicians at Tune Clinic.</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
  }
};
