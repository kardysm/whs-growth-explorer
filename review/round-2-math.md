# Round 2 — Math / model audit (independent re-derivation of the changed parts)

- **Role**: math/model auditor (GOAL.md §7.1, role 3), round 2, fresh context.
- **Date**: 2026-10-02 (UTC). Repo: `/opt/data/whs-growth-explorer` (filesystem snapshot; not under git).
- **Artifacts audited** (sha256, first 8): `src/data/grid.json` `9f2b3e7a`, `research/data/parameters.json` `8a23a090`
  (byte-identical to `src/data/parameters.json`), `scripts/crosscheck.py` `b713a15a`,
  `research/data/whs_growth/antonius_digitized.csv` `9bce1471`, `src/calc/energy.ts` `8f7ef56e`,
  `src/calc/methods.ts` `d6bd886f`, `src/data/whs_digitized.json` `82d7eca9`.
- **Method**: a from-scratch Python re-implementation, built **only** from the raw copies
  (`research/raw/efsa_ar_summaries.txt`, `efsa_energy_text.txt`, `pzh_normy_text.txt`, `fao_y5686e05.htm`,
  `protein_trs935_text.txt`), `research/data/who_lms/*.json`, the Antonius CSV and `grid.json`.
  **No import of `src/calc` and `scripts/crosscheck.py` was used** (crosscheck.py was only *reviewed* and run in a
  sandbox copy under `/home/kardysm/projects/whs-r2-audit/cc-demo/`, with the repo untouched).
  Work product: `verify.py` (full-grid sweep + assigned checks), `verify2/3/4/5.py` (structure, spreads, boundaries,
  exact values), `cc_demo.py` (crosscheck blind-spot demos); outputs in the same directory.
- **Volume**: full sweep of **all 7,154 grid rows × 11 stored fields (77,420 successful comparisons; 1,274 rows
  have B = null by design)** plus the eight assigned checks, crosscheck mutation tests, and a
  documentation-consistency pass over README/REPORT/DECISIONS/content.

**Verdict: 0 critical, 1 major, 4 minor** (+2 documentation observations). All eight assigned round-2 checks **pass**:
every value changed in round 1 re-derives exactly, and the full grid reproduces my independent recomputation with
**0 deviations** (max relative difference < 1e-6, mostly exact floats). The one major is a **model-validity
consequence of the round-1 default-length change that round 1 only noted in passing**: C collapses to
physiologically impossible values at ages ≤ 2–3 months (and can go negative with entered short lengths), because the
Schofield boys <3 y height equation collapses at WHS-typical short lengths and no guard exists.

---

## 1. Findings

### R2-1 — [major] Ages 0–3 mo: C is ~28–208 kcal/day (6–42 kcal/kg) with the new WHS-length default, and **negative C is reachable** via an entered short length — no validity guard anywhere

**Location**: `src/calc/energy.ts` `schofieldBmrBand()` (boys 0–3 y: `0.167·W + 1517.4·H − 617.6`);
`src/calc/methods.ts` `defaultLengthCm()` + the C block (l. 121–145); consequence baked into `src/data/grid.json`
(all ages 0–3) and chart 1 / table; UI length input allows min 30 cm (`src/ui/main.ts` l. 188),
age min 0 (l. 184).

**Evidence** (shipped grid; all values independently recomputed by me):

| input (default WHS mean length) | grid C | C per kg |
|---|---|---|
| boys 0 mo, 2 kg (len 42.38 cm) | **27.94 kcal/d** | 13.97 |
| boys 0 mo, 5 kg | 28.48 | 5.70 |
| boys 0 mo, 20 kg | 31.18 | 1.56 |
| boys 1 mo, 5 kg | 88.27 | 17.65 |
| boys 2 mo, 5 kg | 148.07 | 29.61 |
| boys 3 mo, 5 kg (len 53.33 cm) | 207.86 | 41.57 |
| boys 6 mo, 5 kg | 303.83 | 60.77 |
| girls 0 mo, 2 kg | 87.26 | 43.63 |

- Cause: the healthiest-looking part of the boys' <3 y equation is the height term, but with digitized WHS mean
  lengths (42.38 cm at 0 mo, 53.33 cm at 3 mo) the BMR collapses towards `0.167·W + 25.5` — mathematically correct
  for the published equation (EFSA App. 13, re-read), clinically meaningless. Round 1 already recorded this corner
  (F1: pre-fix grid at boys 0 mo/2.25 kg = 150.9 ≈ 67 kcal/kg; WHS-length variant 28.0) but the resolution adopted the
  WHS-length default everywhere **without a guard**, so the shipped chart/table now display ~28 kcal/d for a newborn.
