# Digitization provenance — Calhoun et al. 2025 extended WHS growth curves

Source: Calhoun ARUL, Lortz A, Casper TC, Carey JC. "Extended Growth Curves for the Wolf-Hirschhorn
Syndrome (4p−)." Am J Med Genet A. 2025;197(8):e64075. doi:10.1002/ajmg.a.64075. Open access
(CC BY-NC-ND); digitized numeric data points only, figures not reproduced (GOAL.md §1).

## What was digitized
- Figure 1 — Weight: panels 0–24 mo and 2–18 y. Figure 2 — Length/height: same panels.
  Figure 3 — OFC: 0–24 mo.
- 9 curves per panel (4p− only; CDC reference quartiles NOT digitized): quartiles, 10/90,
  5/95, 2.5/97.5.
- Output: `research/data/whs_growth/calhoun2025_digitized.csv` — 1,269 rows.
  Sampling grid: months 0–24 (step 1) on the 0–24 mo panels; years 2–18 (step 0.5) on the 2+ panels.
- Sex: combined (the paper could not produce sex-specific curves; cohort 2:1 female:male).

## Method (scripts/digitize_2025.py — stages: axes / curves / verify / assemble)
1. Panels split at the figure's mid whitespace; plot area from axis lines + gridline extent.
2. Axis calibration from OUTWARD TICK marks (linear least squares). Max residual per panel:
   fig1-left 0.006 kg / 0.013 mo; fig1-right 0.023 kg / 0.000 y; fig2-left 0.010 cm / 0.006 mo;
   fig2-right 0.049 cm / 0.000 y; fig3 0.007 cm / 0.005 mo.
3. Colour-family classification of pixels (blue 4p− quartiles; red 10/90; green 5/95; pale-blue
   2.5/97.5; CDC purple excluded from tracking), legend box auto-detected and masked.
4. Per-column colour-run centres; continuity tracking across columns (750–1,650 points per curve);
   percentile order within each family fixed by vertical order (curves do not cross).

## QC performed
- Percentile-ordering checks at 4 reference ages per panel: all pass (tolerances 0.45–4 units).
- Pixel-level audit (`research/qa/digitize2025_verify_*.txt`): 100.0% of every track's points sit
  on their own colour family (n = 749–1,636 points/curve); 0.0% on CDC purple; 0.0% off-colour.
  An initial apparent mismatch in a visual review was traced to antialiasing fringes and disproved.
- Visual spot checks (zoom crops) of curve identity/order: consistent.
- Cross-study check vs Antonius 2008 (independent digitization): 2025 median LENGTH ≈ Antonius
  boys' mean within 0.2 cm at 6/12/24 mo (and slightly above girls' mean — expected for a
  combined-sex median); 2025 median WEIGHT ≈ +13% above Antonius mean (4.5→5.09 / 5.7→6.35 /
  7.4→7.83 kg at 6/12/24 mo) — consistent with the paper's own observation that its (US,
  recently managed) cohort skews larger. The two digitizations are mutually consistent.
- QC overlays (extracted curves drawn on the source figures; legend box outlined):
  `research/raw/figs/qc_2025/`.

## Known caveats (carry into any use)
a. **Panel-seam discontinuity at 2.0 y**: the paper fitted two separate models (≤24 mo and ≥24 mo).
   Extreme percentiles do not join at the boundary (e.g., weight p2.5: 3.76 kg at 24 mo [left]
   vs 0.52 kg at 2.0 y [right]; length p2.5: 63.7 vs 47.5 cm). Use the left panel up to 24 mo and
   the right panel from ≥3 y; treat right-panel values between 2.0–2.5 y as model-edge artifacts.
b. **Extreme curves are prediction-ellipsoid curves, not empirical quantiles.** The 2.5/97.5
   (and partly 5/95) curves are generated from SITAR parameter covariance; several low-tail values
   (e.g., weight <2 kg during infancy; <5 kg at 5 y) are mathematically produced tail curves that
   are NOT plausible as individual trajectories. Use mid bands (25/50/75, 10/90) for clinical
   reading; display the wider bands with these caveats attached.
c. **Precision**: figure-digitization scale ~±0.1–0.2 kg (weight), ~±0.5–1 cm (length/OFC);
   JPEG compression, 3–4 px line width; values rounded to 0.01.
d. **Cohort**: US volunteer sample (4p− Support Group), n=65; longitudinal abstraction; no
   race/ethnicity/SES data; length/height not distinguishable; contractures/scoliosis may depress
   length. See paper's discussion for full limitations.

## Addendum 2026-10-07 (audit M3, updated) — all digitized curves are SITAR prediction curves; coverage derived

The paper's own text: "Prediction ellipsoids corresponding to the aforementioned percentiles were generated
based on these assumptions, and predicted measurement curves were generated" — i.e. ALL digitized curves
(including the quartiles p25/p50/p75) are model prediction curves, not empirical centiles.

**Coverage derivation (reproduced from the audit's method).** The distances of the digitized curves from p50
follow the 2-parameter ellipsoid law r(c) = sqrt(−2·ln(1−c)) (central coverage c): theory ratios
1 : 1.524 : 1.823 : 2.079 for the 50/80/90/95% central regions; digitized left-panel means (ages 3–21 mo):
weight 1 : 1.579 : 1.921 : 2.222, length 1 : 1.545 : 1.855 : 2.131. Therefore:

- the p25–p75 band is the 50% prediction region; its marginal coverage is 2·Phi(1.177) − 1 = **76.1%** of
  children (not 50%); the p10–p90 band covers **92.7%**;
- the "25" line sits at −1.177 units ≈ the **12.0th** marginal centile.

The ≥24-month panels are built differently: their ratios (weight 1 : 1.927 : 2.468 : 2.940) are close to the
univariate normal quantile ratios (1 : 1.90 : 2.44 : 2.91) — chart 2 joins two differently-constructed curve
sets at 24→30 months. The curves are combined-sex (~2:1 female:male; the paper could not fit separate sexes).

UI consequences (D-059 + D-064): the green lines are labelled "model prediction curves p25/p50/p75 (not
empirical centiles)"; the note/hints/method now carry the ≈76% / ≈93% coverage and the both-sexes caveat.
