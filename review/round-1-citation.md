# Round 1 — Citation audit (role 1: citation auditor)

- Project: `/opt/data/whs-growth-explorer` · Date: 2026-10-02 · Auditor: independent subagent, fresh context (no access to author reasoning; reads repo + web only).
- Scope: **every numeric parameter** in `research/data/parameters.json`; **every graded A–C claim** in `content/*.json` (reasons / flags / rules / products / base) and `research/evidence-table.md`; manufacturer composition claims in `content/products.json`.
- Method: local artifacts under `research/raw/` first (full texts, EPMC records, extracts), then live web re-verification (Europe PMC REST, Crossref, publisher PDFs) for anything the repo copy could not settle. Nothing outside `review/` was modified.

## Summary

| severity | count | ids |
|---|---|---|
| critical | 0 | — |
| major | 3 | F1, F2, F3 |
| minor | 11 | F4–F14 |

Independent source-registry check: **all 33 registry entries carrying a DOI/PMID re-resolved cleanly** against Europe PMC/Crossref on 2026-10-02 (title/year/DOI match; checked programmatically). The 11 URL-only sources were checked against their local fetched artifacts (NICE, WHO, EFSA, NASEM, FAO, PZH, ESPEN-extract, IDDSI, Orphanet, GeneReviews, EMSO… see coverage note). No fabricated sources found.

---

## F1 — MAJOR — `research/raw/fulltext_romano2017.xml` is the wrong paper (artifact mismatch for a heavily used Grade A source)

- Location: `research/raw/fulltext_romano2017.xml`; referenced as the fetched artifact underpinning `romano2017` in `research/sources.json` (line 191 `fetched_file: research/raw/epmc_romano2017.json`) and by 14 content/parameters/evidence uses.
- Evidence checked: opened the XML. Its article title is **"Protein Digestion and Quality of Goat and Cow Milk Infant Formula and Human Milk Under Simulated Infant Conditions"** (PMID 28968291, DOI 10.1097/MPG.0000000000001740) — not the Romano et al. ESPGHAN guideline. Separately, `epmc_romano2017.json` is a 7-result *search list* (`AUTH:"Romano" AND TITLE:"Neurological Impairment"`); the correct Romano record (PMID 28737572, DOI 10.1097/MPG.0000000000001646) is the 7th hit, not a dedicated record fetch. The true guideline text was not present anywhere in the repo.
- Mitigation performed by this audit: I fetched the actual Romano 2017 guideline (publisher paginated PDF via a public university mirror) and verified the claims that cite it (see "Verified" list in coverage). No factual errors were found in those claims. Nevertheless the repo's own verification trail is broken for this source: anyone re-verifying from `research/raw/` will read the wrong document.
- Suggested fix: replace `fulltext_romano2017.xml` with the actual guideline text (or delete it and rename the stray file to its true identity), and point `romano2017.fetched_file` at a real record/full-text artifact.

## F2 — MAJOR — Refeeding-risk banner threshold "weight-for-length/height z ≤ −3" is attributed to sources that do not state it

- Location: `research/data/parameters.json` → `refeeding.risk_flag` (lines 169–174: "weight-for-length/height z <= -3 (severe wasting; the population at high risk in refeeding_children_2025) -> show refeeding-syndrome risk banner"); `content/base.json` → `calc.refeeding_banner` (lines 106–109, "poniżej −3 SD / ostre wyniszczenie"); `content/flags.json` item "now"-4 (lines 36–43, "the tool shows a risk banner when weight-for-length < −3 SD"); sources cited: `da_silva2020`, `refeeding_children_2025`.
- Evidence checked: full ASPEN abstract (`research/raw/epmc_da_silva2020.json`) — criteria are electrolyte-drop based, with no WFL/z threshold. Full text of Mogase 2025 (`fulltext_refeeding_children_2025.xml`) — studies a SAM 6–59 mo population; searched terms `-3 z`, `-3 SD`, `WHZ`, `WLZ`, `severe wasting`, `weight-for-height`, `z score`: **0 hits**; SAM is used as an established category, no numeric z cut-off stated. GOAL.md §4 itself asked to "verify with ASPEN".
- Impact: the -3 z trigger is consistent with the WHO SAM definition (severe wasting) and is conservative, but the registry currently claims source support that does not exist. Low clinical risk; provenance risk.
- Suggested fix: either (a) add an explicit source for the threshold (WHO SAM/WHO severe-wasting definition), or (b) label it as a project operationalisation (grade D / "expert-defined trigger") in parameters.json and in the UI banner text.

