/**
 * Tailwind v3 config — replaces the runtime CDN that previously
 * shipped the full JIT compiler (~3MB) on every page load.
 *
 * Content scanning needs to cover every place a Tailwind class can
 * appear:
 *   - render.js (string templates that emit class="…")
 *   - blog.11ty.js / site.11ty.js / sitemap.11ty.js
 *   - HTML fragments per locale (booking forms, manage page, etc.)
 *   - Markdown blog posts (front matter + body) — those are rendered
 *     via render.js, but we also include them so prose styles emit.
 */
module.exports = {
  content: [
    './src/**/*.{html,js,md,njk}',
    './admin.html',
  ],
  // Some classes are constructed at runtime (e.g. status colors in
  // booking-manage.html, calendar day classes). Keep them alive.
  safelist: [
    'bg-amber-100', 'text-amber-800', 'border-amber-300',
    'bg-blue-100', 'text-blue-800', 'border-blue-300',
    'bg-green-100', 'text-green-800', 'border-green-300',
    'bg-red-100', 'text-red-800', 'border-red-300',
    'bg-emerald-100', 'text-emerald-800',
    'bg-slate-100', 'text-slate-400', 'text-slate-500',
    'fa-spinner', 'fa-spin',
    { pattern: /^(bg|text|border)-(slate|amber|emerald|red|blue|green|purple|gold)-(50|100|200|300|400|500|600|700|800|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        gold: '#c9a55a',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
