#!/usr/bin/env node
// Replace the brittle wrapper-div + Font Awesome icon for the country
// code select with a clean SVG-background arrow on the select itself.
// Idempotent: skips files where the wrapper has already been removed.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync(path.join(__dirname, '..', 'src/fragments/*/booking.html'));

const SVG_DATA = "data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2210%22%20height=%2210%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20fill=%22none%22%20stroke=%22%23999%22%20stroke-width=%222%22%20d=%22M4%206l4%204%204-4%22/%3E%3C/svg%3E";

const NEW_SELECT_STYLE = `width:100px;padding-right:24px;background-image:url('${SVG_DATA}');background-repeat:no-repeat;background-position:right 8px center;background-size:10px;`;

const wrapperOpen = '<div class="relative shrink-0"><select id="bkf-cc"';
const wrapperOpenReplacement = '<select id="bkf-cc"';

const oldStyle = 'style="width:100px;padding-right:24px;"';
const newStyle = `style="${NEW_SELECT_STYLE}"`;

const iconAndClose = `<i class="fas fa-chevron-down text-[10px] text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i></div>`;

let touched = 0;
let skipped = 0;

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes(wrapperOpen)) {
    skipped++;
    continue;
  }
  content = content.replace(wrapperOpen, wrapperOpenReplacement);
  content = content.replace(oldStyle, newStyle);
  content = content.replace(iconAndClose, '');
  fs.writeFileSync(f, content);
  console.log(`✓ ${path.relative(process.cwd(), f)}`);
  touched++;
}

console.log(`\n${touched} updated, ${skipped} skipped.`);
