# Round-6 review (user) — findings and resolution log (2026-10-07)

Source: user review delivered 2026-10-07 (3 serious H1–H3, 7 moderate M1–M7, a low-priority list, and two
points flagged for web confirmation). Method: every finding verified against the code and the saved sources
first (recomputed numbers quoted below); work tracked as kanban cards 1–9 on `UX-KANBAN.html`; decisions in
`DECISIONS.md` D-052–D-060; verification summary D-061.

**Verdicts as filed: 3 serious, 7 moderate, 5 low-priority groups — all resolved (0 open).**

| ID | Finding | Verified (recomputed) | Resolution | Evidence |
|---|---|---|---|---|
| H1 | C jumps at 36 mo (Schofield band switch by birthday; 3–10 y form fitted on ~13–35 kg children) | boys WHS-mean child: C 522.6 → 745.0 kcal/day (+42.5%); girls 505.6 → 699.1 (+38.3%); 5 kg child 2.32×/2.25× — all confirmed | Equation chosen by **body size (weight-age)** from WHO wfa; W-only form continues while weight-age < 36 mo; caller resolves out-of-table weights vs the WHO median at 36 mo | D-052; continuity ≤~0.2%/2.1% at the reference crossover (boys/girls), residual ≤5–6.5% worst plausible; C ≈ 60 kcal/kg at 36/48 mo (60.4/60.8 boys; 59.0/59.5 girls); crosscheck 0/77,420 mismatches; browser 35→36 mo = 523→523 |
| H2 | Refeeding banner almost never shows | current screen: 12-mo boy 66.5 cm flags only below **3.25 kg**; WHO wfl −3 SD = **6.017 kg** — both confirmed | Trigger: WHO weight-for-length ≤ −3 SD (length present) OR WHS z ≤ −2 SD; no length → WHS weight-for-age ≤ −2 SD; banner + flags text updated | D-053; tests + browser: 6.5 kg no banner, 6.0/5.5/3.3 kg banner; no length: 4.5 no, 4.0 yes; WHO-only cases verified (WHS ≤ −2 is subsumed when a length is given) |
| H3 | Height-based (Culley) figure shown from 12 mo; derived 5–11 y; wrong attribution „Sullivan 2009" | 738 vs 334 kcal at 12 mo confirmed (11.1 × 66.5 cm; C from WHS mean); fetched source is the CPS statement („Principal author: Dr Valérie Marchand"), not Sullivan; 5–11 y range confirmed via Wittenbrook 2011 (CdLS USA attribution not verifiable — its nutrition documents contain no such statement) | Figure **removed** (no valid window in a 0–48 mo tool; GOAL.md updated); source renamed `cps2009_marchand` + new `wittenbrook2011`; params block kept with status | D-054; no `kcal/cm:` figure anywhere in the UI; sources section shows the CPS citation + Wittenbrook |
| M1 | FAO child values placed half a year early | FAO §4.4: „median weight at the midpoint of each year … (1.5, 2.5 … years)"; A high edge at 12 mo: 948 → now 797.7 (was +19%); at 18 mo now 948 (was 1038.5) — confirmed | Values anchored at mid-year (18/30/42/54 mo), 12→18 mo bridges from the month-12 infant value | D-055; tests + grid check; browser: 11 mo 742–742–775, 12 mo 775–777–798, 18 mo 903–903–948 |
| M2 | Card C range text says central uses normal tone | code uses the **selected** tone (hypotonic ×0.9 default) — confirmed | `band_c` text fixed (PL+EN); related C texts (method.p2, chart1 hint, method.p8, tip) updated | D-052; browser shows „Środkowa: wybrane napięcie mięśniowe (domyślnie hipotonia ×0,9)…" |
| M3 | Calhoun lines are model prediction curves, not centiles; „25–75" band ≠ 50% | paper text: „Prediction ellipsoids corresponding to the aforementioned percentiles … predicted measurement curves" — confirmed | Labels → „model prediction curves p25/p50/p75 (not empirical centiles)" in legend/note/hints/a11y/method.p7; coverage analysis in the provenance addendum (review ≈76%; our spacing check ≈66%; exact figure not recoverable from digitized curves) | D-059; bundle: 2× each new legend name, 0× „25. centyl"; fallback table header „p25 (model)" |
| M4 | NICE weighing intervals inverted | NICE 1.2.27: „usually no more often than: daily <1 mo; weekly 1–6 mo; fortnightly 6–12 mo; monthly ≥1 y" (+1.2.28 anxiety) — confirmed | Rule rewritten as a ceiling in the faltering-growth context | D-056 |
| M5 | Centile spaces treated as 1 SD; faltering flag lacks chart | method.p8 mapped centile-space criteria onto ±SD bands 1:1 — confirmed | 1 UK-WHO centile space ≈ 0.67 SD added (2 ≈ 1.3 SD); faltering flag + item now name the reference chart (WHS for WHS children); flags item 5 reworded to SD bands | D-056 |
| M6 | Wrong underlying products: twaróg=cottage cheese; cream 30%=36%; US-fortified semolina/milk tags; dry grains mixed with cooked | twaróg 98 vs ≈156 kcal (PZH 2014); cream 340 vs 292; semolina Fe 4.36 vs 1.23; milk vitD 1.3 vs 0.1 — confirmed | twaróg → PZH 2014 PL data (new `PL_OVERRIDES`); cream → light whipping; semolina → unenriched; milk → unfortified; dry staples labelled „(suche)" + „high-energy" tag suppressed; foods note extended | D-057; rebuild changes exactly 6 items; allergen parity 0 mismatches; browser checks |
| M7 | Texture rule says thickening lowers energy per ml | thickeners are starch/gum/maltodextrin (Nutilis Clear 290 kcal/100 g); literature: „adding starch-based thickeners substantially elevates the caloric content of infant feeds" | Rule rewritten (thickening ADDS energy); new source `starch_thickening_2026` | D-058; browser: new wording present, old gone |
| L1 | Resource Junior kcal per scoop | label: scoop 7.8 g; 468 kcal/100 g → 36.5 kcal | Measure „1 miarka (7,8 g)" = 37 kcal added | D-060 |
| L2 | Nutilis Clear scoop 1.25 g (UK) vs 3 g (PL page) | UK page: 1.25 g (green scoop; RCSLT: purple 3 g → green 1.25 g); current PL listings all 3 g; physical PL tin not inspectable | Card keeps 3 g + market warning; label age caveat added | D-060; research/raw/products/nutricia_uk_nutilis_clear.html saved |
| L3 | Nutridrink „from 1 year" caveat | label: „powyżej 1. roku życia" | Form text updated | D-060 |
| L4 | Inflated evidence grades | `aap_botulism` A (consumer page), `ni_nutrition_2025` A (narrative review) | Both → B with notes; all A-classes re-scanned | D-060 |
| L5 | Out-of-date counts | README 47/48/61; REPORT 47/55 — stale | Fixed (51 sources, 77 tests, updated spreads) | D-060 |

## Confirmation items requested by the review

- **Culley 5–11 y (attributed to CdLS USA)**: NOT found on CdLS USA — all of its nutrition/feeding/caloric
  documents (current + archived; 13 documents checked) contain no such statement. The claim itself is
  confirmed and now citable: Wittenbrook W, Practical Gastroenterology 2011 („5–11 years old — 14 kcal/cm if
  ambulatory; 11 kcal/cm if nonambulatory", citing Culley & Middleton 1969); saved as
  `research/raw/va_cp_nutrition.pdf` and registered as `wittenbrook2011`.
- **Nutilis Clear 1.25 g (Nutricia UK)**: confirmed on the Nutricia UK HCP page („1 level scoop provides
  1.25g"); the PL market still shows a 3 g scoop. Card documents both.

## Post-fix regression evidence

- tsc clean; vitest **77/77**; crosscheck full grid **77,420 values, 0 failures, worst 0.000000%**; content
  lint **0 errors** (51/51 cited); links **51/51, 0 investigate**; build clean; axe **light 0 / dark 0**
  violations (2 known incompletes); kanban Next up 0.
