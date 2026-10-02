# Round 1 — Math / model audit (independent re-derivation)

- **Role**: math/model auditor (GOAL.md §7.1, role 3), round 1, fresh context.
- **Date**: 2026-10-02. Repo: `/opt/data/whs-growth-explorer` (not under git — audit refers to this filesystem snapshot).
- **Artifacts audited**: `src/data/grid.json` (sha256 `c0accdea…939e66`), the model logic in `src/calc/*.ts` (read as the object of audit, never used as the implementation), `research/data/parameters.json` (`316472b7…`), `research/data/who_lms/*.json`, `research/data/whs_growth/*.csv`, primary-source copies under `research/raw/`.
- **Method**: a from-scratch Python re-implementation of models A–D, volumes and WHO LMS z-scores built only from the primary sources (§1); 48 sample points recomputed (≥20 required) **plus a full sweep of all 7,154 grid rows for every stored field**.

**Verdict: 0 critical, 4 major, 4 minor.** The core arithmetic of the Krick-type maintenance (C), catch-up (D), Holliday–Segar fluid and the WHO LMS z-scores reproduces *exactly* (0 deviations in 50,078 field checks). The four major findings are: (F1) the chart/table pair entered weight with **healthy WHO median length for age**, producing internally inconsistent body-size pairs and C values 26–64 % above a WHS-typical-length recomputation (undisclosed); (F2) method B silently uses NASEM instead of the cited EFSA/PZH values for weight-ages 7–12 months (a JS fractional-index bug); (F3) the EFSA girls year-3 value was entered as 1088 (the PZH number) instead of 1096; (F4) month 6 contradicts the site's own source claims (PZH publishes month-6 values that are ignored; two texts say otherwise).

---

## 1. Independent implementation — notes

Implementation in `/tmp/whs_audit/` (copy at `/home/kardysm/projects/whs-audit-scratch/`):
`mymodel.py` (equations + data), `audit.py` (sample points + structural checks), `sweep.py` (full-grid sweep),
results: `results.json`, `sweep.json`. No import of `src/calc/*.ts`; `scripts/crosscheck.py` not used.

Sources re-read and re-transcribed for this audit (each value re-derived from the raw copy in `research/raw/`):

| Model | Source used (raw file) | What was re-derived |
|---|---|---|
| Schofield 1985 weight+height child REE | EFSA 2013 Appendix 13 (`efsa_energy_text.txt` l. 6449–6473) | all six equations incl. coefficients (boys 0–3: 0.167·W + 1517.4·H − 617.6; girls 0–3: 16.25·W + 1023.2·H − 413.5; boys 3–10: 19.6·W + 130.3·H + 414.9; girls 3–10: 16.97·W + 161.8·H + 371.2; boys 10–18: 16.25·W + 137.2·H + 515.5; girls 10–18: 8.365·W + 465·H + 200); H in m |
| EFSA 2013 AR | `efsa_ar_summaries.txt` (Appendix 16 kcal tables) | infants 7–11 mo per month; children years 1–17 at PAL 1.4/1.6/1.8 |
| NASEM 2023 EER | `nasem_eer_equations.txt` (Table S-2 + footnotes a/b/c) | all equations + growth addends (girls 6–11.99 mo 20; 12–35.99 mo 15; 3 y 15; 4–8 y 15; 9–13 y 30 / boys 3 y 20; 4–8 y 15; 9–13 y 25); “low active” band used in the grid |
| FAO/WHO/UNU 2004 | `fao_y5686e05.htm` (T 3.2), `fao_y5686e06.htm` (T 4.2/4.3) | all monthly infant values and yearly child values |
| Krick factors | Sullivan 2009 Table 1 (`wb_pmc2735385.html`, Wayback copy of PMC2735385) | tone 0.9/1.0/1.1; activity 1.15/1.2/1.25/1.3; growth factor 5 kcal/g — verbatim |
| Catch-up energy/protein | WHO TRS 935 (`protein_trs935_text.txt`) | Tables 38 (4.10/5.99 kcal/g gross; 1.02…4.82 g/kg/d) and 47 — verbatim |
| Fluid | Holliday–Segar 1957 (100/50/20) | boundary tests |
| Growth inputs | `who_lms/*.json`; `antonius_digitized.csv` | LMS interpolation, z-scores, WHS mean interpolation |

