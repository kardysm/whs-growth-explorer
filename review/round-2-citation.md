# Round 2 — Citation & provenance audit (role: citation auditor)

- Project: `/opt/data/whs-growth-explorer` · Date: 2026-10-02 · Auditor: independent subagent, round 2 (fresh context; repo artifacts + live web only). Nothing outside `review/` was modified.
- Scope: (i) verify the round-1 citation/provenance fixes — all critical+major (C-M1…C-M3) and the six specifically named items; (ii) NEW checks — live re-resolution of a random sample of 8 DOI/PMID sources, deep audit of grade A/B claims not deep-checked in round 1, and every use of the round-1-edited source ids (`who_pif2007`, `who_sam_2009`, `aap_botulism`, `fewtrell2017`) in `content/`.
- Method: local artifacts first (pypdf full-text extraction of all three key PDFs — Romano 23/23 pages and SAM 12/12 with extractable text, PIF 30/32 pages with text (last two blank); regex/graph checks over `content/*.json` + `research/**` with Python), then live Crossref / Europe PMC REST re-resolution (run 2026-10-02). Site not rebuilt (not needed for this role).

## Summary

| severity | count | ids |
|---|---|---|
| critical | 0 | — |
| major | 1 | R2-F1 |
| minor | 4 | R2-F2 – R2-F5 |

Plus one cross-role observation (claimed UX fix not applied — §5).

**Top issues:** (1) two grade-A claims about diarrhoea/malabsorption are attributed to `romano2017`, which does **not** cover them (full-text systematic absence) — R2-F1; (2) the `parameters.json` pending note falsely says the FAO girls TEE equation was "not recovered from the fetched copy" — it is present in `fao_y5686e06.htm` — R2-F3; (3) "one at a time and in small amounts" in the infant-allergen rule is not in Fewtrell 2017 — R2-F2.

---

## 1. Round-1 verification (named fixes)

### V1 — `romano2017_guideline.pdf` is the true guideline, and ≥3 citing claims are supported — **PASS** (with one new defect → R2-F1)

Identity (extracted text, 23 pp., ~142 k chars): title page reads *"European Society for Paediatric Gastroenterology, Hepatology and Nutrition Guidelines for the Evaluation and Treatment of Gastrointestinal and Nutritional Complications in Children With Neurological Impairment"*; authors *Claudio Romano, Myriam van Wynckel, … Frédéric Gottrand*; footer *"(JPGN 2017;65: 242–264)"*; *"DOI: 10.1097/MPG.0000000000001646"*. Matches the registry entry exactly. The stray wrong-paper XML is gone (`research/raw/fulltext_romano2017.xml` no longer exists; the only leftover reference is a historical log pointer in `research/seed_fetch_results.json` line 394 — harmless).

Claims citing `romano2017` in `content/*.json` that **are** supported (checked 6; requirement ≥3):

| # | location (grade) | claim (abridged) | evidence in guideline |
|---|---|---|---|
| a | `reasons.json` intake-3 (A) | diaries "by eye" overestimate intake | "caregivers often overestimate the time spent feeding the child and also overestimate the child's caloric intake" (p. 256, "Does Feeding Times Compete With Rehabilitation?") |
| b | `reasons.json` losses-1 (A) | reflux common in NI; needs treatment, not just thickening | "GORD is a problem commonly seen in children with NI…" (p. 253); rec. 14a — thickening "in addition to other therapeutic options"; rec. 14b — "use of proton pump inhibitors as the first-line treatment" (p. 245) |
| c | `flags.json` week-3 (B) | meals >30–40 min signal difficulty | "total feeding time … between 3 and 6 hours or >30 minutes per feed is considered as excessive" (p. 256; source says ">30", item says "30–40" — nit only) |
| d | `flags.json` week-4 (B) | silent aspiration signs → swallow assessment | "sialorrhea, coughing, multiple swallows, gurgly voice, wet breathing, gagging, and choking" (p. 251); "VFS … to identify … silent aspiration in the diagnostic work-up" (p. 251); "recurrent pulmonary infections as sign of aspiration" (p. 258). Nits: "hoarseness" and "FEES" are not literally in the source ("wet/gurgly voice", VFS are) |
| e | `rules.json` ladder step 3 (A) | tube feeding when steps fail / aspiration / undernutrition | "Tube feeding is indicated in cases of inadequate oral intake … prolonged or stressful oral feeding, recurrent pulmonary infections as sign of aspiration, or food refusal which do not respond to noninvasive nutritional support" (p. 258) + rec. 25 |
| f | `rules.json` ladder step 1 (B) | enrich foods with butter/oil/cream | "additional fat or oils (eg, high fat spreads), dry milk powders, cream, or ice cream may be supplemented" (p. 255) |

