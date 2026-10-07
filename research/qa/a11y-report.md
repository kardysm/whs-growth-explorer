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

## Re-audit 2026-10-05 (liquid-glass restyle, palette, instant tooltips, mobile toggles)

axe-core (4.x, injected into the built site) on the restyled build:

- **light: 0 violations, 32 passes, 2 incomplete** — `#btn-recalc` / `#csv-btn` sit on the violet
  gradient button; axe cannot resolve gradient fills. Manual check (WCAG formula): white on
  `#613dc1→#4e148c` ≥ 7.1:1; dark theme: `#2c0735` on `#858ae3→#a49df2` ≥ 5.7:1 — both pass AA.
- **dark: 0 violations, 2 incomplete** (the same two buttons).
- **dialog open: 0 violations, 33 passes, 3 incomplete** (same + one gradient-adjacent node).

Notes:

- The palette wash is a fixed `body::before` back layer while `html` keeps a solid `--bg`; without
  this the gradient made axe's colour-contrast check "incomplete" on ~2,200 text nodes. With the
  back layer, backgrounds stay resolvable and only gradient-filled buttons remain incomplete.
- Tooltips moved from `title` to `data-tip` (instant CSS tooltips, D-031); grade badges and sort
  buttons carry `.sr-only` copies of the tooltip text so nothing is screen-reader-only-lost.
- Verified states: tooltip glass on hover (rgba .88 + blur 14), banner glass, mobile hamburger
  sheet with theme/PL-EN toggles, dark wash, print emulation (header/charts hidden, white surfaces,
  no blur, wash off).
- Text-pair contrast table for both themes: `DESIGN-SYSTEM.md` §1 (min text pair ≥4.5:1; links
  ≥10:1; buttons ≥5.7:1).

## Addendum 2026-10-05 (tooltip stacking fix + collapsible activity hint — user reports)

Re-run on the rebuilt site after the two fixes: **light 0 violations, dark 0 violations**
(same 2 gradient-button incompletes as above).

- **Tooltip stacking fixed** (visual-only bug, no a11y impact): when the cursor sits directly on a
  grade badge inside a card heading, the heading's tooltip now stays hidden while the badge's own
  tooltip shows — CSS-only via `[data-tip]:has([data-tip]:hover/focus-visible)` (D-034). Verified:
  exactly 1 visible tooltip in both hover positions; `::before` arrows follow the same rule.
- **Collapsible activity hint**: the long „Jak wybrać poziom aktywności / How to choose the activity
  level” explanation is now a native `<details>/<summary>` (collapsed by default) — keyboard- and
  screen-reader-accessible by construction; `checkVisibility()` false while closed, both languages verified.
- **Scrolled-state note (glass header, inherent)**: with the page scrolled, axe reports the sticky
  translucent header's text as "incomplete" (its background is a blur over arbitrary scrolling
  content — axe cannot resolve it). Making the header opaque restores axe's clean read, so this is a
  property of the glass look, not a defect. Worst-case manual math for header text at
  `--glass-strong` α (0.88 light / 0.84 dark) over the darkest / lightest content that can pass
  beneath: fg ≥13.7:1 (light) / ≥10.4:1 (dark); nav links ≥9.0 / ≥8.2; muted ≥5.5 / ≥5.7 — all AA.
  All runs stay at **0 violations**; incomplete counts: at rest 2 (gradient buttons), scrolled ≤11
  (header text), none affecting resolved pairs.

### Addendum 2026-10-05 (allergen chips, D-038)

Product cards gained an „Alergeny:” icon row; the chips use a solid `--warn-bg` fill so axe can
resolve their contrast (translucent chips were "incomplete" on 10 nodes). Re-run after the change:
light/dark **0 violations**; at rest 2 incompletes (gradient buttons), scrolled ≤9 (sticky
translucent headers/tables — the known glass class from the D-035 note). Chips carry visible text
(icon `aria-hidden`) and a tooltip with the source; no duplicate allergen text tags remain.


### Addendum 2026-10-07 (UX batch cards 1–7, D-043–D-050)

Full re-run on the rebuilt site after the batch (calc split, equal card heights, seasonings, lists, hover,
badge colors, multi-badge search): **light 0 violations, dark 0 violations, dialog (Ctrl+K, dark) 0
violations**, plus a scan with two search chips committed and the badge suggestion list open: 0 violations.
At-rest incompletes: 2 — the gradient-filled `#btn-recalc` / `#csv-btn` (known class; WCAG math: white on
`#613dc1` = 7.13:1, on `#4e148c` = 11.65:1). New tag-badge colors were validated by composited contrast
math in both themes (light ≥ 5.5:1, dark ≥ 6.0:1, see D-048); the search combobox uses aria-expanded /
aria-activedescendant + a labelled listbox; the field keeps a visible focus ring on its wrapper.

### Addendum 2026-10-07 (review round 6, D-052–D-060)

Full re-run on the rebuilt site after the review fixes (H1 weight-age C selection, H2 refeeding screen, H3
Culley removal, M1 FAO mid-year anchors, M2/M4/M5 text fixes, M6 foods, M7 texture rule, M3 Calhoun labels,
product labels): **light 0 violations, dark 0 violations**; at-rest incompletes: 2 — the known
gradient-filled `#btn-recalc` / `#csv-btn` class (WCAG math unchanged: white on `#613dc1` = 7.13:1, on
`#4e148c` = 11.65:1). The chart-2 legend rename to „p25/p50/p75 (model)" and the removed kcal/cm bullet do
not affect contrast; the a11y chart-2 description now carries the „model curves (not empirical centiles)"
wording.
