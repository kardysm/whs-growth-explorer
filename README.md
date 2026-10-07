# WHS Feeding & Growth Explorer — README

**Status: working draft (2026-10-07).** Research assets and a functioning static site exist (sections 1–8, 9–10 content live in PL+EN; §8 = 84-item searchable product list — 53 foods + 13 seasonings/herbs + 18 specialist items — with multi-badge search; chart 2 shows the digitized 2025 quartiles; accessibility pass done — axe 0 violations light+dark; Ctrl+K global search and dark mode live). **§7 audit rounds 1–5 are complete — the final confirmation round returned 0 critical + 0 major** (three finding rounds + two confirmation rounds; four independent auditors per finding round, fresh context; see `review/round-1..5-*.md` findings and `review/round-1..5-resolution.md` fix logs). The 2026-10-07 user review (round 6: 3 serious + 7 moderate + low-priority) was fully addressed — `review/round-6-review.md`; DECISIONS D-052–D-061. Remaining minors documented in the resolution logs. See `DECISIONS.md` for the running log and `REPORT.md` for findings.

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
GEN_GRID=1 npx vitest run src/grid/generate.test.ts   # rebuild src/data/grid.json + reference_lines.json (read-only check by default)
.venv/bin/python scripts/crosscheck.py            # independent Python recheck: full grid, all band fields (<=0.5%; hash-pinned)
```

Source verification (live fetches; nothing is marked verified from memory):

```
.venv/bin/python scripts/fetch_seed_sources.py    # seed sources -> research/raw + sources.json build input
.venv/bin/python scripts/build_sources.py         # -> research/sources.json (51 sources)
```

## Deploying (GitHub Pages)

The site is a single static page with **relative** asset paths (`base: "./"`), so it works unchanged from a project subpath (`https://<user>.github.io/<repo>/`). A ready workflow lives at `.github/workflows/deploy.yml`:

1. Create a GitHub repository and push this project (branch `main`).
2. In the repo: Settings -> Pages -> Build and deployment -> Source: **GitHub Actions** (the clean path; the workflow then publishes `dist/`).
3. Push to `main` (or run the workflow manually) — it installs, runs tests, builds `dist/` and publishes it. The footer build stamp then shows the deployed commit.

`public/.nojekyll` is copied into the build so GitHub Pages serves everything verbatim (no Jekyll processing). `dist/` stays out of git — CI rebuilds it on every deploy.

**Branch-mode fallback (no settings change needed).** If the repository is left on the default Pages source ("Deploy from a branch", folder `/`), GitHub serves the repository root — where `index.html` references the raw TypeScript entry, which browsers refuse to execute (non-JS MIME type) and the page would stay blank. To make that mode work too, `index.html` carries a small fallback loader: when the app has not mounted, it loads the prebuilt bundle committed under `site/` (`site/app.js`, `site/app.css`). `npm run build` refreshes these two files automatically (`scripts/sync_site.mjs`); **commit them together with source changes**. In dev and in Actions-mode deployments the fallback stays dormant. Either Pages mode therefore serves a working site.

## Layout

```
GOAL.md, DECISIONS.md, REPORT.md           project spec, decision log, findings
DESIGN-SYSTEM.md                           liquid-glass design system (tokens, palette, components)
research/                                  evidence base
  sources.json (51 verified)  search-log.md
  raw/                                       raw fetch artifacts (accessible provenance)
  data/who_lms/*.json                       WHO LMS tables (0–60 mo, wfl/wfh)
  data/whs_growth/antonius_digitized.csv    WHS reference lines (digitized 2008 charts)
  data/whs_growth/calhoun2025_digitized.csv WHS extended curves (digitized 2025 charts; 0-18 y)
  data/whs_growth/provenance.md             digitization method, errors, anchor checks
  data/parameters.json                      every coefficient used, with source_ids
  qa/crosscheck-report.md                   independent recomputation report
content/base.json                          PL/EN UI strings
src/calc/                                  pure TypeScript model + tests (81 green)
src/ui/                                    the site (ECharts, vanilla TS)
src/data/                                  importable mirrors (grid, reference lines, sources)
scripts/                                   fetch/verify/convert/crosscheck tooling
dist/                                      built static site
review/                                    §7 audit rounds (findings + resolution logs, rounds 1–5) + the 2026-10-07 user review (round-6 log)
```

## Known limitations (current draft)