**Conventions of my implementation** (so any departure can be interpreted): WHO LMS values interpolated linearly between monthly nodes; EFSA/FAO annual child values interpolated linearly across the year axis for fractional ages; EFSA infant values interpolated linearly between monthly nodes **for fractional months** (this is the behaviour the grid deviates from — F2); catch-up target = WHS mean weight at `age + 12×7/30.4375` months (clamped to 48), gain = (target − weight)/84 d × 1000; costs 5.0 / 4.1 / 6.0 kcal per g; C = BMR × 0.9 (hypotonic) × 1.2 (dependent), band low/high spans tone 0.9–1.1; fluid = Holliday–Segar; volume ml = kcal ÷ density.

**Verification volume**: 48 sample points (both sexes; ages 0–48 mo incl. every formula boundary 3/6/7/12/36/48; weights 2–20 kg incl. 2/10/20 kg) → 513 field comparisons, 9 flagged (all inside F2/F3/F5); full sweep of 7,154 rows × {A, B, C, Clo, Chi, D, Dlo, Dhi, fluid}.

---

## 2. Findings

### F1 — [major] Chart/table C (and D, volumes, %A/%B) pair the entered weight with the **healthy WHO median length for age** — undisclosed, internally inconsistent, and the dominant driver of C for boys < 3 y

**Location**: `src/grid/generate.test.ts` l. 44 (`lengthCm: medianAt(lhfa, age)`); same default in `src/calc/methods.ts` l. 96 for the live card; no disclosure in `content/base.json` (“method” p2) or in the chart/table.

**Evidence A — length sensitivity of C** (grid C at the nearest 0.25 kg to the WHS mean weight for that age, vs. C recomputed identically but at the WHS mean length from Antonius 2008; tone 0.9 × activity 1.2):

| sex | age (mo) | weight (kg) | grid C | WHO median length | WHS mean length | C at WHS length | grid vs WHS-length |
|---|---|---|---|---|---|---|---|
| boys | 3 | 3.5 | 340.3 | 61.43 cm | 53.33 cm | 207.6 | **+63.9 %** |
| boys | 6 | 4.5 | 442.0 | 67.62 | 59.19 | 303.7 | **+45.5 %** |
| boys | 12 | 5.75 | 575.4 | 75.75 | 66.53 | 424.3 | **+35.6 %** |
| boys | 18 | 6.75 | 682.3 | 82.26 | 71.40 | 504.2 | **+35.3 %** |
| boys | 24 | 7.5 | 762.0 | 87.12 | 75.13 | 565.6 | **+34.7 %** |
| boys | 30 | 8.0 | 841.0 | 91.93 | 78.26 | 617.0 | **+36.3 %** |
| boys | 35 | 8.5 | 898.3 | 95.42 | 80.51 | 653.9 | **+37.4 %** |
| girls | 3 | 3.5 | 275.7 | 59.80 | 53.29 | 203.7 | **+35.3 %** |
| girls | 12 | 5.5 | 467.9 | 74.02 | 64.18 | 359.1 | **+30.3 %** |
| girls | 24 | 7.25 | 627.9 | 85.72 | 73.47 | 492.5 | **+27.5 %** |
| girls | 35 | 8.5 | 745.3 | 94.35 | 80.27 | 589.7 | **+26.4 %** |

(The same table at month 0 — boys 2.25 kg: 150.9 vs 28.0 with 42.38 cm — shows the Schofield height form collapses at extreme short lengths; neither default is a trustworthy stand-in there. The point is the size of the undisclosed sensitivity and the need for a decision, not that the WHS-length value is automatically “the” answer.)

**Evidence B — C for boys < 36 mo is nearly independent of weight.** The Schofield boys 0–3 y equation has a weight coefficient of just 0.167 kcal/kg (EFSA App. 13, as published), ≈ 1/100 of the girls’ 16.25. Grid: boys 6 mo, C = 441.6 (2 kg) → 443.0 (10 kg) → 444.8 (20 kg) — **+0.7 % across a 10-fold weight range**. Girls the same age/grid rise normally (e.g. girls 0 mo: 131.6 at 2 kg → 153.6 at 3.25 kg). The “Energy vs weight” chart therefore shows an almost flat C line for boys up to 3 y.

