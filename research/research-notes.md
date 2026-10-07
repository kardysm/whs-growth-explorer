# Research notes — WHS Feeding & Growth Explorer (EN; draft v1, 2026-10-02)

Every claim below carries its `source_id` (see `research/sources.json`) and evidence grade (A = guideline/systematic review; B = cohort in NI/syndromic population; C = WHS case series/descriptive; D = expert opinion or extrapolation).

## 1. WHS phenotype, growth and clinical course

- WHS (4p16.3 deletion) growth charts exist for 0–4 years from 101 patients (mean ± SD per age band): mean birth weight 1.9 kg (girls) / 2.1 kg (boys); mean birth length 43.0 / 41.5 cm; at 4 years, mean weight 9.8 / 9.7 kg, mean height 87.2 / 85.8 cm. `antonius2008` (C)
- Extended curves covering birth–18 years (puberty/adult height) were published in 2025 on additional patients; CC BY-NC-ND open access. Digitized by this project (1,269 points; research/data/whs_growth/calhoun2025_digitized.csv). `growth2025` (C)
- Growth profiles of 34 Japanese patients (LMS/descriptive data; 15 mo–24 y) provide an independent cross-check of the growth-restriction pattern. `shimojima2012` (C)
- Natural history / phenotype series: 87 patients `battaglia2008` (C); review/update `battaglia2015` (C); genotype–phenotype and diagnostic criteria on 80 patients `zollino2008` (C); disease summary `orphanet280` (C).
- The GeneReviews chapter NBK1183 is RETIRED (historical reference only) — do not cite for current management. `gene_reviews` (C, retired)
- Selected clinical features feeding back into nutrition/energy: antibody deficiency/infections `hanley1998` (C); epilepsy cohort `whs_epilepsy_2025` (C); follow-up features infant→teenager `whs_features_2023` (C); oral manifestations `whs_oral_2020` (C); growth-hormone deficiency case(s) treated with rhGH `whs_gh_2026` (C).

## 2. Feeding, dysphagia, GI issues in WHS / NI context

- **Negative result (important): no studies of energy expenditure or energy requirements in WHS exist** (Europe PMC, 10 protocol queries, see `research/search-log.md`). All WHS energy estimates in this project are therefore grade D extrapolations (see §3). (search-log)
- Feeding difficulties, GERD, constipation and faltering growth are core features of the NI population (including syndromic hypotonia); multidisciplinary assessment and treatment algorithms are specified in the ESPGHAN guideline. `romano2017` (A)
- Practical feeding strategies for severe CNS impairment (positioning, texture, feeding intolerance, tube considerations): `feeding_intol_2017` (B/review).
- Oral/dental and oral-motor issues in WHS can reduce effective intake: `whs_oral_2020` (C).
- Texture modification framework for dysphagia: IDDSI 2.0 (levels 0–7). `iddsi` (A/framework). Thickening ADDS energy rather than lowering it (thickeners are starch/gum/maltodextrin; added starch substantially elevates the caloric content of feeds — `starch_thickening_2026`; Nutilis Clear ≈ 290 kcal/100 g) — corrected 2026-10-07 (audit M7, D-058).

## 3. Energy estimation methods (verified constants)

- **Krick-type method** (NI children): kcal/day = (BMR × muscle-tone factor × activity factor) + growth factor. Verified factor values: tone 0.9 decreased / 1.0 normal / 1.1 increased; activity 1.15 bedridden / 1.2 dependent / 1.25 crawling / 1.3 ambulatory; growth 5 kcal/g of desired gain. Krick's original BMR was BSA-based. Values as tabulated in `cps2009_marchand` (B; CPS 2009 statement — previously miscredited to „Sullivan 2009”, corrected 2026-10-07, D-054), method from `krick1992` (B).
- **Height-based (Culley-type) kcal/cm values**: 14.7 (no motor dysfunction), 13.9 (ambulatory with motor dysfunction), 11.1 (nonambulatory) — as tabulated in `cps2009_marchand` (citing Culley & Middleton 1969, `culley1969`); wider ranges (12–15 / 10–11 / 6–9 kcal/cm) from `feeding_intol_2017`. Derivation range **5–11 years** (`wittenbrook2011`); the figure was REMOVED from the calculator 2026-10-07 (audit H3, D-054) — a 0–48 mo tool has no valid display window for it. (B/D)
- **BMR equations (Schofield 1985, weight+height; verbatim from EFSA Appendix 13)** and Henry (2005) alternatives: `schofield1985`, `efsa_energy`. (B)
  - Boys <3 y: REE = 0.167×W + 1517.4×H − 617.6 (MJ: 0.0007 W + 6.349 H − 2.584); girls <3 y: 16.25×W + 1023.2×H − 413.5.