**New defect found in the same sweep:** the two diarrhoea/absorption claims do **not** check out — see R2-F1. Round-1's resolution note "all claims citing this source re-verified" (C-M1) is therefore not fully accurate.

### V2 — `who_pif2007.pdf` contains the concentrate-formula preparation sentence — **PASS**

PDF identity: *"Safe preparation, storage and handling of powdered infant formula — Guidelines"*, WHO in collaboration with FAO, ISBN 978 92 4 159541 4, © WHO 2007. Sentence present verbatim (preparation step 5, PDF pp. 13 and 21): *"5. To the water, add the exact amount of formula as instructed on the label. Adding more or less powder than instructed could make infants ill."* `rules.json` infant item quotes the second sentence exactly (11-word quote, within policy) and the PL translation is faithful. Caveat: the same item's second sentence (modules only under clinical supervision) is not in PIF — R2-F4 (minor).

### V3 — `who_sam_2009.pdf` defines severe wasting as WHZ < −3 SD — **PASS**

PDF identity: *"WHO child growth standards and the identification of severe acute malnutrition in infants and children — A Joint Statement by WHO and UNICEF"* (2009). BOX 1 "DIAGNOSTIC CRITERIA FOR SAM IN CHILDREN AGED 6–60 MONTHS": *"Severe wasting — Weight-for-height < -3 SD"*; body: *"recommend the use of a cut-off for weight-for-height of below -3 standard deviations (SD) of the WHO standards"*. Cited correctly by `flags.json` item now-4 ("screening threshold from the WHO/UNICEF severe-wasting definition; clinical state and electrolytes decide") and by `parameters.json` `refeeding.source_ids` / `risk_flag`. Scope caveat → R2-F5.

### V4 — `aap_botulism.html` supports the honey rule — **PASS**

Fetched page (HealthyChildren.org, 194 KB): *"Honey is another source of botulism spores and should be avoided in babies under 12 months of age."* and *"The American Academy of Pediatrics (AAP) recommends that you do not give honey to a baby younger than 12 months."* The `rules.json` infant honey item (A) matches; the product-side warning also exists: `src/data/products_foods.json` `food-honey` carries tag `age-12plus` and a bilingual warning. (Grade-A labelling of an AAP consumer page is acceptable here — the page states the AAP policy-level recommendation itself.)

### V5 — every `fetched_file` path exists on disk — **PASS, 0 missing**

Programmatic check of `research/sources.json`: 47 entries / declared count 47; **all 47 `fetched_file` values resolve to existing files — none missing, none null**; all `verified: true`; no duplicate ids. `research/sources.json` and `src/data/sources.json` are byte-identical (diff empty), so the shipped site copy carries the corrected pointers. Two `fetched_file` values are EPMC search-list artifacts (`culley1969`, `holliday1957`) but both notes disclose this explicitly — acceptable.

### V6 — `parameters.json` state after round 1 — **PASS with one documentation defect (R2-F3)**