## F3 — MAJOR — Infant rule "NEVER concentrate formula / never add modules without supervision" (grade A) is not supported by the cited source (`fewtrell2017`)

- Location: `content/rules.json` → block `infant`, item 1 (lines 26–28), sources `["fewtrell2017"]`, grade `A`.
- Evidence checked: full text of Fewtrell et al. 2017 (ESPGHAN complementary feeding position paper; publisher PDF fetched and searched): contains no statement about concentrating infant formula beyond manufacturer instructions or adding energy/protein modules to infant milk (`concentrat` 1 hit — unrelated; `module` 0; `powder` 0). The paper does support the adjacent rule ("Whole cows' milk should not be used as the main drink before 12 months") and timing/diversity of complementary foods. The AAP/NASPGHAN 2026 faltering-weight materials accessed for this audit do discuss *supervised* higher-calorie formula/human-milk supplementation and fortifying cereals with formula — a related but different practice from unsupervised over-concentration.
- Impact: the advice is safe and is mandated by GOAL.md §1, but a safety rule displayed with a Grade A label currently cites a document that does not contain it.
- Suggested fix: re-source (e.g. WHO/FAO safe preparation guidance for powdered infant formula, or relevant ESPGHAN/AAP guidance on energy-density modification under clinical supervision), or re-grade/label as a project safety rule.

---

## F4 — MINOR — "Diet diaries usually overestimate energy intake": supported, but by the wrong/unlisted source

- Location: `content/reasons.json` → group `intake`, item 3 (lines 42–49), sources `["nice_ng75", "faltering_2026"]`, grade A.
- Evidence: NICE NG75 (local recommendations HTML) recommends keeping a food-intake diary (rec. 1.2.12) but makes no claim about estimation error direction; the AAP guidance page (fetched) only says "estimate the adequacy of calorie intake by comparing observed or recorded consumption…". However, the actual Romano 2017 guideline **does** state it: "caregivers often overestimate the time spent feeding the child and also overestimate the child's caloric intake" (verified in the fetched guideline PDF, JPGN 65(2), near rec. 20). `romano2017` is not among the sources listed for this item.
- Suggested fix: add `romano2017` to the item's sources (the claim itself is fine).

## F5 — MINOR — WHS epilepsy source over-extended: "metabolic load", post-ictal drowsiness, and ASM appetite/drowsiness effects are not in the cited paper

- Location: `content/reasons.json` group `requirements` item 1 (lines 83–91: "…obciążają organizm metabolicznie i mogą zaburzać karmienie (mgła po napadzie, leki)"), group `meds` item (lines 161–170: "Niektóre leki przeciwpadaczkowe mogą zmniejszać apetyt…"), `content/flags.json` item `visit`-2 (lines 93–98: medication review for appetite/drowsiness) — all cite only `whs_epilepsy_2025`, grade C.
- Evidence: full text of Blanco-Lago et al. 2025 (fetched via Europe PMC, PMC12653090): supports seizure frequency (92%), burden/ASM use, and an association of severe epilepsy with feeding difficulties; contains **no** statements on metabolic energy load, appetite effects of ASMs, post-ictal feeding interference, or medication-related drowsiness around meals (`appetite` 0 hits; `feeding` only in the comorbidity sentence).
- Suggested fix: keep the seizure-frequency claims; re-source or reword the mechanism claims (a general ASM side-effect reference or label as extrapolation/clinical experience).

## F6 — MINOR — `sources.json` fetched-artifact hygiene: wrong/misleading `fetched_file` pointers; stray unregistered full texts

- Location: `research/sources.json` — `battaglia2008.fetched_file` points to `research/raw/epmc_battaglia1999.json` (which happens to contain the correct record as its first hit, PMID 18932224, but the filename is confusing); several `fetched_file` values are EPMC **search-result lists**, not item records (`culley1969`, `holliday1957`, `romano2017`); `fulltext_ni2009.xml` is a 500-byte error stub (the usable copy is `wb_pmc2735385.html`). Stray full texts exist that belong to no registry entry: `fulltext_ni_dietary_2015.xml` (PMID 26580646), `fulltext_topten_ni_2020.xml` (PMID 32216797), `fulltext_energy_rationale_2026.xml` (PMID 42148177).
- Evidence: inspected each file's article-id/title; re-resolved the correct records and confirmed all cited titles/DOIs match.
- Suggested fix (documentation only): rename/annotate, and either register or remove the stray full texts.

