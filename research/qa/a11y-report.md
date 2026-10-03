# Accessibility report — WHS Feeding & Growth Explorer (2026-10-02)

Method: axe-core (WCAG 2.0/2.1 A + AA rule tags) injected into the running production build
(`dist/`) inside a real browser session (dev-only copy of `node_modules/axe-core/axe.min.js`
placed in `dist/` for the run and removed afterwards — the shipped site itself makes no external
requests). Plus manual checks: keyboard operation, focus visibility, contrast of
axe-incomplete nodes, PL/EN re-render, print-media emulation (CDP `Emulation.setEmulatedMedia`).

## Result (final run)
- **0 violations, 0 incomplete, 31 passes.**

## Issues found and fixed in this pass
1. `aria-allowed-attr` (critical, 6 nodes) — `aria-sort` was on `th[role="button"]`.
   Fixed with the standard pattern: `th scope="col" aria-sort=…` + nested `<button class="th-sort">`.
   Keyboard sorting (Enter/Space) now native to the button; verified by scripted click + `aria-sort` state.
2. `color-contrast` (incomplete → manual review, 10 nodes) — grade-C badges `#ef6c00` on white
   = 3.08:1 (fails AA). Changed to `#b45309` = 5.02:1 (also ≥4.5:1 on the pale banner backgrounds).
   Grade badges A 5.1:1, B 5.7:1, D 7.0:1 — all pass.
3. Added in this pass (not axe violations, plain WCAG/practical gaps):
   - skip link (“Przejdź do treści / Skip to content”) before the header;
   - `<main id="main">` landmark target;
   - `aria-live="polite"` on the calculator results (recalc announcements);
   - global `:focus-visible` outline (was missing entirely);
   - ECharts `aria: { enabled: true }` on all three charts (auto chart descriptions);
   - data-table fallback (`<details>` + table) under each chart — chart 1: energy vs weight;
     chart 2: reference lines incl. 2025 quartiles; chart 3: volumes vs maintenance fluid.

## Print stylesheet (GOAL §5)
`@media print` in `src/ui/styles.css`: hides header/nav/language toggle/skip link/charts/products/
calculator form; black-on-white; expands external link URLs; keeps table, reasons (Dlaczego),
red flags — plus sources/method for context. Verified by print-media emulation: header hidden,
`#table`/`#why`/`#flags` visible.

## How to re-run
```
cp node_modules/axe-core/axe.min.js dist/axe.min.js
# serve dist/, then in the page console: an <script src="/axe.min.js"> inject, then axe.run(document)
rm dist/axe.min.js
```

## Still open (tracked)
- GOAL §5 UX: Ctrl+K global search across sections 5–8; dark mode.
- ECharts auto-aria description text is English-only (chart descriptions); to be localised or
  replaced with custom PL strings in the i18n pass if desired.

## Addendum — after search (Ctrl+K) and dark mode were added
Re-run in three states (light / search dialog open / dark): light 0/0, dark 0/0, dialog open 0 violations
+ 1 incomplete (dialog panel over the rgba backdrop — manual check: card-on-card colour pairs identical
to the rest of the UI, all ≥4.5:1). Fixes applied during this hardening pass:
- content links now use `--accent2` (previously browser-default blue; failed dark 1.71:1 → passes both themes);
- grade badges get lighter dark-mode shades (≥6:1 on the dark card; light-mode colours unchanged);
- primary buttons / active language button in dark mode use dark text (≈7:1);
- search results list simplified to plain list + aria-live (removed listbox/option misuse).


## Re-audit 2026-10-03 (post UX batch: modern look, typography, hamburger, nutrients, milk card)

axe-core (4.x, injected from node_modules) on the rebuilt site: **0 violations** in light, dark and
search-dialog states. Spot checks: text capped at 78ch (754 px at 1280 px viewport); cards 14 px radius;
h2 accent bar; hamburger hidden >=641 px, nav normal at 800 px; no horizontal overflow at 360 px;
persistence/hamburger interactions verified in-browser (aria-expanded, Esc close, link close).