- (a) **FAO girls 712** — present: `fao2004.infants_monthly_kcal_per_day.girls[11] = 712` with note "filled in round-1 audit". Raw source confirms: `fao_y5686e05.htm` contains the girls 11–12 mo row (2.981 MJ / 712 kcal). ✓
- (b) **EFSA month-6 PZH values** — present: `month_6_pzh {male: 597, female: 549}`; PZH raw text line 1121: "6 7,9 2,5 597 7,3 2,3 **549**". ✓
- (c) **Girls year-3 = 1096 semantics** — EFSA Table 14: girls 3 y AR = 4.6 MJ/day = **1,096 kcal/day** (kcal column "1,096"); `src/calc/energy.ts` EFSA series `girls: {1: 712, 2: 946, 3: 1096, …}`; test `"girls 30 mo interpolates 946..1096 -> 1021 (audit F3 fix)"`. The parameters file itself stores the MJ value `[4.6]` and keeps PZH's own girls year-3 = **1088** (PZH raw "3 95,1 13,9 4,6 1088") — both source-correct; the 1096 kcal figure lives in code/tests, not as a parameters.json literal. ✓
- (d) **PAL relabel** — `pal_columns` = `["PAL low: 1.4 (<=9y) / 1.6 (10+y)", "PAL mid: 1.6 (<=9y) / 1.8 (10+y)", "PAL high: 1.8 (<=9y) / 2.0 (10+y) - relabelled in round-1 audit"]` — matches EFSA Table 14 structure (1.4 only ≤9 y; 1.6/1.8/2.0 for 10 y+). ✓
- (e) **Updated pending list** — 4 items; the FAO-712 item is resolved/removed; the PZH beyond-range item reworded to "values present in the fetched raw copy; not used by the 0-48mo scope". BUT item 2's justification is factually wrong → R2-F3.

Tangential confirmations (cheap, same pass): content lint 0 errors / 0 warnings, 47/47 sources cited; C-m4 `romano2017` added to intake-3 sources ✓; C-m6 evidence-table row 35 now `who_standards_wfa` ✓; C-m7 no "digitization pending" text remains ✓; C-m13 no composite grades in content, grade legend present in `base.json` ✓.

---

## 2. NEW — live re-resolution of a random sample of 8 sources

Random sample (seed 20261002) from the 34 DOI/PMID-bearing entries (of 47 total); each re-resolved live against Crossref (DOI) and Europe PMC (PMID) on 2026-10-02. **All 8 matched on title/journal; all DOI↔PMID pairs agree.**

| id | DOI / PMID | Crossref | Europe PMC | verdict |
|---|---|---|---|---|
| culley1969 | 10.1016/s0022-3476(69)80262-3 / 5804183 | ✓ 1969 | ✓ 1969 | clean |
| krick1992 | 10.1111/j.1469-8749.1992.tb11468.x / 1612207 | ✓ 1992 | ✓ 1992 | clean |
| whs_epilepsy_2025 | 10.3390/jcm14228044 / 41303083 | ✓ 2025 | ✓ 2025 | clean |
| schofield1985 | PMID 4044297 (no DOI) | — | ✓ 1985 | clean |
| whs_gh_2026 | 10.1007/s42000-025-00722-7 / 41017003 | 2025 (online-first) | ✓ 2026 (issue) | metadata-only year nuance; registry year 2026 matches EPMC/issue |
| borsani2023 | 10.3389/fped.2023.1097152 / 37681200 | ✓ 2023 | ✓ 2023 | clean |
| shimojima2012 | 10.3233/pge-2012-007 / 27625799 | 2015 (re-deposit year) | ✓ 2012 | metadata-only year nuance; registry year 2012 matches EPMC and the journal citation |
| espen_pn_energy | 10.1016/j.clnu.2018.06.944 / 30078715 | ✓ 2018 | ✓ 2018 | clean |

## 3. NEW — claim audits (grade A/B, not deep-checked in round 1)