## F7 — MINOR — `research/evidence-table.md` uses a source_id that does not exist: `who_wfa`

- Location: `research/evidence-table.md` row 35 ("WHO LMS tables (0–60 mo) | who_wfa; who2007ref").
- Evidence: registry contains `who_standards_wfa` and `who2007ref`; `who_wfa` appears nowhere in `sources.json`. (Content/parameters do not use the wrong id.)
- Suggested fix: replace with `who_standards_wfa`.

## F8 — MINOR — Stale "digitization pending" statements (2025 Calhoun curves)

- Location: `research/evidence-table.md` row 2 ("digitization pending"); `research/research-notes.md` §1/§7 and "Open research items" item 1.
- Evidence: the 2025 curves **are** digitized — `research/data/whs_growth/calhoun2025_digitized.csv` (1,269 rows; I verified row count and per-percentile counts 141×9), `provenance_2025.md`, and the site chart uses them (base.json p7 / chart2_note). DECISIONS D-012/D-013 document completion.
- Suggested fix: update the two files to point to the digitized dataset.

## F9 — MINOR — `parameters.json` "pending" list contains three items that are resolvable from already-fetched files

- Location: `research/data/parameters.json` `pending` (lines 182–188).
- Evidence:
  1. "FAO girls 11-12mo kcal/day – value cut by page break": the value **is present** in `research/raw/fao_y5686e05.htm` — girls 11–12 mo requirement = 2.981 MJ = **712 kcal/day** (next to TEE 698 + deposition 14). The parameter's girls array still has `null` where 712 belongs (line 63–64).
  2. "FAO girls child TEE regression equation… extraction pending": the equation **is present** in `research/raw/fao_y5686e06.htm` — "Girls: TEE (MJ/day) = 1.102 + 0.273 kg − 0.0019 kg²".
  3. "PZH children energy tables beyond age 7y (girls) and 12y (boys) — extraction pending": the fetched PZH text contains full tables to **18 y for both sexes** (boys Tabela 4 and girls Tabela 5, plus TABELE ZBIORCZE; e.g. boys 18 y row and girls 18 y row both present).
- Suggested fix: complete the three extractions (or restate the pending note); the girls FAO array should carry 712 unless deliberately conservative.

## F10 — MINOR — Energy-table column labels for ages ≥10 y are misleading (EFSA note and PZH "PAL1.4" key)

- Location: `research/data/parameters.json` line 53 (`pal_columns: ["PAL 1.4","PAL 1.6","PAL 1.8 (10+y also 2.0 in source table)"]`) and lines 79–82 (`children_kcal_per_day_PAL1.4.boys` includes ages 10–12: 1965/2074/2217).
- Evidence: in EFSA Table 14/Appendix 16B, the three AR values for ages 10–17 are PAL **1.6/1.8/2.0** (e.g. 1965 kcal = REE 1196 × 1.6 × 1.01; 1.4 would give ≈1691, and no 1.4 column exists for these ages). Same structure holds in the PZH table (PZH narrative: 10–18 y PAL 1.6–2.0; boys 10 y row 1965/2211/2456 = ratio 1.6/1.8/2.0). So the values for ages ≥10 are pal-1.6-based, not "PAL 1.4".
- Impact: the calculator grid is 0–48 months, so these rows are currently unused; a future extension would mislabel them.
- Suggested fix: correct the label/keys (e.g. per-age-band PAL list) or truncate the arrays at 9 y for the 1.4 series.

## F11 — MINOR — Monitoring intervals ("weigh every 1–2 weeks", "assess after 3–4 weeks", "3–7 day diary") are not in the cited sources

- Location: `content/rules.json` block `monitoring` item 1 (lines 86–88, sources nice_ng75 + faltering_2026); `content/flags.json` item `week`-5 (lines 76–83, "brak przyrostu… przez 3–4 tygodnie"); `content/reasons.json` `intake` item 2 check ("Dzienniczek 3–7 dni").
- Evidence: NICE NG75 recommendations (local HTML) give weighing frequencies that vary with age (daily <1 month, weekly 1–6 mo, fortnightly 6–12 mo, monthly ≥1 y) and recommend a food-intake diary without an interval (rec. 1.2.12). No "3–4 week" or "1–2 week" or "3–7 day" interval found in NG75 or in the accessible AAP CPG materials (abstract + AAP dietary guidance + GuidelineCentral summary).
- Suggested fix: align wording with NG75's age-banded frequency (or add the source that does define the shorter re-check interval).