- Entered-length path: boys <3 y have BMR ≤ 0 when length ≤ ~40.6 cm; the UI accepts 30 cm, so e.g.
  **boys 18 mo / 8 kg / 30 cm → C = −173.9 kcal/d** (BMR −161.0); boys 3 mo / 3.5 kg / 40 cm → −10.9 kcal/d;
  girls 2 kg / 30 cm → −80.0 kcal/d (girls cross zero below ~21–37 cm depending on weight). No floor, flag or note
  in the C block. The live note only says entering a measured length "materially changes C" — it does not say the
  result may be non-physiological.
- Not caught by either verification layer: the grid never uses entered lengths, and `crosscheck.py` mirrors the same
  formula and samples only default-length rows.

**Suggested fix** (needs clinical-reviewer sign-off):
1. add a validity guard in the C block: when the height-form BMR falls below a plausible band (e.g. below a chosen
   fraction of an alternative weight-based estimate, or below ~40–50 kcal/kg/d for infants), show C as
   "out of method range — check length" or suppress the numeric value for that band;
2. clamp/flag negative or near-zero outputs (e.g. BMR < 0 → suppress C, D, %, ml and show an explanation);
3. at minimum, a prominent caveat for age < 3 mo / length < 45 cm (the methodology p2 mention of length
   sensitivity is not sufficient at these magnitudes);
4. consider the weight-only Schofield/FAO BMR form for the <3 y band — a documented substitution decision for
   DECISIONS.md, as with the BSA→Schofield deviation.

### R2-2 — [minor] README "Known limitations" #3 now contradicts the shipped model

**Location**: `README.md` l. 57: *"EFSA/PZH reference values start at month 7 (breastfeeding assumption below), so
months 0–6 use NASEM-2023 equations."*
**Evidence**: the calculator now uses **PZH 2024 month 6 = 597/549** (grid A at age 6 = 597 boys / 549 girls; raw
`pzh_normy_text.txt` l. 1121; test in `energy.test.ts`), and months 7–11 interpolate EFSA; months 0–5 are the only
NASEM-centre months. README item #7 and `content/base.json` p1 already state the new behaviour — #3 was missed.
**Fix**: "PZH 2024 provides month 6; EFSA starts at month 7. The central A value uses NASEM-2023 for months 0–5,
PZH for month 6, EFSA (linearly interpolated) for months 7–11."

### R2-3 — [minor] REPORT/README uncertainty numbers do not match the shipped grid (36-mo range, PL "27–53%", row count)

**Location**: `REPORT.md` l. 9, 15, 34, 37, 39; `README.md` l. 55.
**Evidence** — my sweep of the shipped grid, spread `(max−min)/min` over A/C/D, all weights 2–20 kg:

| series | 6 mo | 18 mo | 36 mo |
|---|---|---|---|
| boys | 94.8–96.8 % | 78.1–79.3 % | 19.1–94.3 % |
| girls | 1.4–143.7 % | 23.9–134.5 % | 20.6–89.4 % |

- REPORT EN row 1 says *"boys 95–97 % at 6 mo, 78–79 % at 18 mo, 30–82 % at 36 mo (girls similar)"*.
  6/18 mo reproduce; the 36-mo "30–82 %" reproduces **only for a ~4–16 kg window** (min at 16 kg = 30 %, max at
  4 kg = 82 %; full range is 19–94 %), and "girls similar" does not hold at the extremes (girls 6 mo spans
  1.4–143.7 %).
- REPORT PL says *"27–53 % różnicy"* (l. 34) and *"~30–110 %"* (l. 39) — neither matches any current computation
  (max is 143.7 %); README #1 repeats the stale "27–53 %".
- REPORT EN #5 / PL #5 say *"24 grid rows"*: `crosscheck.py` currently samples **28 points** (20 random + 8 fixed),
  and I re-ran it (303 compared values, 0.0000 %, PASS) — the count is stale.
**Fix**: recompute uncertainty #1 with an explicit definition and weight window, state it in the table, mirror the
same numbers in PL and in README, and correct "24" → "28".

### R2-4 — [minor] `whsZ` "≈ SD" badge uses only the lower half-width; girls' digitized lines are asymmetric