Claims below were only corroborated at abstract/adjacent level in round 1, or were added by round-1 fixes. Verdicts against the cited full texts.

| # | location (grade) | sources | verdict | evidence |
|---|---|---|---|---|
| 1 | `reasons.json` intake-1 (B) | romano2017, feeding_intol_2017, whs_oral_2020 | supported | Romano p. 256: children "may eat slowly and spill part of food"; "prolonged feeding times"; "overestimate the child's caloric intake". "Sucking weakens at end of meal" is a light generalization; ok |
| 2 | `reasons.json` intake-2 (B) | romano2017, feeding_intol_2017 | supported | ">30 minutes per feed is considered as excessive" (p. 256); "food refusal" in tube-feeding indications (p. 258) |
| 3 | `reasons.json` losses-1 (A) | romano2017 | supported | see V1(b) |
| 4 | `reasons.json` losses-2 (A) | romano2017 | **NOT supported → R2-F1** | see finding |
| 5 | `reasons.json` reference-1 (A) | faltering_2026, nice_ng75, antonius2008 | supported as project operationalisation | z-criteria source was r1-verified; item describes the tool's own WHS-chart behaviour (now implemented); no new numeric claim |
| 6 | `flags.json` now-2 (B) | feeding_intol_2017, romano2017, iddsi | partially supported | choking/gagging and the aspiration pathway are in Romano (pp. 251/258); "cyanosis/apnoea" and the stop-feeding imperative are generic safety framing, not source text |
| 7 | `flags.json` week-3 (B) | romano2017, feeding_intol_2017 | supported | see V1(c) |
| 8 | `flags.json` week-4 (B) | romano2017, iddsi | supported (nits) | see V1(d) |
| 9 | `flags.json` week-5 (A) | romano2017 | **NOT supported → R2-F1** | see finding |

### Check of the round-1-edited strings (`who_pif2007`, `who_sam_2009`, `aap_botulism`, `fewtrell2017` in `content/`)

All uses found (5 total; no other content file references these ids):

| location | use | verdict |
|---|---|---|
| `rules.json` infant-①(`who_pif2007`) | never over-concentrate; add exact amount | supported (verbatim); modules clause → R2-F4 |
| `rules.json` infant-②(`aap_botulism`) | no honey < 12 mo | supported (V4) |
| `rules.json` infant-③(`fewtrell2017`) | allergens window, one at a time, don't delay | partially supported → R2-F2 |
| `rules.json` infant-④(`fewtrell2017`) | cow's milk not main drink in year 1 | supported: "It should not be used as the main drink before 12 months of age, although small volumes may be added to complementary foods" (Fewtrell 2017, Content recommendations) |
| `flags.json` now-④(`who_sam_2009`) | banner at WLZ < −3 SD | supported (V3); scope caveat → R2-F5 |

---

## 4. Findings

### R2-F1 — **MAJOR** — Diarrhoea/malabsorption claims attributed to `romano2017`, which does not cover them