## F12 — MINOR — "Increased breathing effort raises energy expenditure" and the CHD statement: not verifiable in the cited sources

- Location: `content/reasons.json` group `requirements` item 3 (lines 103–112; sources `battaglia2015`, `feeding_intol_2017`).
- Evidence: Hauer 2017 full text (local) contains no respiratory-effort/energy-expenditure statements (`respiratory` 0, `aspirate` 0 hits). Battaglia 2015 is paywalled; its abstract does not cover this. The claim's CHD part ("WHS hallmark includes heart defects") *is* corroborated inside the repo — `whs_features_2023` full text: "congenital heart defects (31–45%)" — but that source is not cited here, and the respiratory-effort→EE link remains unsourced.
- Suggested fix: add a supporting source for the increased-requirement mechanisms (e.g. `espen_pn_energy`, `ni_nutrition_2025`) or soften to an explicitly flagged extrapolation.

## F13 — MINOR — Two claims overstate what `romano2017` covers (calprotectin; "green/blood-tinged vomit" urgency)

- Location: `content/reasons.json` group `losses` item 2 (lines 67–76 — "Kalprotaktyna, morfologia, żelazo/ferrytyna…"; source `romano2017`); `content/flags.json` item `now`-3 (lines 29–34 — "zwłaszcza treścią zieloną lub podbarwioną krwią"; source `romano2017`).
- Evidence (against the true Romano 2017 text, fetched for this audit): Romano does include blood-count/ferritin/iron/zinc micronutrient assessment and "fecal occult blood" before endoscopy, but mentions **no** calprotectin or faecal-calprotectin pathway, and its vomiting guidance is "persistent gastric stasis and vomiting → imaging to exclude obstruction"; it does not single out bilious/blood-stained vomit as an urgency rule (that is a generic red flag). Both statements are clinically standard; only the attribution is imprecise.
- Suggested fix: keep the clinical content, adjust the source(s) or add a note.

## F14 — MINOR — Product dataset nits

- Location: `content/products.json`; `research/raw/products/fsmp_transcriptions.md`.
- Evidence: (a) `fsmp-resource-junior-liquid` leaves `vita_ug`/`vitd_ug` as null although the manufacturer page (local `nestle_rj_plyn.html`) lists vitamin A 135 µg / vitamin D 1.5 µg per 100 ml; (b) `fsmp_transcriptions.md` still ends with "PENDING (to fetch next): Fortini, Fantomalt, Protifar … Resource Junior …" although those four were subsequently transcribed/verified (I re-verified Fantomalt/Protifar against the Nutricia Katalog 2023 PDF: 384 kcal/96 g carbs/5 g-scoop=19 kcal; Protifar 368 kcal/87.2 g protein/1350 mg Ca/"nie stosować < 3. r.ż." — all match products.json); (c) the GOAL seed list products Fortini, Frebini Energy, PediaSure, NAN Expert HA Pro 2 and MCT oil are absent from `products.json` (DECISIONS D-010/D-011 record this as remaining stretch work; total items = 10 FSMP + 53 foods ≈ 63, so the ~60-item target is met via the foods list).
- Suggested fix: fill the two vitamin fields; refresh/remove the stale PENDING line; decide on the five missing specialist products.

---

## Coverage note

### Audited — parameters.json (ALL numeric parameters)

Every value was diffed against its cited artifact; a machine-check of the full tables matched exactly:

- `energy_healthy.nasem2023_eer` — all 10 equations + growth-energy addends match NASEM 2023 Table S-2 (local extract). ✓
- `energy_healthy.efsa2013_ar` — infants 7–11 mo kcal/day & kcal/kg (boys/girls, all 5 months) and children MJ arrays ages 1–17 both sexes match EFSA Appendix 16/Table 14 exactly (programmatic diff: 0 mismatches); "no DRV for 0–6 mo" note matches EFSA text; Appendix-16 note matches. Labels for 10+ rows: see F10.
- `energy_healthy.fao2004` — infant monthly boys (12/12) and girls (11/11 present) match Table 3.2; children 1–5 y values match Table 4.x (both sexes); boys child TEE equation matches; catch-up "21 kJ (5 kcal)/g" quote and attribution match (ch. 4). Girls value 712 available but listed pending (F9); girls TEE equation available but listed pending (F9).
- `energy_healthy.pzh2024` — infants 6–11 mo and children PAL-1.4 values match PZH 2024 tables exactly (checked for boys 1–12 y, girls 1–7 y; full tables to 18 y exist, F9). PAL-band statement matches. ✓
- `bmr_ree.schofield_1985_weight_height` and `henry_2005_weight_height` — all 12 equations verbatim EFSA Appendix 13 (incl. the Henry boys-3–10 kcal "likely error" footnote). ✓
- `krick_method` — tone 0.9/1.0/1.1; activity 1.15/1.2/1.25/1.3; growth 5 kcal/g; BSA-based original formula; all match Sullivan 2009 Table 1 (local Wayback copy) and Krick 1992 scope. ✓
- `height_based_kcal_per_cm` — 14.7/13.9/11.1 match Sullivan Table 1; ranges 12–15/10–11/6–9 match Hauer 2017 full text. ✓
- `fluids.holliday_segar` — 100/50/20 ml/kg re-confirmed (classic; registry record resolves to Holliday & Segar 1957, PMID 13431307). ✓
- `catchup` — energy cost default 5 / gross 4.1–6.0 / individual 1.2–5.7 all match TRS 935 ("individual values ranging from 1.2 kcal/g to 5.7 kcal/g"; gross costs 4.10/5.99); rate limits quote matches FAO ch. 4 verbatim in substance. Table-38 rows (1→20 g/kg/day; 1.02–4.82 g/kg/day; 89–167 kcal/kg/day; 4.6–11.5%) match TRS 935 Table 38 exactly. ✓ (threshold caveat: F2)
- `protein` — safe levels Table 47 to 4–6 y match exactly (g/kg and g/day both sexes). ✓
- `micronutrients_poland` — Fe EAR/RDA 7/11, 3/7, 4/10; Zn 2.5/3, 2.5/3, 4/5; vit D AI 10/15/15 µg all match PZH tables; supplementation 400/400–600/600/600–1000 IU matches Płudowski 2023 text. ✓
- `refeeding.aspn_diagnostic_criteria` — matches ASPEN abstract verbatim in substance (10–20/20–30/>30% within 5 days). ✓ `faltering_weight_definition` — matches AAP/NASPGHAN abstract (−1.65 z; velocity <−2 z <2 y; ≥1 z decline). ✓ `risk_flag` — see F2.
- `safety_thresholds.nice_ng75_centile_spaces` — matches NG75 recommendations (verbatim thresholds incl. birthweight bands). ✓

### Audited — content claims

- `content/reasons.json` — all A, B and C items audited (13 of 15 items; D items `measurement` and `endocrine`-2 not audited per brief). Romano-citing items were checked against the actual guideline text fetched for this audit: feeding difficulties/mealtime prolongation (>30 min/feed, 3–6 h/day), caregiver overestimation, GERD PPI-first-line + thickening as adjunct, videofluoroscopy for suspected aspiration, SLP intervention for consistency modification, tube-feeding indications, dental/drooling contributions — all corroborate the items (F4, F13 caveats aside). Hauer 2017 items verified (kcal/cm ranges; over-feeding; food additives without osmotic load). WHS items verified against the respective papers (F5 caveat).
- `content/flags.json` — all A, B, C items audited (11 of 13; D items `now`-1 and `visit`-4 not audited). Faltering z-criteria verified against the AAP abstract; refeeding symptoms vs ASPEN; NG75 thresholds — see F2/F5/F11/F13 for caveats.
- `content/rules.json` — all items audited (15/15, incl. the D/B "thickening lowers energy per ml" item — consistent with IDDSI/EFSA as flagged). See F3/F11 for caveats.
- `content/base.json` — method p1–p7 + calc banner audited. p4/p7 digitization claims verified against `provenance.md` and `provenance_2025.md` (row counts 340 and 1,269 confirmed; Antonius paper text means (1.9/2.1 kg birth; 9.8/9.7 kg at 4 y; 43.0/41.5 cm; 87.2/85.8 cm) match the provenance anchor table; "median length within 0.2 cm" claim matches provenance). p5 "no WHS energy-expenditure studies" re-checked live on Europe PMC ("Wolf-Hirschhorn" AND "energy expenditure": 11 hits, none relevant) — corroborated. ✓
- `content/products.json` — all 10 specialist products' composition numbers checked: Nutridrink dla dzieci verified against the live manufacturer page (240 kcal, 10.9/28.5/2.4/5.7, Na 89, K 221, Ca 166–168→167, Fe/Zn 2.4, vit A/D 105/3.1); Resource Junior liquid + powder verified against the local manufacturer-page copies (152/468 kcal, 6.2/18.3 fat, 21/60.7 carbs, 3.0/13.9 protein, Ca 125/380, Fe 1.3/4.8, Zn 1.3/3.3, Na 75/225, K 200/560, dosing 55 g→250 ml / 80 g→250 ml); Fantomalt + Protifar verified against the Nutricia 2023 catalogue PDF text; Infatrini liquid/powder + Nutrini family verified against the project transcription (nutrient-declaration images on file) and partially live (Infatrini page: 2.6 g protein/100 kcal, 10 E% protein). F14 caveats.
- `research/evidence-table.md` — all 40 rows reviewed; claim→source mapping is accurate for rows 1–40 except the F7 dangling id (row 35) and the F8 stale note (row 2). Grade assignments are consistent with GOAL §1 definitions (Culley 1969/Krick 1992 as B; da Silva/faltering/EFSA/FAO/NASEM as A; ds_nutrition as D-applied; refeeding_children as A/B — acceptable).