- **Healthy-children reference energy**: EFSA 2013 ARs (infants 7–11 mo monthly: boys 636→742 kcal/day; children yearly, PAL 1.4–2.0) `efsa_energy` (A); Polish Norms 2024 tables compatible with EFSA, plus NASEM-2023 EER equations (Table S-2; age in years) `nasem2023` (A); FAO/WHO/UNU 2004 monthly infant values and per-year child values `fao2004` (A) — child values anchored at the MID-YEAR of each band per FAO §4.4 („median weight at the midpoint of each year of age … 1.5, 2.5 … years”; audit M1 fix 2026-10-07).
- REE-prediction accuracy in CP is limited (existing formulas diverge from measured REE) — a caution flag on all formula-based estimates: `borsani2023` (B); energy requirements measured in preschool CP: `cp_preschool_energy` (B); NI nutrition-management evolution review: `ni_nutrition_2025` (A/review).
- Down-syndrome nutrition review (hypotonia proxy; explicitly flagged as extrapolation): `ds_nutrition_2025` (D when applied to WHS).

## 4. Catch-up growth and refeeding

- Energy cost of tissue deposition: FAO/WHO/UNU 2004 uses **21 kJ (5 kcal) per gram** laid down, citing Fomon 1971; Ashworth 1969; Kerr 1973; Whitehead 1973; Spady 1976; Krieger & Whitten 1976 — `fao2004` (A). Measured variation 1.2–5.7 kcal/g; gross deposition costs 4.10–5.99 kcal/g (typical vs high-fat) — `who_protein2007` Table 38 (A). Spady measured ~3.3 kcal/g during recovery — `spady1976` (B); energy-deposition studies during malnutrition recovery: `energy_deposition1981` (B); `ashworth1969` (B); scoping review of REE during rehabilitation: `ree_rehab_2026` (A).
- Catch-up protein/energy needs at gain rates 1–20 g/kg/day (protein 1.02–4.82 g/kg/day; P/E 5.2–11.5%): `who_protein2007` Table 38 (A).
- Safe protein intakes (g/kg/day): 0.5 y 1.31; 1 y 1.14; 1.5 y 1.03; 2 y 0.97; 3 y 0.90; 4–6 y 0.87 — `who_protein2007` Table 47 (A). Protein intakes in CP (considerations): `cp_protein_2026` (B).
- Refeeding syndrome: definition/severity by electrolyte drops (10–20% mild; 20–30% moderate; >30% + organ dysfunction severe) within ~5 days of reintroduction; monitor electrolytes, thiamin: `da_silva2020` (A, abstract-level). Severe acutely malnourished children (6–59 mo) are the high-risk group; cautious reintroduction: `refeeding_children_2025` (A/B).
- Faltering-growth identification: z-score based criteria (WFL/WH < −1.65 z; weight velocity < −2 z under 2 y; drop ≥1 z) — `faltering_2026` (A); NICE thresholds and management pathway (centile crossing, food diary, referral): `nice_ng75` (A).

## 5. Fluids

- Maintenance water by Holliday–Segar: 100 ml/kg/day for first 10 kg, +50 for next 10, +20 beyond — `holliday1957` (B/classic). Used only as a comparison bound for feed volume.

## 6. Micronutrients (Poland)

- Vitamin D: AI 10 µg/day (infants 6–11 mo) and 15 µg/day (children 1–3 y) — `pzh2024` (A); supplementation guidance in Poland (400 IU 0–6 mo; 400–600 IU 6–12 mo; 600 IU 1–3 y) — `pludowski2023` (A).
- Iron: EAR/RDA 7/11 mg/day (6–11 mo) and 3/7 mg/day (1–3 y) — `pzh2024` (A).
- Zinc: EAR/RDA 2.5/3 mg/day (6–11 mo and 1–3 y) — `pzh2024` (A).
- Complementary feeding principles (when/how to introduce solids; texture progression): `fewtrell2017` (A).
- Seasonings/herbs for children's meals (flavour with warnings where needed): coumarin TDI 0.1 mg/kg bw/day; cassia cinnamon ~3000 mg coumarin/kg; a 15-kg child reaches the TDI with ~0.5 g cassia/day (`bfr_coumarin`, B); no added sugar/salt in complementary foods (`fewtrell2017`, A). Basis for the seasonings block in the products list (user batch 2026-10-07).

## 7. Interpretation notes used by the calculator

- WHO Child Growth Standards (0–60 mo; LMS), incl. weight-for-length/height, are used for: healthy reference weights (A/B methods), weight-age inversion, ideal weight for length (method 2 of catch-up). `who_wfa` etc. (A)
- The WHS lines in the app are digitized from `antonius2008` figures; the 2025 extension (Calhoun 2025) is also digitized; see provenance.md and provenance_2025.md for error bounds and caveats. (C)
- The calculator never outputs a single number: each method is a band; the healthy-vs-WHS spread is the dominant uncertainty (see REPORT.md).

## Open research items (next pass)

1. Digitize `growth2025` curves (weight/length panels) for ages >4 y.
2. Extract WHS-specific feeding/gastrostomy data from the 2023–2026 WHS cohort papers (full texts).
3. Extend PZH extraction (children >7 y tables) once the site needs them; verify EFSA vs PZH differences per age band.
4. Draft content for sections 5–8 (reasons/red flags/rules/products) with per-item sources; then run §7 audits.