**Location**: `src/calc/methods.ts` `zOf()` l. 335–338: `(v − mean) / (mean − (−1SD))`.
**Evidence**: for the requested case the approximation is good — boys 18 mo lines mean 6.635, −1SD 5.808,
+1SD 7.456; 8 kg → z = **+1.65** (asymmetry of the two gaps only 0.7 %; −1SD line maps to exactly −1.0). But the
girls' digitized lines are systematically asymmetric, e.g. girls length 0 mo: −1SD gap 2.598 vs +1SD gap 3.968 →
the +1SD curve is displayed as ≈ **+1.53 SD**; girls weight 0 mo gap asymmetry 35 % (girls length 3/6/9/12 mo
36/30/22/20 %). Since the card reads "≈ X SD (0 = WHS mean for age)", this is defensible but avoidable.
**Fix**: use the same-side half-gap (z ≥ 0 → +1SD gap, z < 0 → −1SD gap) or the mean of both gaps; optionally add
"digitized 0–3 mo carry larger uncertainty" to the badge tooltip.

### R2-5 — [process/minor] `crosscheck.py` remains blind to mirrored errors and single-value/null regressions — specific paths + live demos

The round-1 rework (all band fields, FAO in the A band, former defect windows) is real, and against the shipped
grid it passes (my sandbox re-run: 28 points, **303 values, worst 0.0000 %, PASS**). But the independence gap
round 1 flagged (F8) is only partly closed. Specific remaining paths:

1. **Duplicated constants, not derived.** `crosscheck.py` hard-codes its own EFSA_INF_M6, EFSA_CH, FAO_INF, FAO_CH,
   Schofield, NASEM, Krick defaults (0.9/1.2), 4.1/5.0/6.0 kcal/g, the 84-day horizon and the 48-month clamp. A
   transcription error present in **both** files passes by construction — exactly what happened in round 1 (F3:
   crosscheck contained the wrong 1088 and reported 0.0000 % while grid A was wrong vs EFSA). The corrected values
   (1096, 597/549, 712, the interpolation) are again byte-identical in both files; nothing asserts either file
   against `parameters.json` (which itself stores the EFSA children only as MJ — 3.3 MJ vs the kcal-column 777 used
   in code — so an equality check needs an explicit convention).
2. **Sampling.** 28 of 7,154 rows (~0.4 %), fixed seed. **Demo** (sandbox copy, repo untouched): tripling C for the
   unsampled row boys 44 mo/10.25 kg → `PASS`; doubling C for the *entire* boys 23 mo column (73 rows) → `PASS`.
   A bug in an unsampled age/weight window is invisible.
3. **Null-blind comparisons.** `if g is None or rr is None: continue` — a field wrongly set to `null` is skipped,
   not failed. **Demo**: C → null on a sampled row (boys 18 mo/3.0 kg) → `PASS` (302 values compared).
4. **No coverage assertions.** Acceptance is only "worst relative difference ≤ 0.5 %"; there is no minimum count,
   no per-field coverage check, and no check that the report matches its inputs.
5. **Not hash-pinned; artefact ordering.** `research/qa/crosscheck-report.md` is dated 17:21:43 while the final
   `grid.json` is 17:37:39 — the shipped report cannot demonstrate which grid it validated (my fresh run against
   the shipped grid reproduces the same verdict, so no numeric impact today).
6. **Scope.** Only the 11 grid fields; live-only paths (D-2/guardrail, protein interpolation, whsZ, %A/%B, volume
   flags, entered-length C) are never exercised by the crosscheck.
**Suggested fix**: compare the **full grid** (my independent sweep of 7,154 rows × 11 fields took well under a
minute in Python — the 28-point sample buys nothing and this alone would have caught the R2-1 corner class);
assert code constants against `parameters.json`/the raw transcription (or generate both from one source); fail on
unexpected nulls/`None`s and assert compared-value counts; record `grid.json`/CSV hashes in the report; re-run after
the final grid rebuild. (The demos above also confirm the check *does* fail loudly on a tampered sampled value —
C ×1.5 on boys 18 mo/3.0 kg → `FAIL 33.33 %`.)

### R2-6 — [observation] B (healthy, same weight) has source-inherent cliff steps that look like bugs

