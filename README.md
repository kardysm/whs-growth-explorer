# WHS Feeding & Growth Explorer — README

**Status: working draft (2026-10-02).** Research assets and a functioning static site exist (sections 1–8, 9–10 content live in PL+EN; §8 = 63-item searchable product list; chart 2 shows the digitized 2025 quartiles; accessibility pass done — axe 0 violations light+dark; Ctrl+K global search and dark mode live). **§7 audit rounds 1–5 are complete — the final confirmation round returned 0 critical + 0 major** (three finding rounds + two confirmation rounds; four independent auditors per finding round, fresh context; see `review/round-1..5-*.md` findings and `review/round-1..5-resolution.md` fix logs). Remaining minors documented in the resolution logs. See `DECISIONS.md` for the running log and `REPORT.md` for findings.

Educational, evidence-based, bilingual (PL default, EN) static website + calculator for caregivers and clinicians of children with Wolf-Hirschhorn syndrome (WHS, 4p16.3 deletion). Spec of record: `GOAL.md`.

## Quick start

```
npm install            # toolchain: vite, vitest, typescript, echarts, fuse.js
npm run dev            # dev server
npm run test           # unit + property tests (vitest)
npm run build          # tsc --noEmit && vite build -> dist/ (static, any host)
```

Data regeneration / QA:

```
.venv/bin/python scripts/convert_data.py          # research/data -> src/data
npx vitest run src/grid/generate.test.ts          # rebuild src/data/grid.json + reference_lines.json
.venv/bin/python scripts/crosscheck.py            # independent Python recheck: full grid, all band fields (<=0.5%; hash-pinned)
```

Source verification (live fetches; nothing is marked verified from memory):

```
.venv/bin/python scripts/fetch_seed_sources.py    # seed sources -> research/raw + sources.json build input
.venv/bin/python scripts/build_sources.py         # -> research/sources.json (47 sources)
```

## Layout

```
GOAL.md, DECISIONS.md, REPORT.md           project spec, decision log, findings
research/                                  evidence base
  sources.json (47 verified)  search-log.md
  raw/                                       raw fetch artifacts (accessible provenance)
  data/who_lms/*.json                       WHO LMS tables (0–60 mo, wfl/wfh)
  data/whs_growth/antonius_digitized.csv    WHS reference lines (digitized 2008 charts)
  data/whs_growth/calhoun2025_digitized.csv WHS extended curves (digitized 2025 charts; 0-18 y)
  data/whs_growth/provenance.md             digitization method, errors, anchor checks
  data/parameters.json                      every coefficient used, with source_ids
  qa/crosscheck-report.md                   independent recomputation report
content/base.json                          PL/EN UI strings
src/calc/                                  pure TypeScript model + tests (47 green)
src/ui/                                    the site (ECharts, vanilla TS)
src/data/                                  importable mirrors (grid, reference lines, sources)
scripts/                                   fetch/verify/convert/crosscheck tooling
dist/                                      built static site
review/                                    §7 audit rounds (findings + resolution logs, rounds 1–5)
```

## Known limitations (current draft)

1. **No WHS-specific energy data exists** (verified null result on Europe PMC). Energy needs are extrapolated (grade D) from NI/CP/hypotonia populations; the healthy-vs-WHS spread is quantified in REPORT.md (boys ~95–97% at 6 mo down to ~19–94% at 36 mo across 2–20 kg; girls wider at the extremes — see REPORT.md table).
2. **Digitized WHS charts**: months 0–3 carry larger uncertainty (±~0.3 kg / ±2 cm); the girls' height chart reads ~+1.6 cm vs the paper text at birth. Full detail in `research/data/whs_growth/provenance.md`.
3. **Reference values**: the central healthy value uses NASEM-2023 for months 0–5, PZH 2024 for month 6, and EFSA (linearly interpolated) for months 7–11; EFSA provides no below-month-7 value (breastfeeding assumption), which is why month 6 comes from PZH.
4. **Section 8 (product list)** live v1 — 63 items: 53 everyday foods (USDA FoodData Central, flagged non-PL) + 10 specialist products (manufacturer pages), searchable/filterable/sortable; allergen + choking-hazard tags and per-item warnings. Remaining stretch: Frebini/PediaSure/NAN Expert/MCT modules. **§7 audit rounds 1–5 done; final round 0 critical + 0 major** (fix logs in `review/`).
5. **Bundle** is large (echarts + 1.8 MB grid JSON; ~470 KB gzip) — acceptable for now; code-splitting is a TODO.
6. **Some primaries are paywalled** (Krick 1992, Culley 1969, ASPEN refeeding consensus full text); their values are cited as tabulated in fetched secondary sources and marked accordingly in `research/sources.json`.
7. **Round-2 audit changes of note:** C is suppressed with a visible alert when the model goes out of range (negative BMR at implausible short lengths) and flagged below the plausible range for ages <6 mo; the refeeding screen is WHS-chart-relative (≈ < −3 SD of the digitized WHS chart; length-matched when a length is entered, else weight-for-age on the same chart; WHO thresholds are not used for the screen — WHS children are constitutionally smaller); the E card always carries the infant-density caveat and notes when 0.67 kcal/ml exceeds maintenance fluid; the D-2 card is labelled a scenario (single number) with its own >167 kcal/kg banner (D-1 gets one too); products carry choking-hazard warnings/tags (10 items); charts/table refresh with calculator changes.
8. **Round-1 audit changes of note**: C/D and the grid default to the WHS mean length for age when no length is entered (entering a measured length changes C); EFSA infant values are interpolated for fractional ages and month 6 uses PZH 2024. Deferred minors (logged in the resolution logs): full chart keyboard navigation beyond the table fallbacks; a dedicated allergen filter (tags are visible/searchable instead); real screen-reader testing; crosscheck residual silent classes (row delete/duplicate, sub-tolerance edits; NaN/±Inf now fail).

## Conventions

- Claim provenance: every number/claim maps to `source_id`s (see `research/sources.json`); grades A–D per GOAL.md §1.
- PL is the primary language; EN mirrors it.
- No backend, no analytics; the site is fully static.
