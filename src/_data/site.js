const fs = require("fs");
const path = require("path");

const locales = ["en", "ja", "zh", "th", "ko", "de", "fr", "ru", "vi"];
const preferredPageOrder = [
  "index",
  "design-method",
  "signature-lifting",
  "structural-reset",
  "collagen-builder",
  "filler-chamaka-se",
  "gallery",
  "menu",
];

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortPageKeys(a, b) {
  const aIndex = preferredPageOrder.indexOf(a);
  const bIndex = preferredPageOrder.indexOf(b);
  const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
  if (safeA !== safeB) return safeA - safeB;
  return a.localeCompare(b);
}

const localeData = {};
const pages = [];

for (const locale of locales) {
  const global = readJSON(
    path.join(__dirname, "..", "locales", locale, "global.json"),
  );
  localeData[locale] = { global, pages: {} };

  const pagesDir = path.join(__dirname, "..", "locales", locale, "pages");
  const pageFiles = fs
    .readdirSync(pagesDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const fileName of pageFiles) {
    const pageKey = path.basename(fileName, ".json");
    const page = readJSON(
      path.join(pagesDir, fileName),
    );
    localeData[locale].pages[pageKey] = page;
    pages.push({ locale, pageKey, ...page });
  }
}

const pageKeys = [...new Set(pages.map((entry) => entry.key))].sort(sortPageKeys);
const alternatesByKey = pageKeys.reduce((acc, key) => {
  acc[key] = pages
    .filter((entry) => entry.key === key)
    .sort((a, b) => locales.indexOf(a.locale) - locales.indexOf(b.locale));
  return acc;
}, {});

pages.sort((a, b) => {
  const pageOrder = sortPageKeys(a.key, b.key);
  if (pageOrder !== 0) return pageOrder;
  return locales.indexOf(a.locale) - locales.indexOf(b.locale);
});

for (const entry of pages) {
  entry.availableLocales = alternatesByKey[entry.key].map((item) => item.locale);
}

module.exports = {
  locales,
  pageKeys,
  localeData,
  pages,
  alternatesByKey,
};
