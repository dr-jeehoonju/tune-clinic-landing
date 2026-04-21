#!/usr/bin/env node
// One-shot patch: inject HMAC token plumbing into all locale-specific
// booking-manage.html fragments. Idempotent: re-running has no effect
// once the marker line is present.

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'const bookingToken = params.get';

const replacements = [
  {
    name: 'declare token',
    from: "const bookingId = params.get('id');\nconst confirmMsg = params.get('msg');",
    to:
      "const bookingId = params.get('id');\n" +
      "const bookingToken = params.get('t') || '';\n" +
      "const confirmMsg = params.get('msg');",
  },
  {
    name: 'loadBooking GET',
    from:
      "const res = await fetch(`${MANAGE_FN}?id=${encodeURIComponent(id)}`);",
    to:
      "const res = await fetch(`${MANAGE_FN}?id=${encodeURIComponent(id)}&t=${encodeURIComponent(bookingToken)}`);",
  },
  {
    name: 'ICS link',
    from:
      "$('#link-ics').href = `${MANAGE_FN}?id=${encodeURIComponent(b.id)}&ics=1`;",
    to:
      "$('#link-ics').href = `${MANAGE_FN}?id=${encodeURIComponent(b.id)}&ics=1&t=${encodeURIComponent(bookingToken)}`;",
  },
  {
    name: 'reschedule POST',
    from:
      "body: JSON.stringify({ action: 'reschedule', id: b.id, appointment_date: rsSelectedDate, appointment_time: rsSelectedTime, treatment_interest: newTreatments.length > 0 ? newTreatments : undefined }),",
    to:
      "body: JSON.stringify({ action: 'reschedule', id: b.id, token: bookingToken, appointment_date: rsSelectedDate, appointment_time: rsSelectedTime, treatment_interest: newTreatments.length > 0 ? newTreatments : undefined }),",
  },
  {
    name: 'cancel POST',
    from:
      "body: JSON.stringify({ action: 'cancel', id: b.id }),",
    to:
      "body: JSON.stringify({ action: 'cancel', id: b.id, token: bookingToken }),",
  },
  {
    name: 'update_program POST',
    from:
      "body: JSON.stringify({ action: 'update_program', id: b.id, treatment_interest: selected }),",
    to:
      "body: JSON.stringify({ action: 'update_program', id: b.id, token: bookingToken, treatment_interest: selected }),",
  },
];

const root = path.join(__dirname, '..', 'src', 'fragments');
const locales = fs.readdirSync(root).filter((d) =>
  fs.statSync(path.join(root, d)).isDirectory()
);

let totalChanged = 0;
for (const locale of locales) {
  const file = path.join(root, locale, 'booking-manage.html');
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');

  if (src.includes(MARKER)) {
    console.log(`[skip] ${locale}: already patched`);
    continue;
  }

  let changed = 0;
  for (const r of replacements) {
    if (!src.includes(r.from)) {
      console.warn(`[warn] ${locale}: cannot find "${r.name}"`);
      continue;
    }
    src = src.replace(r.from, r.to);
    changed += 1;
  }

  fs.writeFileSync(file, src);
  totalChanged += 1;
  console.log(`[ok] ${locale}: patched ${changed}/${replacements.length} sites`);
}

console.log(`\nDone. Files modified: ${totalChanged}/${locales.length}`);