**Consequences**: C, D (= C + gain·cost), all ml/divides, and the live %A/%B depend on the assumed length. A caregiver who enters their child’s real (WHS-typical) length gets a C card up to ~39 % lower than the precomputed chart/table value for the same weight/age. The live card carries the note “height not provided — WHO median length for age used” only when length is empty; the grid, table and chart carry no caveat at all.

**Suggested fix** (decision required, clinical reviewer to co-sign): (a) disclose the assumption prominently in the chart caption + methodology, and state it in the grid meta; (b) decide the default — options: WHS mean length by age/sex (data already digitized in-repo, `research/data/whs_growth/antonius_digitized.csv`), length implied by the entered weight (WHO weight-for-length median, also in-repo), or keep WHO median with the caveat; (c) consider adding a length-sensitivity hint (e.g. a second band or a flag when entered length < −2 SD of WHO) since the 0–3 y boys’ equation makes the C curve’s weight-dependence effectively vestigial.

### F2 — [major] Method B (“healthy, same weight”) silently uses NASEM instead of the cited EFSA/PZH values whenever the inferred weight-age is a fractional month in 7–12 mo

**Location**: `src/calc/energy.ts` l. 84–86 — `EFSA_INFANTS[sex][ageMonths - 7] ?? null`; arrays have integer indices, so `arr[0.638]` is `undefined` (verified in node v26.5.1) → `null` → `healthyEstimate()` falls back to NASEM and appends the note *“EFSA/PZH AR not published below 7 months; NASEM used.”* — factually wrong for any age ≥ 7 months.

**Evidence**: the grid B column equals NASEM-at-weight-age **exactly** for all 10 affected weights (490 rows), while the EFSA monthly values (published for months 7–11) are never used:

| sex | w (kg) | weight-age (mo) | grid B | NASEM at weight-age | EFSA linear interp. | EFSA month-floor | grid vs EFSA-interp |
|---|---|---|---|---|---|---|---|
| boys | 8.5 | 7.638 | 679.75 | 679.75 | 651.95 | 636 | **+4.09 %** |
| boys | 8.75 | 8.471 | 704.2 | 704.2 | 673.72 | 661 | **+4.33 %** |
| boys | 9.0 | 9.374 | 729.54 | 729.54 | 701.85 | 688 | **+3.80 %** |
| boys | 9.25 | 10.344 | 755.58 | 755.58 | 730.85 | 725 | **+3.27 %** |
| boys | 9.5 | 11.373 | 781.99 | 781.99 | 755.04 | 742 | **+3.45 %** |
| girls | 7.75 | 7.352 | 599.2 | 599.2 | 582.14 | 573 | **+2.85 %** |
| girls | 8.0 | 8.185 | 621.49 | 621.49 | 603.82 | 599 | **+2.84 %** |
| girls | 8.25 | 9.097 | 644.45 | 644.45 | 628.00 | 625 | **+2.55 %** |
| girls | 8.5 | 10.084 | 668.06 | 668.06 | 657.42 | 656 | **+1.59 %** |
| girls | 8.75 | 11.135 | 692.18 | 692.18 | 678.25 | 673 | **+2.01 %** |

Affected: boys weights 8.5–9.5 kg and girls 7.75–8.75 kg (10 of 73 weight columns, 490 grid rows), and the live B card for any entered weight whose weight-age falls in (7, 12) mo. Grid B is ≥ 2.8 % above the highest published monthly EFSA value in the bracket (661 at 8 mo for boys 8.5 kg).

**Suggested fix**: interpolate the EFSA/PZH infant table for fractional months (nodes 7…11 with the 12-month node = children row 1, i.e. 777/712), or clamp to the nearest published month — but do it explicitly. Correct the fallback note to fire only below 7 months.

### F3 — [major] EFSA girls year-3 anchor entered as 1088 (the PZH 2024 number) instead of the EFSA-published 1096

**Location**: `src/calc/energy.ts` l. 79 — `girls: { 1: [712], 2: [946], 3: [1088], 4: [1168], … }`. Every other value in the array matches EFSA.

**Evidence**: EFSA 2013 girls 3 y AR = **1,096 kcal** (`efsa_energy_text.txt`, two occurrences: “3 775 1,096” and the appendix range “1,084–1,096”); PZH 2024 Table 5 girls 3 y = **1,088** (`pzh_normy_text.txt`: “3 95,1 13,9 4,6 1088”). Grid: girls A(36 mo) = 1088 vs EFSA 1096. Deviations: A(girls) −0.51 % to −0.74 % for ages **32–39 mo** (8 age columns; smaller at 24–31 mo, zero at 48 mo); B(girls weights 13.25–14.5 kg, weight-age ≈ 32.8–39.5 mo) **−0.51 % to −0.71 %** (294 rows).

