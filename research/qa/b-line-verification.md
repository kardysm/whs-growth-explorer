# B-line verification — „Energia vs masa ciała (w wieku 18 mies.)”, yellow line (2026-10-05)

User report: the yellow line (series **B — healthy child of the same weight**) needs verification.
B is defined as the EER of a healthy child at the **weight-age** (the age at which the WHO median
weight-for-age equals the entered weight), using EFSA/PZH (primary from month 6), NASEM 2023 (primary
below month 6) and FAO/WHO/UNU 2004 (band edges); see `content/base.json` (method p1) and
`src/calc/energy.ts` / `src/calc/methods.ts`.

## Sources re-read for this check (research/raw/)

- NASEM 2023 DRI for Energy, Table S-2 + footnotes (raw: `nasem_eer_equations.txt`, `nasem_ch2.html`):
  boys 0–2.99 mo `... + 200`, 3–5.99 mo `... + 50`, 6 mo–2.99 y `... + 20`; girls `+ 180 / + 60 / + 20/15`;
  footnote: „Age is in years, weight is in kilograms, and height is in centimeters.”
- EFSA 2013 AR for energy (raw: `efsa_ar_summaries.txt`): infants months 7–11 = 636/661/688/725/742 (boys),
  573/599/625/656/673 (girls); month 6 = PZH 2024 (597/549); children year 1 = 777/712 (PAL 1.4 column).
- FAO/WHO/UNU 2004, Table 3.2 (raw: `fao_y5686e05.htm`): boys 0–1..11–12 mo =
  518/570/596/569/608/639/653/680/702/731/752/775 kcal/d (the 596→569 dip at 3–4 mo is in the table itself).

## Finding

Every constant is transcribed correctly (hand-checked against the fetched files above; also pinned by
`scripts/crosscheck.py`). But through the weight→age mapping the published **category steps become visible
cliffs on the B line**, exactly in the weight range where WHS children live:

| sex | largest adjacent drop (pre-fix) | where | cause |
|---|---|---|---|
| boys | 129.3 kcal (19.5%) | 6.25->6.5 kg | NASEM growth addend 200→50 at 3.0 mo weight-age |
| girls | 101.2 kcal (16.9%) | 5.75->6.0 kg | NASEM growth addend 180→60 at 3.0 mo weight-age |

(Also from the same class: NASEM 50→20 at 6 mo; the NASEM→EFSA primary switch at month 6; the EFSA
month-12 anchor; girls' footnote-a 20→15 at 12 mo. All are published-table granularity, faithfully reproduced.)

## Fix (DECISIONS D-029)

The growth addend is interpolated linearly across a ±0.5-month window around each NASEM boundary
(3 / 6 / 12 mo) and the NASEM→EFSA handover is blended across ±0.5 months around month 6.
**Band interiors keep the exact published values** (verified below); only the crossings are smoothed.

| sex | largest adjacent step (post-fix) | largest drop (post-fix) | where |
|---|---|---|---|
| boys | 5.28% | 32.3 kcal (6.25->6.5 kg) | 6.25->6.5 kg |
| girls | 5.65% | 29.2 kcal (8.75->9.0 kg) | 5.75->6.0 kg |

Residual behaviour is continuous: a gentle dip around 3–4 months of weight-age (present in the source
tables themselves — FAO 596→569 at 3–4 mo) and a steeper (continuous) rise at the EFSA month-12 anchor.

## Spot checks (post-fix grid vs hand-computed published value)

| sex | weight | weight-age | published form | hand | grid | Δ |
|---|---|---|---|---|---|---|
| boys | 4.0 kg | 0.58 mo | 0-2.99 mo (addend 200) | 482.81 | 482.81 | 0.0000 |
| girls | 4.5 kg | 1.33 mo | 0-2.99 mo (addend 180) | 508.66 | 508.66 | 0.0000 |
| boys | 10 kg | 13.57 mo | EFSA year 1→2 interp (PAL 1.4) | 809.79 | 809.79 | 0.0000 |

Checkpoint acceptance (all Δ < 0.01 kcal): **PASS**

## Evidence

- `src/calc/methods.test.ts` — „A/B line continuity (user report 2026-10-05; DECISIONS D-029)” (max relative
  adjacent step < 6% across 3.5–18 kg for both sexes; old cliff bound; published-value checkpoint).
- `scripts/crosscheck.py` — full-grid independent recomputation (0.000000% worst difference; grid sha256 in
  `research/qa/crosscheck-report.md`, pin a051e3442dff0d45…).
- `npm run build` + browser check of chart 1 (see DECISIONS D-029).
