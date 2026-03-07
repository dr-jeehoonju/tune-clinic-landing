const fs = require("fs");
const path = require("path");

const locales = ["en", "ja", "zh", "th"];
const pageKeys = [
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

const localeData = {};
const pages = [];

for (const locale of locales) {
  const global = readJSON(
    path.join(__dirname, "..", "locales", locale, "global.json"),
  );
  localeData[locale] = { global, pages: {} };

  for (const pageKey of pageKeys) {
    const page = readJSON(
      path.join(__dirname, "..", "locales", locale, "pages", `${pageKey}.json`),
    );
    localeData[locale].pages[pageKey] = page;
    pages.push({ locale, pageKey, ...page });
  }
}

module.exports = {
  locales,
  pageKeys,
  localeData,
  pages,
};
