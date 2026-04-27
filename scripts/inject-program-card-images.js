#!/usr/bin/env node
// Add a top-of-card image thumbnail to each of the four program cards
// in the home "The Chamaka-se Programs" section across all 9 locale
// fragments. Also adds overflow-hidden + lift-on-hover to the outer
// card so the inset image clips with the rounded corners and the
// section feels less like an ecommerce price grid.
//
// Idempotent: skips cards that already have the program-card image.

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync(
  path.join(__dirname, '..', 'src/fragments/*/index.html')
);

// Each card's settings.
const CARDS = [
  {
    id: 'program-collagen',
    image: '/program-card-collagen-builder.webp',
    alt: 'Collagen restoration protocol with PN and HA skin booster vials',
    // Original outer-card class snippet to find.
    classOld: 'border border-slate-100 p-8 rounded-sm hover:shadow-xl transition duration-300 relative bg-white h-full flex flex-col',
    classNew: 'border border-slate-100 rounded-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 relative bg-white h-full flex flex-col overflow-hidden',
  },
  {
    id: 'program-volume',
    image: '/program-card-volume-chamaka-se.webp',
    alt: 'Volume booster and collagen remodeling protocol vials',
    classOld: 'border border-slate-100 p-8 rounded-sm hover:shadow-xl transition duration-300 relative bg-white h-full flex flex-col',
    classNew: 'border border-slate-100 rounded-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 relative bg-white h-full flex flex-col overflow-hidden',
  },
  {
    id: 'program-lifting',
    image: '/program-card-signature-lifting.webp',
    alt: 'Signature lifting protocol with energy device and gold facial lifting lines',
    classOld: 'border-2 border-gold p-8 rounded-sm shadow-2xl relative bg-white transform md:-translate-y-2 h-full flex flex-col',
    classNew: 'border-2 border-gold rounded-sm shadow-2xl relative bg-white transform md:-translate-y-2 hover:md:-translate-y-3 transition duration-300 h-full flex flex-col overflow-hidden',
  },
  {
    id: 'program-elite',
    image: '/program-card-metacell-protocol.webp',
    alt: 'Metacell regenerative protocol with energy device and cellular activation',
    classOld: 'bg-slate-900 p-8 rounded-sm shadow-xl relative text-white h-full flex flex-col',
    classNew: 'bg-slate-900 rounded-sm shadow-xl hover:shadow-2xl hover:-translate-y-1 transition duration-300 relative text-white h-full flex flex-col overflow-hidden',
  },
];

// Image block sits flush at top of card (no padding above), 16:10
// aspect, soft border at bottom to separate from the card content
// padding. The "inner padding" wrapper that follows holds the rest of
// the card with the original p-8 spacing.
function imageBlock({ image, alt }) {
  return `
                    <div class="aspect-[16/10] overflow-hidden bg-slate-100">
                        <img src="${image}" alt="${alt}" loading="lazy" class="w-full h-full object-cover">
                    </div>
                    <div class="p-8 flex flex-col flex-grow">`;
}

let touchedFiles = 0;
let touchedCards = 0;

for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let changed = false;

  for (const c of CARDS) {
    // Find the opening of this card. Anchor by both id and the original
    // class string so we don't accidentally match a previously-injected
    // version.
    const openOld = `<div id="${c.id}" class="${c.classOld}">`;
    if (!src.includes(openOld)) continue;

    // Build replacement: new class + image block + new inner-padding div.
    // The card's original content was directly inside the p-8 outer; we
    // close that with </div> at the end of the card. To do that
    // correctly, we need to find the matching closing </div> for THIS
    // card. We use a simple structural rule: each card ends with the
    // CTA pair followed by `</div>\n\n                <div id="program-`
    // (next card) OR `</div>\n\n            </div>` (last card before
    // grid close). We append `</div>` to close the new inner-padding div
    // we're inserting.
    //
    // Walk forward from openOld to the matching close. We'll find the
    // first occurrence of `\n                </div>` at depth 0 (since
    // the card starts at indent 16). Use brace-counting on `<div` /
    // `</div>` from the opening tag onward.
    const startIdx = src.indexOf(openOld);
    const afterOpen = startIdx + openOld.length;
    let depth = 1;
    let i = afterOpen;
    let closeIdx = -1;
    const len = src.length;
    while (i < len && depth > 0) {
      const nextOpen = src.indexOf('<div', i);
      const nextClose = src.indexOf('</div>', i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        if (depth === 0) {
          closeIdx = nextClose;
          break;
        }
        i = nextClose + 6;
      }
    }
    if (closeIdx === -1) {
      console.error(`✗ couldn't find close for ${c.id} in ${path.relative(process.cwd(), f)}`);
      continue;
    }

    const cardInner = src.slice(afterOpen, closeIdx);
    const cardClose = src.slice(closeIdx, closeIdx + 6); // </div>
    const before = src.slice(0, startIdx);
    const after = src.slice(closeIdx + 6);

    // New outer with new class + image block + original inner content +
    // closing of the new inner-padding div + original closing div.
    const newOpen = `<div id="${c.id}" class="${c.classNew}">`;
    const newCard = before + newOpen + imageBlock(c) + cardInner + '</div>' + cardClose + after;

    src = newCard;
    changed = true;
    touchedCards++;
  }

  if (changed) {
    fs.writeFileSync(f, src);
    console.log(`✓ ${path.relative(process.cwd(), f)}`);
    touchedFiles++;
  }
}

console.log(`\n${touchedFiles} files, ${touchedCards} cards updated.`);
