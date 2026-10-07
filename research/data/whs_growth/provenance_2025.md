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

## Addendum 2026-10-07 (audit M3) — all digitized curves are SITAR prediction curves

The paper's own text: "Prediction ellipsoids corresponding to the aforementioned percentiles were generated
based on these assumptions, and predicted measurement curves were generated" — i.e. ALL digitized curves
(including the quartiles p25/p50/p75) are model prediction curves, not empirical centiles. The nominal
"25th–75th" band therefore does not contain exactly 50% of children. Quantifying the true coverage:

- Review estimate (external audit): ≈76% of children between the p25 and p75 curves.
- Our own spacing check (vs the model's own 2.5/97.5 curves as the reference SD; weight/length, left panel,
  ages 0–24 mo): ≈66%. Coverage between the model's own quartile curves, by construction: 50%.
- The exact figure depends on the SITAR model's variance structure (between-child random effects + residual)
  and is not recoverable from the digitized curves alone.

UI consequences (D-059): the green lines are now labelled "model prediction curves p25/p50/p75 (not
empirical centiles)" in the legend, the chart note, the hints, the a11y description and method.p7.