**Fix**: one constant — 1088 → 1096.

### F4 — [major] Month 6: PZH 2024 publishes values (597/549) that `parameters.json` even lists, but the calculator ignores them; two UI texts contradict this

**Location**: `src/calc/energy.ts` `efsaAr()` (starts at month 7; note string “EFSA/PZH AR not published below 7 months”); `content/base.json` method p1: PL “niemowlęta 6.–11. mies. wg miesiąca”, EN “infants months 6-11 per month”.

**Evidence**: PZH 2024 Table 3 (Tabela 3, `pzh_normy_text.txt`) publishes month 6: boys 597, girls 549 kcal/d; `research/data/parameters.json` → `pzh2024.infants_6_11mo_kcal_per_day` lists `months: [6,…]` with those values. EFSA genuinely starts at 7 months, but PZH does not. Grid A at 6 mo = NASEM-only: boys **627.59** (+5.12 % vs PZH) / girls **560.17** (+2.03 % vs PZH); band = [NASEM, FAO] (boys [627.6, 653]; girls [560.2, 604]) with no PZH value anywhere.

**Fix** (policy choice): either (a) extend the EFSA/PZH infant table to month 6 with the PZH values (597/549) and adjust the note, or (b) change the PL/EN methodology texts to “months 7–11” and fix the fallback note. As-is, the stated source basis and the computation disagree, and the visible A value at 6 months is ~5 % above the Polish norm the page claims to use.

### F5 — [minor] FAO girls 11–12 mo = 712 kcal/d is present in the repo’s own raw file but recorded as null (“page truncation”), narrowing the A band at girls 11 mo (Ahi 689.17 vs 712; 3.2 % below the source value)

**Location**: `research/data/parameters.json` (`fao2004.infants_monthly_kcal_per_day.girls` ends with `null`; pending-list item) and `src/calc/energy.ts` (`FAO_INFANTS.girls[…] = NaN`).

**Evidence**: the value **is** in the fetched copy: `fao_y5686e05.htm`, Table 3.2 — girls “11-12 … 2.981 MJ 712 kcal/d”. Since the null propagates, grid A at girls 11 mo has `Ahi = 689.17` (NASEM) instead of 712 (3.2 % below the source value); boys 11 mo correctly include FAO (752). Central A is unaffected.

**Fix**: fill 712; drop the “pending” note.

### F6 — [minor] Methodology text lists Polish Norms 2024 for children (“dzieci od 1. roku” / “children from year 1”), but only EFSA kcal values are used — up to ~1.5 % apart from the Polish source

**Location**: `content/base.json` method p1; `src/calc/energy.ts` `EFSA_CHILDREN` (EFSA values only; with the girls-3-y slip from F3 the array is EFSA except one PZH value).

**Evidence** (grid A vs PZH 2024 Tables 4/5, kcal/d): boys 3 y 1174 vs 1163 (+0.95 %), boys 4 y 1256 vs 1237 (+1.5 %), girls 4 y 1168 vs 1160 (+0.7 %), infants 1 y 777 vs 778 (−0.13 %); 2 y identical. Both sources are A-grade and the spread is small, but the text reads as if both are used. Fix: state explicitly which source provides the central A value (EFSA) and label PZH as the Polish cross-check, or switch to PZH values for PL users — but then do it consistently (cf. F3).

### F7 — [minor] Culley provenance gap: the fetched `culley1969` artifact is a different paper; the ≥ 12-month gate is an assumption

**Location**: `research/sources.json` (`culley1969`, `verified: true`, `fetched_file: research/raw/epmc_culley1969.json`); `research/data/parameters.json` `height_based_kcal_per_cm.gate`.

**Evidence**: `epmc_culley1969.json` is PMID 4275770, “Age and body size of mentally retarded girls at menarche” (query was `AUTH:"Culley WJ"`), not PMID 5804183 “Caloric requirements of mentally retarded children with and without motor dysfunction”. The 14.7/13.9/11.1 kcal/cm values themselves are correctly verified in Sullivan 2009 Table 1 (Wayback copy; also Hauer 2017) — but Sullivan/Hauer give no derivation age range, so the ≥ 12 mo gate is the project’s assumption, not a sourced statement. Fix: re-point the fetched file / mark the culley1969 note as “values read via Sullivan 2009; primary not retrieved”, and label the gate as an assumption in the methodology.

