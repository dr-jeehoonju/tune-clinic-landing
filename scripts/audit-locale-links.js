#!/usr/bin/env node
// scripts/audit-locale-links.js
//
// P1-F: locale-prefix sweep for non-EN fragments.
//
// Background
// ----------
// Each non-EN locale lives at `dist/<loc>/...` and the EN locale lives at
// `dist/...`. Internal links written as `/page.html` (root-relative, no
// locale prefix) always resolve to the EN page, regardless of the
// fragment they were authored in. That sends, e.g., a Korean reader on
// `/ko/structural-reset.html` to `/menu.html` (EN), even though
// `/ko/menu.html` exists. This script finds every such bug and rewrites
// the href to `/<loc>/page.html` if a localized fragment exists for that
// locale; otherwise it leaves the href alone (intentional fall-through
// to EN, which is how many EN-only blog posts surface in non-EN UIs).
//
// Behavior summary
// ----------------
//   - Walk `src/fragments/<loc>/**/*.html` for every non-EN locale.
//   - For each `href="/path.html"` (or `href="/path.html#anchor"`),
//     skip if it already starts with `/<loc>/`. Otherwise look up
//     `src/fragments/<loc>/<basename>.html`. If that file exists,
//     rewrite the href to `/<loc>/<basename>.html<#anchor?>`.
//   - Anchor-only links (`href="#foo"`) and external links
//     (`https?://`, `mailto:`, `tel:`, `wa.me`, etc.) are never touched.
//   - Non-HTML root links (`/sitemap.xml`, `/robots.txt`, `/og-*.png`,
//     `/logo.png`, fonts, etc.) are never touched.
//
// Modes
// -----
//   --apply     write fixes to disk (default is dry-run/audit only).
//   --report    print a per-locale summary + remaining fall-through
//               table (always on; this flag is for emphasis).
//
// Idempotent: running with --apply twice is a no-op the second time.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FRAGMENTS_ROOT = path.join(ROOT, "src", "fragments");
const NON_EN_LOCALES = ["ko", "ja", "zh", "th", "de", "fr", "ru", "vi"];

const APPLY = process.argv.includes("--apply");

// ── Filesystem helpers ─────────────────────────────────────────────────
function walkHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      out.push(...walkHtml(fp));
    } else if (st.isFile() && name.endsWith(".html")) {
      out.push(fp);
    }
  }
  return out;
}

function fragmentExistsForLocale(locale, basename) {
  return fs.existsSync(path.join(FRAGMENTS_ROOT, locale, `${basename}.html`));
}

// Match `href="/<something>.html(#anchor)?"` where `<something>` is at
// least one path segment. We deliberately exclude `href="//..."` (proto-
// relative external) and any href that's already `/<loc>/...`.
const HREF_RE = /href="(\/[^"\s][^"]*?)"/g;

function isHtmlPath(p) {
  // Strip query/anchor for the check.
  const pathOnly = p.split(/[?#]/)[0];
  return pathOnly.endsWith(".html");
}

function looksExternal(p) {
  if (p.startsWith("//")) return true;
  if (/^[a-z]+:/i.test(p)) return true;
  return false;
}

function startsWithLocalePrefix(p) {
  // Match `/xx/` where xx is a 2-char locale code we know about.
  for (const loc of NON_EN_LOCALES) {
    if (p.startsWith(`/${loc}/`)) return true;
  }
  if (p.startsWith("/en/")) return true;
  return false;
}

// ── Audit + (optionally) fix one file ──────────────────────────────────
function processFile(locale, fp) {
  const original = fs.readFileSync(fp, "utf8");
  const findings = [];
  const fallThrough = [];

  const next = original.replace(HREF_RE, (full, href) => {
    if (looksExternal(href)) return full;
    if (!isHtmlPath(href)) return full;
    if (startsWithLocalePrefix(href)) return full;
    // At this point href looks like `/foo.html` or `/foo.html#bar`.
    const [pathPart, anchorPart] = href.split("#");
    const basename = pathPart.replace(/^\//, "").replace(/\.html$/, "");
    // Defensive: skip if basename contains a slash (nested EN path that
    // we haven't translated as a per-locale fragment).
    if (basename.includes("/")) {
      fallThrough.push({ href, reason: "nested path" });
      return full;
    }
    if (fragmentExistsForLocale(locale, basename)) {
      const newHref = anchorPart
        ? `/${locale}/${basename}.html#${anchorPart}`
        : `/${locale}/${basename}.html`;
      findings.push({ from: href, to: newHref });
      return `href="${newHref}"`;
    }
    fallThrough.push({ href, reason: "no localized fragment" });
    return full;
  });

  if (APPLY && next !== original) {
    fs.writeFileSync(fp, next);
  }

  return { findings, fallThrough };
}

// ── Main loop ──────────────────────────────────────────────────────────
const summary = {};
let totalFixed = 0;
let totalFallThrough = 0;

for (const locale of NON_EN_LOCALES) {
  const dir = path.join(FRAGMENTS_ROOT, locale);
  if (!fs.existsSync(dir)) continue;
  const files = walkHtml(dir);
  const localeRows = [];
  let localeFixed = 0;
  let localeFallThrough = 0;
  const fallThroughBuckets = {};

  for (const fp of files) {
    const rel = path.relative(ROOT, fp);
    const { findings, fallThrough } = processFile(locale, fp);
    if (findings.length) {
      localeRows.push({ file: rel, findings });
      localeFixed += findings.length;
    }
    for (const ft of fallThrough) {
      fallThroughBuckets[ft.href] = (fallThroughBuckets[ft.href] || 0) + 1;
      localeFallThrough += 1;
    }
  }

  summary[locale] = {
    fixed: localeFixed,
    fallThrough: localeFallThrough,
    rows: localeRows,
    fallThroughBuckets,
  };
  totalFixed += localeFixed;
  totalFallThrough += localeFallThrough;
}

// ── Reporting ──────────────────────────────────────────────────────────
console.log(`Mode: ${APPLY ? "APPLY (writing changes)" : "DRY RUN (no writes)"}`);
console.log("");
console.log("Per-locale tally:");
console.log("  locale  fixed  fall-through");
console.log("  ------  -----  ------------");
for (const locale of NON_EN_LOCALES) {
  const s = summary[locale] || { fixed: 0, fallThrough: 0 };
  console.log(
    `  ${locale}      ${String(s.fixed).padStart(3)}    ${String(s.fallThrough).padStart(3)}`,
  );
}
console.log(`  TOTAL    ${String(totalFixed).padStart(3)}    ${String(totalFallThrough).padStart(3)}`);
console.log("");

if (APPLY && totalFixed > 0) {
  console.log("Sample of rewrites:");
  for (const locale of NON_EN_LOCALES) {
    const s = summary[locale];
    if (!s || !s.rows.length) continue;
    console.log(`  [${locale}]`);
    for (const row of s.rows.slice(0, 3)) {
      for (const f of row.findings.slice(0, 3)) {
        console.log(`    ${row.file}: ${f.from} -> ${f.to}`);
      }
    }
  }
  console.log("");
}

console.log("Remaining intentional fall-through (per-locale, top hrefs):");
for (const locale of NON_EN_LOCALES) {
  const s = summary[locale];
  if (!s) continue;
  const buckets = Object.entries(s.fallThroughBuckets)
    .sort((a, b) => b[1] - a[1]);
  if (!buckets.length) {
    console.log(`  [${locale}] (none)`);
    continue;
  }
  console.log(`  [${locale}]`);
  for (const [href, count] of buckets.slice(0, 8)) {
    console.log(`    ${count.toString().padStart(3)}× ${href}`);
  }
}
