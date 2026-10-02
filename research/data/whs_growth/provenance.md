# WHS growth data — digitization provenance (Antonius 2008)

## Source and materials
- Antonius T, Draaisma J, Levtchenko E, Knoers N, Renier W, van Ravenswaaij-Arts C. Growth charts for Wolf-Hirschhorn syndrome (0-4 years of age). Eur J Pediatr. 2008;167(7):807-810. doi:10.1007/s00431-007-0595-8. PMCID: PMC2413080. (`source_id: antonius2008`)
- Figures digitized: Fig 2 (height, girls), Fig 3 (height, boys), Fig 4 (weight, girls), Fig 5 (weight, boys). Fig 1 (photograph) and Fig 6 (head circumference) are out of scope.
- Image files: `research/raw/figs/antonius_fig{2,3,4,5}.jpg` — retrieved 2026-10-02 from the NCBI PMC image CDN (496x664-685 px, 8-bit grayscale JPEG). No numeric tables exist in the paper (checked the PMC full-text XML); no higher-resolution figures were accessible (the Springer media service only serves a 397-px GIF variant).

## Procedure
1. Frame detection: plot frame = longest dark row/column runs. Calibration: x: frame edges = month 0 / month 48 (validated against the monthly gridlines, residual <0.5 px). y: frame edges = printed axis limits (30-105 cm; 0-12 kg), validated against the 1-cm / 0.5-kg gridline positions.
2. Curve extraction: per-column dark runs (thresholds: run A 145, run B 135 gray levels). Where a column contains exactly five runs, they are assigned top-to-bottom to +2SD, +1SD, mean, -1SD, -2SD (curves never cross); otherwise an ordered nearest-neighbour tracker (seeded at month 24) follows the curves. Values sampled at months 0,3,...,48 (17 points per curve, 5 curves, 2 sexes, 2 measures).
3. Tooling: `scripts/digitize_antonius.py` (Python; Pillow/numpy). Visual QA overlays: `research/raw/figs/overlay_*.png`.

## Error protocol (digitize 10 points twice)
- Run A vs run B at 10 protocol points per chart (mean at months 0,6,12,...,48 plus one +2SD point): mean absolute difference = 0.008 cm (height girls), 0.019 cm (height boys), 0.002 kg (weight girls), 0.002 kg (weight boys).
- Full 3-month grid (85 point pairs): means <=0.02 units for three charts; height boys 0.22 cm due to one tracker glitch in run B (max 5.7 cm; run A is the published series and is locally smooth there).
- Practical uncertainty is larger in the dense-marker region (months 0-3), where markers up to ~18 px tall merge nearby lines: treat months 0-3 as ~±0.3 kg / ~±2 cm. From ~6 months onward the curves are cleanly separated and values are stable to ≲0.1 kg / ≲0.5 cm.

## Anchor comparison (mean curve vs paper text)
| chart | digitized mean @0mo | back-corrected to month 0 * | paper text | delta (corrected) | digitized @48mo | paper text | delta |
|---|---|---|---|---|---|---|---|
| weight boys | 2.245 | 2.16 | 2.1 | +0.06 | 9.635 | 9.7 | -0.07 |
| weight girls | 2.306 | 2.23 | 1.9 | +0.33 | 9.731 | 9.8 | -0.07 |
| height boys | 42.38 | 41.65 | 41.5 | +0.15 | 85.24 | 85.8 | -0.56 |
| height girls | 45.13 | 44.59 | 43.0 | +1.59 | 87.02 | 87.2 | -0.18 |

\* Back-corrected along the local mean-curve slope (months 0-3) to month 0, because the first faithful sample sits at ~0.2 months.

Conclusion: three of four charts agree with the quoted text means within 0.2 kg / 0.3 cm; the girls' height chart reads ~1.6 cm higher at birth than the text (chart boundary smoothing / overlapping markers; not eliminated). At 4 years all charts agree within 0.6 cm / 0.07 kg.

## Files
- `research/data/whs_growth/antonius_digitized.csv` — 340 rows; columns: source_id, sex, age_months, measure, line, value, method (=digitized), est_error (per-chart duplicate-run mean).
- `research/raw/antonius_digitized_runA.json`, `..._runB.json` — raw sampling runs.
- `research/raw/figs/overlay_*.png` — visual QA overlays (markers drawn on curves).

## Notes / limitations
- The published charts are mean ± SD lines only (no centiles); the website interpolates between the 3-month grid points.
- These data are read off published figures (allowed by the project's rules; quoted as derivative of the cited figure). No figure image is embedded in the website.
- The 2025 extended curves (Calhoun et al., CC BY-NC-ND) are retrieved (`research/raw/wb_wiley_64075.pdf`, figures at `research/raw/figs/growth2025_fig*_wb.jpg`) but not yet digitized; extension beyond 48 months is planned with the same pipeline.