B's central value switches source by weight-age (NASEM bands; then NASEM → EFSA at 6 mo of weight-age), so B drops
sharply at fixed weights — e.g. girls: B(5.75 kg) = 598.8 → B(6.0 kg) = 497.6 (weight-age crosses 3.0 mo,
NASEM addend +180 → +60), B(7.25 kg) = 596.3 → B(7.5 kg) = 563.1 (weight-age crosses 6.0 mo, central switches from
NASEM to EFSA); boys: 6.25 kg → 663.8, 6.5 kg → 534.5. All values reproduce exactly in my independent
recomputation — it is the published banding, not an arithmetic error — but chart 1/table users see a non-monotone B
curve. One methodology footnote (as was done for the 36-mo Schofield step, round-1 O1) would prevent misreading.

Small items (no action required): (a) boys 11 mo `Ahi = 775` is the FAO **11–12**-month bin (the 10–11 value is
752); code, crosscheck and grid agree (floor indexing) — round-1's report aside "(752)" names the other bin;
(b) the D-2 guardrail text says "TRS 935 table maximum (~167 kcal/kg/d)" — 167 is the top of the standard 73:27
lean:fat column of Table 38, while the 50:50-fat column reaches 205 (re-read in `protein_trs935_text.txt`); the
chosen threshold is conservative, only the word "maximum" is loose; (c) the 167 constant is hard-coded in
`methods.ts` and not listed in `parameters.json` `safety_thresholds` (it is only a row value in the protein table).

---

## 2. Assigned round-2 checks — results (all pass)

**(1) EFSA infant interpolation matches grid/calculator semantics.** Node series built from primary sources:
boys `[597, 636, 661, 688, 725, 742, 777]`, girls `[549, 573, 599, 625, 656, 673, 712]` for months 6…12
(month 6 = PZH raw l. 1121; 7–11 = EFSA AR appendix; month 12 = children year-1, raw `efsa_ar_summaries.txt`).
My independent interpolation: `efsa(boys, 7.638) = 651.950`; grid B for boys 8.5 kg (weight-age **7.638164** mo,
recomputed) = **651.9541** — matches. `efsa(girls, 10.5) = 664.5`; the three girls weight-ages in the former defect
window re-derive: 7.3520 → 582.15, 10.0836 → 657.43, 11.1346 → 678.27 (grid B girls 7.75/8.5/8.75 kg =
582.145/657.421/678.248). Continuity at the anchor: `efsa(11.999) = 776.97` → 777 at month 12 (no jump).
Full sweep: all **5,880 non-null B values across all rows equal my recomputation** (0 deviations).

**(2) Month-6 healthy reference.** Grid A at age 6: boys **597** [band 597–653], girls **549** [549–604] — equal to
my independently parsed PZH values; the notes in code/`base.json`/`parameters.json` are consistent.

**(3) Girls EFSA year 3 = 1096.** Grid A girls: 30 mo = **1021** (= 946 + 150×0.5), 33 mo = **1058.5**
(= 946 + 150×0.75), 36 mo = **1096** — equal to my raw-derived EFSA table (kcal column `1,096`).

**(4) FAO girls 11–12 mo = 712.** Grid `Ahi` girls 11 mo = **712**; the value is present in the raw copy
(`fao_y5686e05.htm`: “11-12 … 2.981 MJ / 712 kcal”, girls column) and in `parameters.json` with the round-1 note.

**(5) WHS-length default.** Antonius mean lengths: boys 3/18/24 mo = **53.33 / 71.396 / 75.13** cm; girls =
53.291 / 69.221 / 73.469 cm (interpolation examples: boys 4 mo = 55.282, 20 mo = 72.787). C recomputation
(Schofield × 0.9 × 1.2): boys 3 mo/5 kg → mine **207.8616** vs grid **207.8616** (rel 0.000000 %);
boys 18 mo/8 kg → **504.4668** vs grid **504.4668** (0.000000 %) — well inside the 0.5 % tolerance. Full sweep of
C/Clo/Chi/D/Dlo/Dhi/fluid and A/Alo/Ahi/B: **zero deviations across all 7,154 rows**.

**(6) D-2 guardrail (> 167 kcal/kg).** Live-path recomputation (weight-age → NASEM → ×ideal WFL median):
- boys 18 mo / 4 kg / 80 cm → wa 0.581, ideal 10.45, total 1261 kcal, **315.3 kcal/kg → fires** ✔ (test case);
- boys 18 mo / 8 kg / 74 cm → wa 6.182, ideal 9.30, total 736 kcal, **92.0 kcal/kg → does not fire** ✔;
- girls: 298.1 → fires; 87.0 → does not fire. A scan over 18/24/36 mo × weights 2–20 kg × lengths 60–90 cm shows
  the rule fires only for genuinely extreme low-weight/high-length scenarios (27 combos of 234), consistent with its
  wording.