### F8 — [minor] `scripts/crosscheck.py` is only semi-independent: it copies the implementation’s constant tables and mirrors the JS indexing, so it passes 0.0000 % by construction for F2/F3/F5-class errors

**Location**: `scripts/crosscheck.py` l. 71–72 (`girls: {… 3: [1088] …}` — same wrong value as F3), l. 76–82 (“mirror JS array indexing: only integer-valued indices resolve” — reproduces the F2 behaviour), no FAO term (A-band edges unchecked), acceptance covers A/B/C/D central + fluid only.

**Evidence**: my independent recomputation (from the raw sources) reproduces every grid field exactly *except* the four defect classes in this report — three of which crosscheck.py cannot see because it duplicates the same constants/behaviour. Fix: derive the cross-check tables from `research/data/parameters.json` + raw-source transcription, include FAO in the A band, and compare all band fields, not just central.

---

## 3. Verified correct (evidence of pass)

- **C, Clo, Chi, D, Dlo, Dhi, fluid: 7,154 / 7,154 grid rows exact** vs independent recomputation (max relative deviation 0.000 %; 50,078 field comparisons). This covers Schofield coefficients, H unit (m), Krick tone/activity factors, the D band (4.1/5.0/6.0 kcal/g), the 84-day horizon, the WHS-mean target (incl. 48-month clamp) and Holliday–Segar.
- **A: 90 / 98 age columns exact**; the 8 mismatches are all girls ages 32–39 (F3) plus girls-11 A-high (F5).
- **B: 5,096 / 5,880 non-null values exact**; the 784 mismatches are exactly the F2 (490) and F3 (294) windows. `B = null` holds precisely where the weight is outside the WHO 0–60 mo median range (1,274 rows; verified formulaically).
- **WHS inputs**: `src/data/whs_digitized.json` == `antonius_digitized.csv` (340/340 rows, no diffs); D target/gain re-derived from the CSV matches the grid at every row; `reference_lines.json` WHS lines match the CSV exactly (0/980 checks off).
- **WHO LMS**: JSON spot-checked against the official WHO xlsx downloads at 5 anchors/table (wfa boys/girls, lhfa girls incl. the girls-24 seam below) — identical; LMS z-scores reproduce WHO’s own tabulated ±2 SD columns for wfa/lhfa/wfl/wfh (0 mismatches beyond rounding tolerance); `reference_lines.json` WHO median/±2 SD values re-derive exactly.
- **Holliday–Segar boundary tests**: 8→800, 10→1000, 15→1250, 20→1500, 25→1600 ml/day — pass; all grid rows exact.
- **Structure**: no NaN/Infinity/null in A/C/D/fluid; band ordering (`lo ≤ central ≤ hi`) holds in every row; A constant within each age column (by design); C non-decreasing in weight; `D == C` exactly where the 12-week target is not above the current weight (5,018 rows — the documented no-catch-up fallback).
- **Source constants**: every coefficient in `parameters.json` used by the grid re-verified against the raw copies (table in §1) — no transcription errors found beyond F3/F5.

## 4. Observations (no deviation; documentation / judgment items)

- **O1 — 36-month band switch step.** C jumps at 36 mo when Schofield switches bands: boys ≈ −23 % at 5 kg, −12 % at 10 kg (≈ 0 % at 15 kg); girls −2 % to −4 %. Inherent to the published equations; consider a methodology note so the table/chart step is not read as a bug.
- **O2 — WHO length→height seam at 24 months.** `lhfa` girls month 24 = 85.7153 cm (2–5 y height table) while the 0–2 y length table has 86.4153 (Δ = 0.7 cm). Verified against WHO’s own daily expanded tables (step at day 731) — this is WHO’s official convention, not an error; effects on C/A < 0.4 %. A footnote would help since it looks like a discontinuity.
- **O3 — Annual→monthly interpolation** of EFSA/FAO children values is an assumption (e.g. 18 mo boys A = 902.5 between 777 and 1028). Reasonable and shared by my recomputation; not stated in the methodology — worth one sentence.
- **O4 — Protein for catch-up** (TRS 935 Table 38 rows / Table 47) verified verbatim; the linear interpolation between table rows and the 1–20 g/kg/d clamp were code-reviewed but are not part of `grid.json`, so no numeric diff was possible.
- **O5 — ml/day at densities** is computed live (`kcal ÷ density` for 0.67/1.0/1.5/custom) and is not stored in the grid; arithmetic reviewed and recomputed on samples — no discrepancy; consider adding it to the cross-check.
- **O6 — `kcalPerMj = 238.8459`** (4.1868 J/cal convention) vs EFSA/FAO’s usual 4.184 — a 0.065 % difference, currently unused in the built app (0 occurrences in `dist/`); harmless, note for any future kJ display.
- **O7 — `reference_lines.json` has no `who_l_p2` key** (only `who_l_med`/`who_l_m2`), and no UI code references it — harmless; flagged only because my checker expected it.
- **O8 — D clamp and fallback**: target clamp at 48 mo for ages ≥ 45.24 mo and the `D = C` fallback are consistent with the documented behaviour.

