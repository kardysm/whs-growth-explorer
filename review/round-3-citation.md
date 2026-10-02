# Round 3 — Citation & provenance confirmation audit (final round)

- Project: `/opt/data/whs-growth-explorer` · Date: 2026-10-02 · Auditor: independent subagent, round 3 (fresh context; repo artifacts + live web only). No project content outside `review/` was changed (one exception noted in §6: running the project's own lint script regenerates its deterministic report file with unchanged content).
- Scope: (i) independently CONFIRM/REFUTE the four named round-2 citation fixes (diarrhoea/malabsorption relabel; FAO girls TEE pending note + equation; infant concentrate sources; SAM 6–60 mo scope caveat); (ii) NEW light checks — 6 grade A/B claims not deep-checked in rounds 1–2 verified against local raw full texts, live re-resolution of 4 random DOI/PMID sources, full registry-integrity re-run.
- Method: local raw artifacts first (pypdf full-text extraction of romano2017 23/23 pp., who_sam_2009 12/12, who_pif2007 30/32 with text; text extraction of FAO HTML chapters, NICE NG75 recommendations HTML, PZH 2024 text (1.2 MB), Płudowski 2023 XML (88.6 k chars), TRS 935 PDF 284 pp., Hauer 2017 XML), then live Crossref/Europe PMC REST re-resolution (2026-10-02, via HTTPS proxy). Site not rebuilt (not needed for this role).

## Summary

| severity | count | ids |
|---|---|---|
| critical | 0 | — |
| major | 0 | — |
| minor | 3 | R3-F1 – R3-F3 |

**Round-2 fixes: all 4 CONFIRMED as claimed** (details §1), each with a small residual noted (R3-F3 touches fix 1; R3-F2 is an unfixed round-1 residual, not a round-2 regression).

**Top issues:** (1) `rules.json` macro-3 (carbohydrates) carries specifics (`>1 kcal/ml`, "gas, stool water", carbs as "quick" energy) that are not in its only cited source (Hauer 2017) — R3-F1; (2) round-1 F11's interval residuals were never fixed at two locations: flags week-6 "3–4 weeks" and the reasons intake-2 "3–7 day" diary (both not in their cited sources) — R3-F2; (3) the re-labelled diarrhoea items' parenthetical "outside the guidelines cited in this tool" contradicts their new `faltering_2026` citation, whose fetched copy does not contain the diarrhoea/absorption content — R3-F3.

---

## 1. Round-2 verification (the four named fixes)

### V1 — Diarrhoea/malabsorption items re-labelled — **PASS** (residual → R3-F3)

- `content/flags.json` week-5 item: grade **D**; sources **`["faltering_2026"]`** (romano2017 gone); text now ends "(…diagnostyka pod gastroenterologiem (standardowa praktyka kliniczna; poza zakresem przewodników cytowanych w tym narzędziu))" / EN "(standard clinical practice; outside the guidelines cited in this tool)". ✓
- `content/reasons.json` `losses`-2: grade **D**; sources **`["faltering_2026"]`**; same disclosure wording. ✓
- Project-wide sweep: no other `content/` item pairs diarrhoea/malabsorption with `romano2017` (only the section intros name "biegunki/diarrhoea" as a mechanism — no attribution). ✓
- Confirmed the underlying round-2 finding myself: full-text search of the 23-page romano2017 PDF — `diarrh*` 0 hits, `steatorrh*` 0, `fatty stool` 0; only "malabsorption of micronutrients" (PDF p. 12). The relabel is the right call. Residual wording/citation issue → R3-F3.

### V2 — `parameters.json` FAO girls TEE equation — **PASS**

- `pending[1]` now reads: "FAO girls child TEE equation: PRESENT in the fetched copy (fao_y5686e06.htm); not extracted into code because girls 1-4y values are read directly from Table 4.3; recorded under fao2004.tee_equations." — factually correct on all three points. ✓
- Raw artifact: `research/raw/fao_y5686e06.htm` contains, verbatim, "Girls: TEE (MJ/day) = 1.102 + 0.273 kg - 0.0019 kg²; n weighted = 808, r = 0.955" (regression section) and Figure 4.1 "Girls: y = 1.102 + 0.273x - 0.0019x²"; Table 4.3 footnote "(a) TEE (MJ/d) = 1.102 + 0.273 kg - 0.0019 kg²" for the girls' table. ✓
- `fao2004.tee_equations.girls_children_MJ_per_day` = "TEE = 1.102 + 0.273 x weight(kg) - 0.0019 x weight^2 (present in the fetched fao_y5686e06.htm; calculator reads the girls table values directly)" — coefficients exact. ✓
- Code check: `src/calc/energy.ts` `FAO_CHILDREN.girls = {1:865, 2:1047, 3:1156, 4:1241}` — table values, no girls equation in code (matches the note). ✓

### V3 — Infant concentrate rule sources — **PASS**

- `content/rules.json` `infant`-1: sources now **`["who_pif2007", "romano2017"]`**, grade A. ✓
- WHO PIF sentence re-verified in `who_pif2007.pdf` (pp. 13 and 21): "Adding more or less powder than instructed could make infants ill." ✓
- Module sentence ("Energy/protein modules added to an infant's milk — only under clinical supervision."): supported by romano2017 **p. 256** — PDF page 15 carries the journal footer "Romano et al JPGN … August 2017 / 256 www.jpgn.org" and contains verbatim: "The addition of modular nutrients, however, should be made with the help of a dietitian to ensure that the final composition of the diet is adequate and to avoid preparation errors." Same page carries recommendation 21c on infant feeds in NI ("human milk, a standard infant formula, or nutrient dense infant enteral formula … in infants with NI"), so the infant context is not stretched. Paraphrase "under clinical supervision" vs source "with the help of a dietitian" — acceptable (dietitian = clinical supervision); no finding.

### V4 — SAM 6–60 mo scope caveat — **PASS**

- `content/flags.json` `now`-4 banner text: "…próg przesiewowy wg definicji ciężkiego wyniszczenia WHO/UNICEF dla 6.–60. mies.; u młodszych dzieci decyduje ocena kliniczna…" / "…screening threshold from the WHO/UNICEF severe-wasting definition for 6-60 months; in younger infants clinical assessment decides…". ✓
- `parameters.json` `refeeding.risk_flag`: "…WHO/UNICEF 2009, which covers children 6-60 months; applied cautiously outside that band - in younger infants clinical assessment decides…". ✓
- Source re-verified in `who_sam_2009.pdf`: "BOX 1. DIAGNOSTIC CRITERIA FOR SAM IN CHILDREN AGED 6–60 MONTHS" (p. 2), "identification of 6–60 month old infants and children" (p. 2). Caveat is factually correct. (Light note: the calculator banner string in `base.json` `calc.refeeding_banner` itself still lacks the age caveat — consistent with the fix as scoped (flags + parameters); optional follow-up, see §5.)

### V5 — Registry integrity re-run — **PASS**

- 47 entries, declared count 47; **all 47 `fetched_file` paths exist, none null**; **no duplicate ids**; all `verified: true`; `research/sources.json` vs `src/data/sources.json` **byte-identical** (sha256 `de27d76107769c3985ec864ad7ad3994f12de1535757557a913ca4a918293d98`, both copies).
- Content lint re-run: **0 errors / 0 warnings; 47/47 sources cited** (`scripts/content_lint.py`). Transparency note: the script rewrites `research/qa/content-lint-report.md` deterministically on each run (no timestamps); its content is the same 0/0 · 47/47 state recorded in round 2 — only the file mtime changed.

---

## 2. NEW — claim deep-checks (grade A/B, not deep-checked in rounds 1–2)

| # | location (grade) | sources | verdict | evidence (against local raw full text) |
|---|---|---|---|---|
| 1 | `reasons.json` micros-1 (A) | pzh2024, pludowski2023 | **supported** | PZH 2024 zinc chapter: "Niedobory cynku u niemowląt i dzieci prowadzą do … utraty apetytu, … zahamowania wzrostu … Zbyt niskie spożycie cynku prowadzi także do pogorszenia funkcji immunologicznych organizmu."; iron: "obniża się … odporność na infekcje". Płudowski 2023: 0–6 mo 400 IU/d, 6–12 mo 400–600 IU/d, 1–3 y 600 IU/d — exactly the item's check text (400–600 IU / 600 IU). |
| 2 | `flags.json` week-6 (A) | faltering_2026, nice_ng75 | **partially supported → R3-F2** | The faltering-weight/NG75 pathway content is supported; the "**3–4 weeks**" interval is in neither source (NG75 recommendations artifact has no such interval; faltering_2026 fetched record = abstract with no interval). See finding. |
| 3 | `rules.json` macro-2 protein (A) | who_protein2007, cp_protein_2026 | **supported (paraphrase)** | TRS 935 (284 pp. PDF): §10.1 "Protein requirements for rapid weight gain in the wasted child"; "Table 38 shows examples of rates of weight gain in malnourished infants during catch-up as a function of protein and energy intakes"; protein–energy interdependence stated ("the efficiency of protein utilization … decreasing with the higher protein:energy ratio", p. 200). "Extra protein does not replace energy" is a fair paraphrase of this + the protein-sparing principle (§5, p. 96); not verbatim. cp_protein_2026 abstract: wide intake ranges + "literature gaps regarding tailored protein needs" — consistent with "doses set by the dietitian". |
| 4 | `rules.json` macro-3 carbohydrates (B) | feeding_intol_2017 | **partially supported → R3-F1** | Hauer 2017 full text: `carbohydrate` 0 hits, `density`/`kcal/ml` 0, `stool water` 0. Related-but-different: "Over-feeding … third most common contributor … behind formula osmolarity and feeding rate"; Table 2 "Review osmolarity of feeds — … use additives to add calories without adding osmotic load (microlipid)". See finding. |
| 5 | `rules.json` ladder-2 FSMP/modules (A) | romano2017 | **supported** (one framing nit) | romano2017: "Commercially available sip feeds (oral nutritional supplement) are an easy way to add proteins…" (journal p. 250); "Dietary supplementation with glucose polymer and/or long-chain triglycerides or use of hypercaloric or high-density feed is required in poor nutrition or growth failure" (journal p. 256); "The addition of modular nutrients … with the help of a dietitian…" (p. 256). The clause "per the manufacturer's instructions" is not in the source — product-safety framing, nit-level, no finding. |
| 6 | `rules.json` micro-2 supplement caution (A) | pzh2024, pludowski2023 | **supported** | PZH 2024: "Ostre zatrucie obserwowano u dzieci na skutek przedawkowania żelaza z preparatów…" (acute iron poisoning from supplements in children); Płudowski 2023: UL table (infants 1000 IU/d, children 2000 IU/d), "Serum 25(OH)D >100 ng/mL — increased risk of toxicity", overdose-risk statements. "Excess is harmful" ✓; the "without testing" clause is a caution, not contradicted. |

## 3. NEW — live re-resolution of 4 random DOI/PMID sources

Random sample (fresh seed 20261003; sample disjoint from round-2's 8) from the 34 DOI/PMID-bearing entries; each re-resolved live against Crossref (DOI) and Europe PMC (PMID) on 2026-10-02. **All clean; all DOI↔PMID pairs agree.**

| id | DOI / PMID | Crossref | Europe PMC | verdict |
|---|---|---|---|---|
| growth2025 | 10.1002/ajmg.a.64075 / 40156374 | ✓ 2025 | ✓ 2025 | clean |
| antonius2008 | 10.1007/s00431-007-0595-8 / 17874131 | 2007 (online-first) | ✓ 2008 (issue) | clean; registry year 2008 matches issue/EPMC |
| cp_preschool_energy | 10.3945/ajcn.112.043430 / 23134886 | ✓ 2012 | ✓ 2012 | clean |
| krick1992 | 10.1111/j.1469-8749.1992.tb11468.x / 1612207 | ✓ 1992 | ✓ 1992 | clean |

Title overlap 1.00 for all eight title checks; EPMC DOIs identical to registry DOIs in all four.

---

## 4. Findings (new, round 3)

### R3-F1 — **MINOR** — `rules.json` carbohydrate item carries specifics not in its only cited source (Hauer 2017)

- Location: `content/rules.json` block `macro`, item 3: "Węglowodany: źródło 'szybkiej' energii, ale przy gęstości >1 kcal/ml sprawdzaj tolerancję (wzdęcia, wody); czasem lepsza jest gęstość z tłuszczu." / EN "Carbohydrates: 'quick' energy, but check tolerance at densities >1 kcal/ml (gas, stool water); density from fat may be better tolerated." — grade **B**, sources `["feeding_intol_2017"]`.
- Evidence (full text of Hauer 2017, `research/raw/fulltext_feeding_intolerance_2017.xml`, 40.7 k chars): `carbohydrate` 0 hits; `density`/`dense`/`kcal/ml`/`high-cal` 0; `stool water`/`watery` 0; `quick` 0. The source's nearest content is different in kind: formula **osmolarity** as a driver of feeding intolerance ("Over-feeding was identified as the third most common contributor to feeding intolerance, behind formula osmolarity and feeding rate") and the Table 2 advice "Review osmolarity of feeds — Minimize use of elemental formulas or dilute, use additives to add calories without adding osmotic load (microlipid)" — i.e. it supports "prefer non-osmotic (fat-based) calorie additives", not a ">1 kcal/ml" threshold, not "gas/stool water" as the signs, and not the "carbohydrates = quick energy" framing.
- Impact: provenance overreach on one grade-B item; the advice itself is safe/standard (and partly corroborated), so low clinical risk. Note: the PL shorthand "(wzdęcia, wody)" was already flagged by the round-1 UX auditor (→ "wodniste stolce") and is still present — a fix will touch this same string.
- Suggested fix (cheap): reword to the supported core ("przy zagęszczaniu sprawdzaj tolerancję; dodawaj kalorie tłuszczem bez ładunku osmotycznego"), or add a source that states the density/carb-tolerance specifics, or relabel as operationalisation.

### R3-F2 — **MINOR** — Round-1 F11 interval residuals never fixed at two locations

- Locations/evidence (searched the cited artifacts):
  - `content/flags.json` week-6, grade A, sources `["faltering_2026", "nice_ng75"]`: "Brak przyrostu masy mimo prawidłowej podaży energii przez **3–4 tygodnie**…". The NG75 recommendations artifact (`url_nice_ng75_recommendations.html`, 17.6 k chars text) contains no "3–4 week" interval (its only intervals: weighing bands rec 1.2.2/1.1.5, "no more often than every 3 months" for length, and the birthweight "3 weeks of age" rule); the faltering_2026 fetched record (EPMC, abstract + metadata) contains no interval. Round-1 F11 flagged exactly this location; the resolution (C-m10) only rewrote `rules.json` monitoring.
  - `content/reasons.json` intake-2 `check`, grade B, sources `["romano2017", "feeding_intol_2017"]`: "Dzienniczek **3–7 dni**: …". romano2017 full text: `diary` 0 hits (the only "food record" string is a reference title about a three-day weighed record in CP); Hauer 2017: no diary-duration guidance. The parallel rules-monitoring copy is marked "(praktyka)", but this one is not.
- Impact: two observation-window numbers presented without source support; clinically mild (they bracket, not replace, clinical judgement), same class/severity as round-1 F11.
- Suggested fix: mark both as practice/project operationalisation (or align to source-supported bands) — one-line edits.

### R3-F3 — **MINOR** — Diarrhoea items: disclosure wording contradicts the new citation; `faltering_2026` copy does not contain the content

- Location: the two items from V1 (`flags.json` week-5; `reasons.json` `losses`-2), now grade D, sources `["faltering_2026"]`, disclosure "…(standard clinical practice; outside the guidelines cited in this tool)".
- Evidence: `faltering_2026` (AAP/NASPGHAN "Clinical Practice Guideline for Diagnosis and Management of Faltering Weight", Pediatrics 2026) **is itself one of the guidelines cited in this tool** — so the parenthetical is self-contradictory as literally read; and its fetched copy (EPMC record; full text subscription-only) does not contain the diarrhoea/fatty-stool/bloating content at all — only the generic pathway "Diagnostic testing … for children who have specific conditions that suggest a focal evaluation or persistent faltering weight … suggests endoscopy with biopsy."
- Impact: wording/consistency only — the grade-D relabel and the removal of `romano2017` (the substance of R2-F1) are correctly done, and the item no longer claims guideline-grade support. This is the lightest of the three findings.
- Suggested fix (one line): reword the parenthetical to something literally true (e.g. "not covered by the neurological-impairment guideline cited in this tool") or drop it; keep `faltering_2026` as the pathway anchor.

---

## 5. Cross-role observations (outside citation remit; found while sweeping)

- `content/base.json` `calc.refeeding_banner` text still lacks the 6–60 mo age caveat that was added to the flags item + `parameters.json` (the R2-F5 fix was scoped to those two and delivered as scoped). Optional follow-up for completeness.
- `content/rules.json` macro-3 PL shorthand "(wzdęcia, wody)" — round-1 UX minor, appears still unfixed (folded into R3-F1's fix).

## 6. Coverage note

- **Confirmed**: all four round-2 citation fixes with raw-artifact evidence (romano2017 PDF full text incl. p. 256 footer; FAO `fao_y5686e06.htm`; `who_sam_2009.pdf` Box 1; `who_pif2007.pdf` pp. 13/21; parameters pending/tee_equations; content items' grades/sources as read from the JSON). Registry integrity re-run (47/47 paths, no dups, byte-identical copies + sha256); content lint 0/0.
- **New deep-checks**: 6 grade A/B claims (mix: reasons ×1, flags ×1, rules ×4) verified against local full texts (TRS 935 284 pp.; PZH 2024 1.2 MB text; Płudowski 2023 88.6 k chars; Hauer 2017; romano2017; NG75 recommendations; faltering_2026 record). 2 partial → R3-F1/F2; 4 supported.
- **Live**: 4 DOI/PMID re-resolutions (seed 20261003) — all clean.
- **Not re-audited in round 3** (no new evidence sought; other roles / prior rounds cover them): C/D-grade claims beyond the items above; product composition numbers; USDA foods dataset; calculator math/model; digitization numerics; UX/i18n (except §5); DOM rendering of the fixed items (site not rebuilt). faltering_2026 full text remains paywalled — claims citing it were checked against the fetched record (abstract/metadata); its own z-criteria claims are fully present in the abstract.
- **Severity calibration**: all three findings are minor provenance/wording issues with negligible clinical risk and one-line fixes; none blocks the stop rule. R3-F2 is a genuine leftover of a round-1 minor (resolution only touched one of three locations); R3-F3 is a wording-level residual of an otherwise correctly executed round-2 major fix.

**Verdict: critical: 0, major: 0** (minor: 3 — R3-F1, R3-F2, R3-F3).