**(7) whsZ for boys 18 mo / 8 kg.** Digitized lines: mean **6.635**, −1SD **5.808**, +1SD **7.456**, +2SD **8.261**;
z = (8 − 6.635)/(6.635 − 5.808) = **+1.65** — sensible (between the +1SD and +2SD curves; the −1SD line maps to
exactly −1). See R2-4 for the girls' asymmetry caveat.

**(8) Boundaries.** No NaN/Infinity/null anomalies anywhere: age 0 (A boys 422.88 [422.88, 518]; girls 416.12;
fluid 200 ml at 2 kg), age 48 (A boys 1256 [1256, 1360]; girls 1168 [1168, 1241]; C at 20 kg = 991.4 boys /
919.5 girls; fluid 1500 ml), weight 20 kg (B = null outside the WHO 0–60 mo median range — by design; at age 0
C = 31.2 for boys). Band ordering holds in every row; C is monotone in weight in all 98 age columns; D = C in
5,018 rows (documented no-catch-up fallback). The only "absurd" outputs are the R2-1 low-age C values (and the
extreme grid corners, e.g. boys 32 mo/2 kg → C/kg = 315.7 — implausible cell, but the grid intentionally spans
2–20 kg for every age).

---

## 3. Round-1 verification (findings treated as leads)

| Round-1 item | Status after independent re-derivation |
|---|---|
| M-F1 WHS-mean length default | **Fixed as described** (grid/methods agree; C at WHS length re-derived exactly). Consequence R2-1 documented above. |
| M-F2 EFSA fractional-month interpolation | **Fixed** — 7.638 → 651.95; grid B boys 8.5 kg = 651.9541; fallback note now correctly says "< 6 months"; 490-row window clean in my sweep. |
| M-F3 girls year 3 = 1096 | **Fixed** — 30/33/36 mo re-derive to 1021/1058.5/1096. |
| M-F4 month 6 = PZH 597/549 | **Fixed** — grid A 6 mo = 597/549; texts consistent. |
| M-F5 FAO girls 712 | **Fixed** — in raw copy, `parameters.json`, code and grid. |
| M-F6 EFSA/PZH text (method p1) | **Verified rewritten** and consistent with the code paths. |
| M-F7 Culley gate labelled assumption | **Verified** (`parameters.json` `height_based_kcal_per_cm.gate` + UI note). |
| M-F8 crosscheck reworked | **Partially** — all band fields now compared (28 points/303 values, 0.0000 %); residual blind spots in R2-5. |
| CS-6 whsZ badge, CS-7 D-2 guardrail | **Verified live semantics** (+1.65; fires/does-not-fire cases pass). |
| Round-1 claimed windows (490 + 294 rows) | **Confirmed clean** in the full sweep (0 deviations in both). |
| `src/data/parameters.json` vs `research/data/parameters.json` | **No drift** (byte-identical). |

---

## 4. Coverage note

- **Checked**: all eight assigned checks; a full sweep of 7,154 rows × 11 fields against my own implementation
  (0 deviations); grid structure/properties (A constant per age column, band order, finiteness, C monotonicity,
  B-null region, D fallback count); WHS CSV internal ordering + SD-asymmetry scan; crosscheck.py read in full and
  exercised in a sandbox (pristine + 4 mutations); documentation consistency (README, REPORT, DECISIONS,
  content/base.json, parameters.json notes) for values changed in round 1; `dist/` build ordering vs the final grid
  (built 17:37:42, after grid 17:37:39 — consistent).
- **Not checked**: re-digitization accuracy of the Antonius/Calhoun charts (CSV taken as given — internal
  consistency and its use by the grid were verified instead); execution of the shipped JS bundle in a browser
  (values verified via data files + re-implementation, not the DOM); live-only code not stored in the grid
  (protein-catch-up interpolation, volume flags, %A/%B, refeeding banner) beyond reading/recomputing the sampled
  paths named above; kJ toggle; clinical appropriateness of the method choices (separate reviewer role).
- **Reproduce**: `.venv/bin/python /home/kardysm/projects/whs-r2-audit/verify.py` (full sweep + checks 1–8) and
  `verify2.py`–`verify5.py`, `cc_demo.py` (crosscheck demos; outputs `verify-out.txt`, `verify2-out.txt`,
  `run-pristine.txt` in the same directory). Crosscheck demo sandbox: `/home/kardysm/projects/whs-r2-audit/cc-demo/`
  (symlinks to repo data; the repo itself was not modified outside `review/`).