- Location: `content/flags.json` item `week`-5 ("Utrzymująca się biegunka, stolce tłuszczowe, wzdęcia lub wymioty kilka razy dziennie — diagnostyka pod gastroenterologiem" / "Persistent diarrhoea, fatty stools, bloating or several vomits a day — gastroenterology work-up"), grade **A**, sources `["romano2017"]`; and `content/reasons.json` group `losses` item 2 ("Przewlekła biegunka, stolce tłuszczowe, wzdęcia i gazy sugerują zaburzenia trawienia/wchłaniania…" / "Chronic diarrhoea, fatty stools, bloating and gas suggest digestion/absorption problems…"), grade **A**, sources `["romano2017"]`.
- Evidence checked (against the true, corrected guideline artifact): full-text search of the 23-page PDF (all pages carry extractable text): zero occurrences of `diarrh*` anywhere (the only `*rrhea` hits are "sialorrhea"); no steatorrhoea/fatty-stool/malabsorption pathway (the single "malabsorption" mention is "malabsorption of micronutrients"); "bloating" appears only in unrelated contexts (jejunal-feeding indication "refractory vomiting, retching, and bloating", fibre intolerance, and post-fundoplication gas-bloat). The guideline's declared scope is GORD, constipation, dysphagia/oropharyngeal dysfunction, drooling, dental and nutritional assessment (abstract + section list) — diarrhoea/absorption work-up is outside it. Round-1 flagged only the *sub-elements* of this class (calprotectin; bilious vomit, F13 → C-m11) and treated it as a wording fix; no support for the diarrhoea/absorption *core* exists in the cited source at all.
- Impact: provenance/attribution defect on two grade-A claims (the red-flags section is where source accountability matters most). The clinical advice itself is standard and safe (persistent diarrhoea/fatty stools → gastroenterology work-up), so there is no clinical-safety risk — hence "major provenance, low clinical risk". Round-1's resolution asserted all `romano2017`-citing claims had been re-verified; that is not the case.
- Suggested fix (cheap): re-source the diarrhoea/absorption statements to a source that covers them (e.g. a general paediatric-GI evaluation reference in the allowed list, or the AAP/NASPGHAN faltering-weight material for the diagnostic-pathway sentence), or explicitly re-label the item as project operationalisation (grade D) with wording "clinical experience, not from the cited NI guideline" — do not leave grade A citing `romano2017` alone.

### R2-F2 — **MINOR** — "one at a time and in small amounts" in the infant-allergen rule is not in Fewtrell 2017

- Location: `content/rules.json` block `infant` item 3 (allergen introduction), grade A, sources `["fewtrell2017"]`.
- Evidence: full text of Fewtrell et al. 2017 (ESPGHAN CoN position paper; publisher PDF fetched during this audit, 14 pp.): recommendations say "Allergenic foods may be introduced when CF is commenced any time after 4 months (17 weeks)"; "no need to delay the introduction of allergenic foods after 4 months"; "Gluten may be introduced between 4 and 12 months". Searched for "one at a time", "one by one", "one new food", "single food", "small amounts", "small quantities": **no matches**. The item's "from ~4-6 to 12 months" window also conflates the allergen timing (any time after 4 mo) with the gluten window (4–12 mo).
- Impact: minor attribution overreach on an otherwise safe, standard recommendation; the timing/non-delay thrust is genuinely supported.
- Suggested fix: align the wording ("after 4 months, not before; gluten 4–12 months; do not delay") and either cite a source that states the one-at-a-time/small-amounts advice (e.g. WHO complementary-feeding guidance) or drop that clause.

### R2-F3 — **MINOR** — `parameters.json` pending item mis-states the FAO girls TEE equation as "not recovered from the fetched copy"

- Location: `research/data/parameters.json` → `pending[1]`: "FAO girls child TEE regression equation: not recovered from the fetched copy; girls 1-4y values used directly from the table; no calculator impact."
- Evidence: the equation **is** present in the repo's fetched FAO copy — `research/raw/fao_y5686e06.htm`: "Girls: y = 1.102 + 0.273x - 0.0019x²" and Table 4.3 footnote "(a) TEE (MJ/d) = 1.102 + 0.273 kg - 0.0019 kg²". Round-1's own F9 had already reported this. The resolution log claims the item was "documented"; the retained justification contradicts both the artifact and the round-1 finding. `tee_equations` still lists only the boys' equation while the girls' equation is available.
- Impact: documentation inconsistency in the project's own provenance trail (the exact thing the registry is meant to prevent). No calculator impact — girls 1–4 y values are read directly from Table 4.3.
- Suggested fix: correct the note ("present in the fetched copy; not extracted because the calculator reads the girls table values directly") and/or add the girls equation to `fao2004.tee_equations`.