### Audited — source registry

- 33/33 DOI/PMID-bearing entries re-resolved (Europe PMC by PMID or Crossref by DOI); titles/years/journals match the citations. 11/11 URL-only entries have local fetched artifacts; spot checks of content: NICE NG75 recommendations text, Pludowski XML, FAO chapters, EFSA PDF-derived extract, NASEM extract, PZH PDF text, WHO LMS JSONs (boys/girls/fwl spot values match WHO expanded tables), IDDSI page (fetched; not deep-read — no numeric claims depend on it).

### Not audited / left for others (explicit list)

1. **D-grade content items** (per brief): `reasons` `measurement` + `endocrine`-2; `flags` `now`-1 + `visit`-4; base strings without numeric claims.
2. **`research/data/products_foods.json` (53 USDA-sourced everyday foods)** — outside the declared content/*.json scope; spot-checked 3 items (canola oil 884 kcal, butter 717 kcal, heavy cream 340 kcal) against the raw SR Legacy CSVs — match. Remaining 50 items not individually checked.
3. **Full-text verification depth**: `battaglia2015`, `battaglia2008`, `zollino2008`, `hanley1998`, `krick1992`, `culley1969`, `schofield1985`, `antonius2008` (paper text used, digits checked), `faltering_2026` (abstract + AAP/GuidelineCentral summaries; full CPG paywalled), `cp_protein_2026`, `borsani2023`, `cp_preschool_energy`, `espen_pn_energy`, `ds_nutrition_2025`, `ree_rehab_2026`, `ni_nutrition_2025`, `whs_oral_2020`, `whs_features_2023`, `whs_gh_2026` — verified at abstract level and/or by corroboration inside the repo; deep full-text line checks were done only where claims were specific/load-bearing (documented above).
4. **Calculator math, digitization numeric accuracy, UX/i18n, clinical safety** — other reviewer roles. (Digitization: only anchor-level spot checks were possible within time; provenance files self-document the full error protocol.)
5. **Unused registry sources (informational)**: `energy_deposition1981`, `ni_nutrition_2025`, `whs_features_2023` appear only in research notes (not cited in content/evidence/parameters/calculator); `who_standards_wfa` is used only via the wrong id in evidence-table row 35 (F7). Content lint's "44/44 cited" counts research notes, which explains the discrepancy.

### Verified-clean highlights (for the parent agent)

- No fabricated citations; all DOIs/PMIDs live and resolve; no misattributed *factual* values found — every numeric parameter value matched its source once located.
- All numeric tables (EFSA/FAO/PZH/NASEM/TRS-935/NG75/PZH-micro) verified programmatically or by targeted text extraction with zero unexplained discrepancies.
- The three "major" findings are provenance/attribution problems (F1 artifact mismatch, F2 unverified threshold wording, F3 wrong source on a safety rule), not wrong facts; F1's substantive claims were re-verified against the true guideline during this audit.