1. **No WHS-specific energy data exists** (verified null result on Europe PMC). Energy needs are extrapolated (grade D) from NI/CP/hypotonia populations; the healthy-vs-WHS spread is quantified in REPORT.md (widest at the lightest weights: up to ~548% at 6 mo / ~843% at 18 mo across 2–20 kg; 19–1127% at 36 mo).
2. **Digitized WHS charts**: months 0–3 carry larger uncertainty (±~0.3 kg / ±2 cm); the girls' height chart reads ~+1.6 cm vs the paper text at birth. Full detail in `research/data/whs_growth/provenance.md`.
3. **Reference values**: the central healthy value uses NASEM-2023 for months 0–5, PZH 2024 for month 6, and EFSA (linearly interpolated) for months 7–11; EFSA provides no below-month-7 value (breastfeeding assumption), which is why month 6 comes from PZH. Category-boundary steps of the published tables (NASEM growth addends at 3/6/12 mo; the NASEM→EFSA handover at 6 mo) are bridged linearly across a ±0.5-month window so the A/B lines are continuous (`research/qa/b-line-verification.md`; DECISIONS D-029); away from the windows values match the sources exactly.
4. **Section 8 (product list)** live v1 — 84 items: 53 everyday foods (USDA FoodData Central, flagged non-PL) + 13 seasonings & herbs (incl. a coumarin warning on cassia cinnamon, BfR-sourced) + 18 specialist items (FSMPs, modules, thickener, hypoallergenic formula; manufacturer pages), searchable/filterable/sortable with badge chips (multi-badge AND, autosuggest); allergen + choking-hazard tags and per-item warnings. Remaining stretch: Frebini/PediaSure/NAN Expert/MCT modules. **§7 audit rounds 1–5 done; final round 0 critical + 0 major** (fix logs in `review/`).
5. **Bundle** is large (echarts + 1.8 MB grid JSON; ~470 KB gzip) — acceptable for now; code-splitting is a TODO.
6. **Some primaries are paywalled** (Krick 1992, Culley 1969, ASPEN refeeding consensus full text); their values are cited as tabulated in fetched secondary sources and marked accordingly in `research/sources.json`.
7. **Round-2 audit changes of note:** C is suppressed with a visible alert if the model goes out of range (BMR ≤ 0 safety net) and flagged when out of the physiological per-kg range (~30–250 kcal/kg); the refeeding screen triggers on WHO weight-for-length ≤ −3 SD (when a length is entered) or ≤ −2 SD on the WHS chart (weight-for-age on the WHS chart without a length; updated 2026-10-07, audit H2 — previously WHS-only ≈ < −3 SD); the E card always carries the infant-density caveat and notes when 0.67 kcal/ml exceeds maintenance fluid; the D-2 card is labelled a scenario (single number) with its own >167 kcal/kg banner (D-1 gets one too); products carry choking-hazard warnings/tags (10 items); charts/table refresh with calculator changes.
8. **Round-1 audit changes of note**: C/D and the grid default to the WHS mean length for age when no length is entered (entering a measured length changes C from 3 y up); EFSA infant values are interpolated for fractional ages and month 6 uses PZH 2024. Deferred minors (logged in the resolution logs): full chart keyboard navigation beyond the table fallbacks; a dedicated allergen filter (tags are visible/searchable instead); real screen-reader testing; crosscheck residual silent classes (row delete/duplicate, sub-tolerance edits; NaN/±Inf now fail).
9. **Model fix (2026-10-07, user review H1)**: the Schofield form is chosen by **body size (weight-age)**, not the birthday — the weight+height form was fitted on ~13–35 kg children, so small-for-age children (e.g. a WHS 3-year-old at ~8.5 kg) stay on the weight-only form (C ≈ 60 kcal/kg up to 48 mo; the old +43% jump at the 3rd birthday is gone). Supersedes the 2026-10-03 weight-only-for-0–3-y fix. Grid, cross-check and REPORT numbers regenerated; source registry now **51 verified sources**.
10. **Cross-check scope (2026-10-07)**: `scripts/crosscheck.py` is an independent recomputation of the code over the full grid (code↔parameters parity, ≤0.5% tolerance, hash-pinned) — it cannot catch a value that is faithfully implemented but wrong at the source. Source-anchored invariants added 2026-10-07 (H1 equation-selection continuity, H2 screen thresholds, M1 FAO mid-year anchors) are covered by vitest cases; source-level review of the remaining parameters remains a manual step.

## Conventions

- Claim provenance: every number/claim maps to `source_id`s (see `research/sources.json`); grades A–D per GOAL.md §1.
- PL is the primary language; EN mirrors it.
- No backend, no analytics; the site is fully static.
