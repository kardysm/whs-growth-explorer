# Desktop UX review — WHS Growth Explorer

Date: 2026-10-05 · Build: local `dist/` preview (http://127.0.0.1:8789/) · Commit: d622619 + this batch

Scope: desktop layout (1920×1080 primary; 1440 / 1280 spot checks; 390 / 320 sanity checks).
Method: text-first DOM geometry probes (canvas text-metrics for chars-per-line and wrap counts,
element rects, computed styles), interaction checks (nav anchors, search dialog open/ESC, language
and theme toggles, persistence), console-error capture, axe-core light/dark.

## Findings fixed

| # | Area | Finding (before) | Fix | After |
|---|------|------------------|-----|-------|
| F1 | Kalkulator — hint card | 306-char hint/legend text as raw text nodes in `.card.small` → bypassed the site's 78ch measure cap; lines up to **214 cpl** on 1411 px | wrap both strings in `<p>` (the 78ch cap now applies at the card's 12.8 px font → 635 px) | **96–98 cpl**, 1 + 3 lines |
| F2 | Footer | single 155-char line at **275 cpl** (1873 px) — footer sits outside `main`, no cap applied | footer text moved into a `<p>`; `footer p` added to the 78ch rule | **2 lines, 96 cpl, 635 px** |
| F3 | Header (desktop) | controls cluster (lang / search / theme) hugged the brand (x 495–828) with ~1050 px of dead space on row 1 | `.lang-toggle.hdr-only { margin-left: auto }` | cluster **right-aligned** (ends at 1881 @1920, 1401 @1440); brand stays left; ≤640 px unaffected (toggles live in the hamburger) |
| F4 | Źródła | citation notes (12.8 px) wrapped at the li measure 794 px ≈ **124 cpl** | `#sources .small { max-width: 78ch }` (635 px at their font) | ≈ **99 cpl** |
| F5 | Źródła | „[zweryfikowane · dostęp: …]” inline span split across lines in **10/48** entries (date broken after the hyphen) | `#sources li > span.small { white-space: nowrap }` | **0/48 split** |

## Checked, accepted as-is

- Weight / nutrients tables span ~1810–1825 px — data tables with right-aligned numerics and
  sortable headers; the width is usable, no cap added.
- `.cards-flow` rows are top-aligned → ragged card bottoms are by design (natural heights, D-037/D-039).
- Bilans card alone in the last row — 7 cards in a 3-column grid (D-039 intent).
- Sticky glass header: axe color-contrast “incomplete” when scrolled is inherent to translucency
  (documented in `a11y-report.md`); the 2 incompletes at rest are the gradient buttons (hand-verified ≥5.7:1).
- Charts (3 × 609 px cards, 575×380 canvases) and the calculator form (400 px column, 366 px fields) — no issues.
- Nav anchors land clear of the sticky header (`scroll-margin-top` + `--hdrh` = 94 px at 1920);
  ESC closes the search dialog; no console errors after load or interactions.

## Verification

- tsc clean; vitest 61/61; build OK (+ `site/` refreshed); axe light/dark **0 violations**.
- Overflow 0 at 320 / 390 / 1280 / 1440 / 1920, in PL and EN.
- Post-fix line-length probe: **0 elements wrapping at >105 cpl** (before: hint card, footer, 9 source citations).