## 5. Coverage note

- **Checked**: every formula/coefficient listed in §1; all 7,154 grid rows for all stored fields; WHS digitization integrity (CSV ↔ JSON) and interpolation; WHO table transcription (spot) and z-scores; reference lines; boundary behaviour (Holliday–Segar 10/20 kg, EFSA 7/12 mo, NASEM 3/6/36 mo, Schofield 36/120 mo — 36 mo exercised by the grid); null/NaN/monotonicity properties.
- **Not checked**: accuracy of the Antonius figure digitization itself (no re-digitization; only the provenance documentation and internal consistency of the CSV were reviewed); live in-browser rendering (`dist`); clinical appropriateness of the method choices (separate reviewer role); paywalled primaries of Culley 1969 / Schofield 1985 (read via EFSA App. 13 and Sullivan 2009, as the project itself did); kJ toggle (unused).
- **Reproduce**: `/opt/data/whs-growth-explorer/.venv/bin/python /tmp/whs_audit/audit.py` (sample points + structural checks) and `... /tmp/whs_audit/sweep.py` (full-grid sweep). Node v26.5.1 used once for the JS fractional-index demonstration.
- Hashes (sha256, first 8): grid.json `c0accdea`, parameters.json `316472b7`, lhfa_girls.json `6aafc493`, antonius_digitized.csv `9bce1471`.

---

## Appendix A — sample points (28 of 48 shown; full set in `/tmp/whs_audit/results.json`)

Cells are `grid / recomputed`; **bold** = deviation > 0.5 %. `B`-recomputed uses the EFSA interpolation reading for weight-ages < 12 mo (F2). All C/D/fluid cells matched exactly.

