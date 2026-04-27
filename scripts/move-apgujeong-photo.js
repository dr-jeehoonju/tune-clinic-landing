#!/usr/bin/env node
// Move the Apgujeong Station photo from a full-width row below the
// Why-Apgujeong grid into a small thumbnail inside the left column,
// directly beneath the "Why Apgujeong" h3 title. Idempotent.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync(
  path.join(__dirname, '..', 'src/fragments/*/index.html')
);

const ALT_BY_LOCALE = {
  en: 'Apgujeong Station — closest Seoul Metro Line 3 stop to Tune Clinic',
  ko: '압구정역 — 튠클리닉에서 가장 가까운 서울 지하철 3호선 역',
  ja: '狎鴎亭駅 — チューンクリニック最寄りの地下鉄3号線駅',
  zh: '狎鸥亭站 — 距离 Tune Clinic 最近的首尔地铁 3 号线车站',
  th: 'สถานีอัพกูจอง — สถานีรถไฟใต้ดินสาย 3 ที่ใกล้ Tune Clinic ที่สุด',
  de: 'Station Apgujeong — die Tune Clinic am nächsten gelegene Station der Seouler U-Bahn-Linie 3',
  fr: 'Station Apgujeong — la station la plus proche de Tune Clinic sur la ligne 3 du métro de Séoul',
  ru: 'Станция Апкуджон — ближайшая к Tune Clinic станция 3-й линии сеульского метро',
  vi: 'Ga Apgujeong — ga gần Tune Clinic nhất trên tuyến tàu điện ngầm số 3 Seoul',
};

function localeFromPath(p) {
  const m = p.match(/\/fragments\/([a-z-]+)\/index\.html$/);
  return m ? m[1] : 'en';
}

// 1) Strip the full-width insert I added in the previous commit.
//    Pattern is the exact block produced by inject-apgujeong-photo.js,
//    surrounded by the inner-grid close + container close I shoved
//    around it.
const FULL_WIDTH_BLOCK_RE = new RegExp(
  '\\n            <div class="mt-10 max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-sm">\\n' +
  '                <img src="/apgujeong-station\\.webp" alt="[^"]+" class="w-full h-auto block" loading="lazy">\\n' +
  '            </div>\\n'
);

// 2) Insert thumbnail under the Why-Apgujeong h3 inside the LEFT
//    column of the grid. Anchor: the h3 line itself, which is stable
//    across locales (only the visible title text varies).
const H3_RE = /(<h3 class="text-2xl md:text-3xl font-serif text-slate-900 mt-2 leading-tight">[^<]+<\/h3>)/;

function thumbBlock(locale) {
  const alt = ALT_BY_LOCALE[locale] || ALT_BY_LOCALE.en;
  return `$1
                    <img src="/apgujeong-station.webp" alt="${alt}" loading="lazy" class="mt-5 w-full max-w-[14rem] aspect-[3/2] object-cover rounded-lg shadow-sm border border-slate-200">`;
}

let touched = 0, skipped = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  const before = src;

  // Remove old position if present.
  src = src.replace(FULL_WIDTH_BLOCK_RE, '\n');

  // Add thumbnail in new position if not already there. Detect previous
  // insert by checking for the new class signature.
  if (!src.includes('aspect-[3/2] object-cover rounded-lg shadow-sm border border-slate-200">')) {
    src = src.replace(H3_RE, thumbBlock(localeFromPath(f)));
  }

  if (src === before) { skipped++; continue; }
  fs.writeFileSync(f, src);
  console.log(`✓ ${path.relative(process.cwd(), f)}`);
  touched++;
}

console.log(`\n${touched} updated, ${skipped} unchanged.`);
