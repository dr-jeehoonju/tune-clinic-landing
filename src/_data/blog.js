const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");
const anchor = require("markdown-it-anchor");

const md = new MarkdownIt({ html: true, typographer: true }).use(anchor, {
  permalink: anchor.permalink.headerLink(),
  slugify: (s) =>
    s
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-"),
});

const locales = ["en", "ja", "zh", "th", "de", "fr", "ru", "vi", "ko"];
const blogDir = path.join(__dirname, "..", "blog");

const posts = [];

for (const locale of locales) {
  const localeDir = path.join(blogDir, locale);
  if (!fs.existsSync(localeDir)) continue;

  const files = fs
    .readdirSync(localeDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(localeDir, file), "utf8");
    const { data: fm, content } = matter(raw);

    if (!fm.slug || !fm.title || !fm.date) continue;

    const prefix = locale === "en" ? "" : `${locale}/`;
    const permalink = `${prefix}blog/${fm.slug}.html`;

    posts.push({
      locale,
      slug: fm.slug,
      title: fm.title,
      description: fm.description || "",
      date: new Date(fm.date).toISOString().slice(0, 10),
      dateISO: new Date(fm.date).toISOString(),
      author: Array.isArray(fm.author) ? fm.author : [fm.author || "cha-seung-yeon"],
      tags: fm.tags || [],
      ogImage: fm.ogImage || null,
      permalink,
      htmlContent: md.render(content),
      sourceFile: file,
    });
  }
}

posts.sort((a, b) => b.date.localeCompare(a.date));

const slugMap = {};
for (const post of posts) {
  slugMap[post.slug] ||= [];
  slugMap[post.slug].push(post.locale);
}
for (const post of posts) {
  post.availableLocales = slugMap[post.slug];
}

const indexEntries = locales.map((locale) => ({
  locale,
  permalink:
    locale === "en" ? "blog/index.html" : `${locale}/blog/index.html`,
}));

module.exports = { posts, indexEntries, locales };