### R2-F4 — **MINOR** — Modules-under-supervision sentence bundled into the `who_pif2007` item is not in WHO PIF 2007

- Location: `content/rules.json` block `infant` item 1, second sentence ("Moduły energetyczne/białkowe dodawane do mleka niemowlęcia — wyłącznie pod nadzorem klinicznym" / "Energy/protein modules added to an infant's milk — only under clinical supervision"), grade A, sources `["who_pif2007"]`.
- Evidence: searched PIF 2007 full text for `modul|supplement|fortif|concentrat`: the only fortification mention is an industry-level note about vitamin levels after reconstitution with hot water — nothing about clinical addition of energy/protein modules. The sentence is safety framing carried over from the F3/C-M3 split; fine to keep, but it currently rides on a source that does not contain it. `romano2017` **does** contain the matching statement: "The addition of modular nutrients, however, should be made with the help of a dietitian to ensure that the final composition of the diet is adequate and to avoid preparation errors" (p. 256).
- Suggested fix: add `romano2017` to this item's sources (clean single-step fix), or split the sentence into its own item labelled as a project safety rule.

### R2-F5 — **MINOR** — `who_sam_2009` severe-wasting definition is scoped to children 6–60 months; the banner applies across the tool's 0–48-month range

- Location: `parameters.json` `refeeding.risk_flag`, `content/flags.json` item `now`-4 banner text (`base.json` `calc.refeeding_banner`), applied by the calculator for all ages 0–48 mo.
- Evidence: BOX 1 header "DIAGNOSTIC CRITERIA FOR SAM IN CHILDREN AGED 6–60 MONTHS"; the statement's stated purpose is "the identification of 6–60 month old infants and children"; no criteria for <6 months are given in the document. For a <6-month-old, WLZ < −3 as a banner trigger is clinically reasonable but not literally covered by this source.
- Suggested fix: add the applicability caveat ("6–60 mo definition; in younger infants clinical assessment decides") to the flags/banner note, or additionally cite the WHO 2013 SAM update / IMCI for the <6-month age band.

---

## 5. Cross-role observation (outside citation remit, found while sweeping)

- `content/reasons.json` line 70 still reads **"Kalprotaktyna"**; the round-1 resolution claims U-B4 fixed it to "Kalprotektyna" ("All fixed (… „Kalprotektyna" …)"). The other typos from that row are gone, so this one string was missed. One-line fix for the next pass.

## 6. Coverage note

- **Deep-checked**: (a) the six named verification items (all PASS; defects R2-F1/F3/F4/F5 live inside or adjacent to them); (b) 8 live DOI/PMID re-resolutions on random sample (all clean); (c) 9 grade A/B claims — `reasons` intake-1, intake-2, losses-1, losses-2, reference-1; `flags` now-2, week-3, week-4, week-5 — with full-text evidence; (d) all 5 `content/` uses of the four round-1-edited source ids; (e) full-text of all three key PDFs (page-level search; no extraction gaps); (f) registry graph checks (47/47 paths, ids, verified flags; `research/` vs `src/data/` copies identical); content lint 0/0.
- **Not re-audited in round 2** (no new evidence sought; per role split): C/D-grade claims beyond the named list; product composition numbers; USDA foods dataset; calculator math/model; digitization numerics; UX/i18n (except §5). The round-1 "borderline" reworded item `flags` now-3 (green/blood-tinged vomit — now self-described as "a clinical red flag regardless of diagnosis" while still citing `romano2017`, grade A) remains an attribution-of-convenience; consistent with its round-1 minor status, not re-raised as a new finding.
- **Severity calibration note**: R2-F1 is graded major on provenance (two grade-A claims claim support that does not exist; missed by the round-1 "all re-verified" sweep), while explicitly noting negligible clinical risk and a cheap fix. If the maintainers prefer the round-1 F13 precedent (attribution overreach = minor), it can be reclassified — but it should not be left unfixed.
