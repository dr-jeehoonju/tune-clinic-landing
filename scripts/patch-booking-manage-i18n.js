#!/usr/bin/env node
// Normalize BOOKING_URLS in every booking-manage.html fragment so it
// only references the 8 locales that are actually built (Korean site
// was removed in Phase 3). Idempotent.

const fs = require('node:fs');
const path = require('node:path');

const TARGET =
  "const BOOKING_URLS = { en: '/booking.html', ja: '/ja/booking.html', zh: '/zh/booking.html', th: '/th/booking.html', de: '/de/booking.html', fr: '/fr/booking.html', ru: '/ru/booking.html', vi: '/vi/booking.html' };";

const root = path.join(__dirname, '..', 'src', 'fragments');
const locales = fs.readdirSync(root).filter((d) =>
  fs.statSync(path.join(root, d)).isDirectory()
);

let patched = 0;
for (const locale of locales) {
  const file = path.join(root, locale, 'booking-manage.html');
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');
  const before = src;
  src = src.replace(/const BOOKING_URLS = \{[^}]*\};/, TARGET);
  if (src === before) {
    console.warn(`[warn] ${locale}: BOOKING_URLS pattern not found`);
    continue;
  }
  if (src === fs.readFileSync(file, 'utf8')) {
    // no-op
  }
  fs.writeFileSync(file, src);
  patched += 1;
  console.log(`[ok] ${locale}: BOOKING_URLS normalized`);
}

console.log(`\nDone. Patched ${patched}/${locales.length}`);
