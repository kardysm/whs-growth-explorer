# Search log — §2.2 search protocol (Europe PMC)

- Database: Europe PMC REST API (`resultType=core`, pageSize=25 per query, relevance sort).
- Date run: 2026-10-02. Raw responses: `research/raw/epmc_search_q*.json`; full screening table: `research/search-protocol-dump.md`.
- Screening basis: titles (and abstracts where needed) vs. inclusion criteria — WHS-specific growth/feeding/clinical data; pediatric energy/nutrition methods applicable to WHS (NI/CP/hypotonia proxies); growth faltering / catch-up / refeeding guidance and standards. Bulk exclusion classes are given per query.

## q1 — `"Wolf-Hirschhorn" AND (feeding OR growth OR nutrition OR gastrostomy OR weight OR dysphagia OR reflux)` — hits 1527
Included:
- pm40156374 — Extended Growth Curves (4p-) [seed, = growth2025]
- pm41017003 — WHS + GH deficiency, rhGH response [whs_gh_2026]
- pm41303083 — Epilepsy in WHS pediatric cohort [whs_epilepsy_2025]
- pm37576793 — WHS features infant→teenager [whs_features_2023]
Excluded (bulk): prenatal/fetal case reports; unrelated-comorbidity case reports; molecular/animal studies; other-disease nutrition papers. Reason: no bearing on feeding/growth management.

## q2 — `("4p- syndrome" OR "4p deletion") AND growth` — hits 255
Included: pm40156374 (growth2025), pm37576793 (features).
Excluded (bulk): prenatal diagnostics; duplication syndromes; genetics-only reports; overlap with q1 (pm36526544 WHS epilepsy review — covered by pm41303083).

## q3 — `("energy expenditure") AND (hypotonia OR "neurological impairment" OR "cerebral palsy") AND children` — hits 1746
Included: pm42238674 — protein intake in CP [cp_protein_2026].
Note: core NI/CP energy sources were already seeded (borsani2023; cp_preschool_energy; romano2017).
Excluded (bulk): rehabilitation/gait/robotic-training studies; adults; diagnostics.

## q4 — `"Down syndrome" AND "energy expenditure"` — hits 661
Included: pm40941574 — nutrition for children with Down syndrome [ds_nutrition_2025; hypotonia proxy — extrapolation flagged].
Excluded: adult DS exercise/weight studies; Williams-syndrome REE (other condition, noted); mouse models.

## q5 — `"catch-up growth" AND energy AND children` — hits 2783
Included: pm42766671 — REE in malnourished children during rehabilitation (scoping review) [ree_rehab_2026].
Excluded (bulk): stunting/animal/natural-product studies; cardiometabolic follow-up; RUTF efficacy trials without energy-cost data.

## q6 — `("failure to thrive" OR "faltering growth") AND guideline` — hits 1859
Included: pm41833317 — clinical practice guideline for faltering weight [faltering_2026].
Excluded: unrelated guidelines; case reports. (NICE NG75 already seeded.)

## q7 — `"Wolf-Hirschhorn" AND (energy OR calories OR "energy expenditure" OR "nutritional status")` — hits 261
Included: none.
**Key negative result (recorded):** no WHS-specific energy-expenditure or calorie-requirement study exists in Europe PMC (screened set). Screening confirmed: matches are about other conditions (kidney nutrition), molecular/animal work, or case reports without energy data. ⇒ Energy requirements for WHS must be extrapolated from NI/CP/hypotonia populations and labelled grade D where WHS-specific data are absent. (GOAL.md §1 "Search to confirm.")

## q8 — `"Wolf-Hirschhorn" AND (gastrostomy OR "tube feeding" OR dysphagia)` — hits 95
Included: pm33158290 — oral manifestations of WHS [whs_oral_2020].
Excluded: generic PEG-safety studies; single airway-management case report; congenital-anomalies gastrostomy registry (not WHS-specific).

## q9 — `"energy requirements" AND ("neurological impairment" OR "cerebral palsy") AND children` — hits 321
Included: pm38196166 — evolution of nutrition management in severe NI/CP [ni_nutrition_2025].
Excluded: condition-specific formula trials; growth-chart studies in other populations.

## q10 — `("refeeding syndrome") AND children AND (consensus OR guideline OR recommendations)` — hits 453
Included: pm41007088 — refeeding syndrome in severely malnourished children 6-59 mo [refeeding_children_2025].
Excluded: adult ICU refeeding studies; case reports. (ASPEN da_silva2020 already seeded.)

---
All included sources were fetched and verified the same day (see `research/sources.json`, `research/raw/epmc_ext_*.json`).