| sex | age (mo) | w (kg) | A grid / rec | B grid / rec | C grid / rec | D grid / rec | fluid |
|---|---|---|---|---|---|---|---|
| boys | 0 | 2.0 | 422.9 / 422.9 | – | 150.9 / 150.9 | 238.4 / 238.4 | 200.0 / 200.0 |
| boys | 0 | 3.5 | 422.9 / 422.9 | 437.0 / 437.0 | 151.1 / 151.1 | 151.1 / 151.1 | 350.0 / 350.0 |
| boys | 3 | 3.25 | 524.0 / 524.0 | – | 340.3 / 340.3 | 409.7 / 409.7 | 325.0 / 325.0 |
| boys | 6 | 5.0 | 627.6 / 627.6 | 565.7 / 565.7 | 442.1 / 442.1 | 448.9 / 448.9 | 500.0 / 500.0 |
| boys | 7 | 6.5 | 636.0 / 636.0 | 534.5 / 534.5 | 467.6 / 467.6 | 467.6 / 467.6 | 650.0 / 650.0 |
| boys | 11 | 8.0 | 742.0 / 742.0 | 633.6 / 633.6 | 556.0 / 556.0 | 556.0 / 556.0 | 800.0 / 800.0 |
| boys | 12 | 2.0 | 777.0 / 777.0 | – | 574.7 / 574.7 | 823.4 / 823.4 | 200.0 / 200.0 |
| boys | 12 | 18.5 | 777.0 / 777.0 | – | 577.7 / 577.7 | 577.7 / 577.7 | 1425.0 / 1425.0 |
| boys | 18 | 9.0 | 902.5 / 902.5 | **729.5 / 701.8** | 682.7 / 682.7 | 682.7 / 682.7 | 900.0 / 900.0 |
| boys | 24 | 8.5 | 1028.0 / 1028.0 | **679.8 / 652.0** | 762.2 / 762.2 | 762.2 / 762.2 | 850.0 / 850.0 |
| boys | 24 | 18.0 | 1028.0 / 1028.0 | 1319.1 / 1319.1 | 763.9 / 763.9 | 763.9 / 763.9 | 1400.0 / 1400.0 |
| boys | 30 | 19.0 | 1101.0 / 1101.0 | – | 843.0 / 843.0 | 843.0 / 843.0 | 1450.0 / 1450.0 |
| boys | 36 | 10.5 | 1174.0 / 1174.0 | 858.4 / 858.4 | 805.6 / 805.6 | 805.6 / 805.6 | 1025.0 / 1025.0 |
| boys | 41 | 11.0 | 1208.2 / 1208.2 | 908.8 / 908.8 | 820.6 / 820.6 | 820.6 / 820.6 | 1050.0 / 1050.0 |
| boys | 48 | 13.0 | 1256.0 / 1256.0 | 1081.2 / 1081.2 | 868.7 / 868.7 | 868.7 / 868.7 | 1150.0 / 1150.0 |
| boys | 48 | 20.0 | 1256.0 / 1256.0 | – | 1016.9 / 1016.9 | 1016.9 / 1016.9 | 1500.0 / 1500.0 |
| girls | 0 | 2.5 | 416.1 / 416.1 | – | 140.4 / 140.4 | 194.5 / 194.5 | 250.0 / 250.0 |
| girls | 3 | 4.0 | 485.9 / 485.9 | 472.7 / 472.7 | 284.5 / 284.5 | 298.7 / 298.7 | 400.0 / 400.0 |
| girls | 6 | 5.5 | 560.2 / 560.2 | 580.4 / 580.4 | 376.3 / 376.3 | 376.3 / 376.3 | 550.0 / 550.0 |
| girls | 11 | 8.0 | 673.0 / 673.0 | **621.5 / 603.8** | 498.0 / 498.0 | 498.0 / 498.0 | 800.0 / 800.0 |
| girls | 12 | 8.5 | 712.0 / 712.0 | **668.1 / 657.4** | 520.5 / 520.5 | 520.5 / 520.5 | 850.0 / 850.0 |
| girls | 18 | 9.0 | 829.0 / 829.0 | 716.6 / 716.6 | 603.2 / 603.2 | 603.2 / 603.2 | 900.0 / 900.0 |
| girls | 24 | 18.25 | 946.0 / 946.0 | – | 820.9 / 820.9 | 820.9 / 820.9 | 1412.5 / 1412.5 |
| girls | 30 | 10.0 | 1017.0 / 1021.0 | 807.4 / 807.4 | 731.0 / 731.0 | 731.0 / 731.0 | 1000.0 / 1000.0 |
| girls | 36 | 10.5 | **1088.0 / 1096.0** | 854.2 / 854.2 | 759.4 / 759.4 | 759.4 / 759.4 | 1025.0 / 1025.0 |
| girls | 36 | 2.0 | **1088.0 / 1096.0** | – | 603.6 / 603.6 | 1011.4 / 1011.4 | 200.0 / 200.0 |
| girls | 47 | 11.5 | 1161.3 / 1162.0 | 947.3 / 947.3 | 790.1 / 790.1 | 790.1 / 790.1 | 1075.0 / 1075.0 |
| girls | 48 | 19.0 | 1168.0 / 1168.0 | – | 928.6 / 928.6 | 928.6 / 928.6 | 1450.0 / 1450.0 |

Notes: the girls-30 A deviation (0.39 %) is the same root cause as F3; girls-11 rows additionally have `Ahi` 689.2 vs source-verified 712 (F5, not shown in the A column which is central). The full 48-point list (incl. girls-11, boys-15/29, girls-36/2.0 etc.) is the source of the 9 flagged comparisons mentioned in §1.

## Appendix B — F2 mechanism (10 affected weight columns)

Grid B reproduces NASEM at the weight-age for every affected weight (490 rows); the cited EFSA/PZH primary is not used in the (7, 12) mo window. The mechanical cause is `EFSA_INFANTS[sex][ageMonths - 7]` returning `undefined` for fractional months (node check: `[636,661,…][0.638] === undefined`). Values per weight are in the F2 table above.
