#!/usr/bin/env node
// Insert the Apgujeong Station photo into the "Why Apgujeong" section
// of every locale homepage. Idempotent: skips files where the photo
// has already been inserted.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync(
  path.join(__dirname, '..', 'src/fragments/*/index.html')
);

const ANCHOR = 'apgujeong-aesthetic-clinic-for-foreign-patients.html';
const ALREADY = 'apgujeong-station.webp';

// Locale-specific alt text; used for SEO + a11y. EN fallback for any
// locale not yet listed.
const ALT_BY_LOCALE = {
  en: 'Apgujeong Station platform sign — the closest Seoul Metro Line 3 stop to Tune Clinic',
  ko: '압구정역 승강장 안내판 — 튠클리닉에서 가장 가까운 서울 지하철 3호선 역',
  ja: '狎鴎亭駅のホーム案内板 — チューンクリニックから最も近い地下鉄3号線の駅',
  zh: '狎鸥亭站站台指示牌 — 距离 Tune Clinic 最近的首尔地铁 3 号线车站',
  th: 'ป้ายชานชาลาสถานีอัพกูจอง — สถานีรถไฟใต้ดินสาย 3 ที่ใกล้ Tune Clinic ที่สุด',
  de: 'Bahnsteigschild der Station Apgujeong — die nächstgelegene Station der Seouler U-Bahn Linie 3 zur Tune Clinic',
  fr: 'Panneau du quai de la station Apgujeong — la station de la ligne 3 du métro de Séoul la plus proche de Tune Clinic',
  ru: 'Платформенный указатель станции Апкуджон — ближайшая к Tune Clinic станция 3-й линии сеульского метро',
  vi: 'Biển báo sân ga Apgujeong — ga gần Tune Clinic nhất trên tuyến tàu điện ngầm số 3 Seoul',
};

function localeFromPath(p) {
  const m = p.match(/\/fragments\/([a-z-]+)\/index\.html$/);
  return m ? m[1] : 'en';
}

function imageBlock(locale) {
  const alt = ALT_BY_LOCALE[locale] || ALT_BY_LOCALE.en;
  // 16-space indent matches the inside of the container div.
  return `            <div class="mt-10 max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-sm">
                <img src="/apgujeong-station.webp" alt="${alt}" class="w-full h-auto block" loading="lazy">
            </div>
`;
}

let touched = 0;
let skipped = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  if (!src.includes(ANCHOR)) {
    console.log(`⊘ no Apgujeong section: ${path.relative(process.cwd(), f)}`);
    skipped++;
    continue;
  }
  if (src.includes(ALREADY)) {
    console.log(`⊘ already inserted:    ${path.relative(process.cwd(), f)}`);
    skipped++;
    continue;
  }
  // Locate the section that contains the anchor href. Section structure
  // (per current fragments):
  //
  //     <section class="bg-slate-50 border-t border-slate-100">
  //         <div class="max-w-7xl mx-auto px-6 py-14">
  //             <div class="grid md:grid-cols-3 gap-8 items-start">
  //                 ...
  //                 <a href="/apgujeong-aesthetic-clinic-for-foreign-patients.html" ...>
  //                 ...
  //                 </a>
  //             </div>            ← inner grid close
  //         </div>                ← container close
  //     </section>
  //
  // We want to insert the image block just before the container close
  // (i.e. between the inner grid close and the container close), so the
  // image renders full-width inside the same content container.

  const anchorIdx = src.indexOf(ANCHOR);
  // Walk forward to find the inner-grid close (12-space indent + </div>),
  // then insert image block before the container close (8-space indent +
  // </div>) which immediately follows. Pattern is stable across locales
  // because the surrounding HTML is template-rendered identically.
  const closePattern = /\n            <\/div>\n        <\/div>\n    <\/section>/;
  const localTail = src.slice(anchorIdx);
  const m = localTail.match(closePattern);
  if (!m) {
    console.log(`✗ couldn't find close pattern: ${path.relative(process.cwd(), f)}`);
    skipped++;
    continue;
  }
  const tailStart = anchorIdx + m.index;
  const inner = '\n            </div>\n';            // inner-grid close stays
  const block = imageBlock(localeFromPath(f));
  const after = '        </div>\n    </section>';   // container close + section close

  const before = src.slice(0, tailStart);
  const out = before + inner + block + after + src.slice(tailStart + m[0].length);
  fs.writeFileSync(f, out);
  console.log(`✓ ${path.relative(process.cwd(), f)}`);
  touched++;
}

console.log(`\n${touched} updated, ${skipped} skipped.`);
