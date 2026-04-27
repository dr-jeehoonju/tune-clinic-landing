#!/usr/bin/env node
// Replace the country-code <select> options in booking.html across all
// 9 locale fragments with a numerically-sorted, extended list.
// Korea (+82) stays pinned as the default first option; everything else
// is in ascending dial-code order.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync(
  path.join(__dirname, '..', 'src/fragments/*/booking.html')
);

// [code-without-+, label, flag-emoji]
// First entry is the default; the rest are sorted by numeric code.
const DEFAULT = ['82', '🇰🇷', 'KR'];
const REST = [
  ['1', '🇺🇸', 'US'],     // also covers Canada
  ['7', '🇷🇺', 'RU'],     // also Kazakhstan
  ['31', '🇳🇱', 'NL'],
  ['33', '🇫🇷', 'FR'],
  ['34', '🇪🇸', 'ES'],
  ['39', '🇮🇹', 'IT'],
  ['44', '🇬🇧', 'GB'],
  ['49', '🇩🇪', 'DE'],
  ['52', '🇲🇽', 'MX'],
  ['55', '🇧🇷', 'BR'],
  ['60', '🇲🇾', 'MY'],
  ['61', '🇦🇺', 'AU'],
  ['62', '🇮🇩', 'ID'],
  ['63', '🇵🇭', 'PH'],
  ['65', '🇸🇬', 'SG'],
  ['66', '🇹🇭', 'TH'],
  ['81', '🇯🇵', 'JP'],
  ['84', '🇻🇳', 'VN'],
  ['86', '🇨🇳', 'CN'],
  ['91', '🇮🇳', 'IN'],
  ['852', '🇭🇰', 'HK'],
  ['853', '🇲🇴', 'MO'],
  ['886', '🇹🇼', 'TW'],
  ['966', '🇸🇦', 'SA'],
  ['971', '🇦🇪', 'AE'],
  ['972', '🇮🇱', 'IL'],
  ['974', '🇶🇦', 'QA'],
];
// Numeric ascending sort on the dial code.
REST.sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));

function optionLine(code, flag) {
  return `              <option value="+${code}">${flag} +${code}</option>`;
}

const newOptions = [
  optionLine(DEFAULT[0], DEFAULT[1]),
  ...REST.map(([c, f]) => optionLine(c, f)),
].join('\n');

// Match the existing options block. Anchor: from the first
// <option value="+82"> line (the default we'll preserve in position)
// down to the line just before </select>.
const RE = /(\n)([ \t]*<option value="\+82"[^]*?)(\n[ \t]*<\/select>)/;

let touched = 0;
let skipped = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  if (!src.includes('id="bkf-cc"')) {
    skipped++;
    continue;
  }
  if (!RE.test(src)) {
    console.log(`✗ option block not found: ${path.relative(process.cwd(), f)}`);
    skipped++;
    continue;
  }
  const out = src.replace(RE, (_m, lead, _block, tail) => `${lead}${newOptions}${tail}`);
  if (out === src) { skipped++; continue; }
  fs.writeFileSync(f, out);
  console.log(`✓ ${path.relative(process.cwd(), f)}`);
  touched++;
}

console.log(`\n${touched} updated, ${skipped} skipped.`);
console.log(`Final list: 1 default (+82) + ${REST.length} sorted = ${REST.length + 1} options.`);
