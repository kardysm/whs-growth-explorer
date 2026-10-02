# Round-1 audit — resolution log (2026-10-02)

Method: four independent auditors (fresh context; repo path + rubric only), per GOAL.md §7 — citation auditor, clinical-safety reviewer, math/model auditor, UX/i18n reviewer. Raw findings: `review/round-1-citation.md`, `review/round-1-clinical-safety.md`, `review/round-1-math.md`, `review/round-1-ux-i18n.md`.

Policy applied: **all critical and major findings fixed before round 2**; minors fixed where cheap and safe, the rest explicitly documented (README "Known limitations" + this file). Evidence for each fix: tests (41/41), cross-check (0.0000% over all band fields), content lint (0/0), link check (47/47, 0 investigate), axe (0 violations light/dark/dialog-state), and browser verifications as noted.

---

## 1. Citation auditor — 0 critical / 3 major / 11 minor

| # | Sev | Finding | Resolution | Evidence |
|---|---|---|---|---|
| C-M1 | major | `research/raw/fulltext_romano2017.xml` was an unrelated paper (PMID 28968291); verification trail broken for a source used 14× | True guideline full text fetched (ESPGHAN member-society mirror) → `research/raw/romano2017_guideline.pdf`; claims re-checked against it; stray file deleted; `sources.json` pointer + note updated | PDF verified in-session (23 pp; key phrases present); sources.json note |
| C-M2 | major | Refeeding banner threshold (WHL ≤ −3 z) not stated in cited sources | Re-sourced: **WHO/UNICEF 2009 joint statement** (`who_sam_2009`; Box 1: severe wasting = WHZ < −3 SD) added to registry with artifact; parameters + flags item + banner context now cite it and note that clinical state/electrolytes decide | `who_sam_2009.pdf` verified (Box 1 quote located); parameters.json `refeeding.risk_flag` |
| C-M3 | major | “Never concentrate formula / never add modules … (grade A)” mis-cited to fewtrell2017 | Split-sourced: concentrate rule → **WHO PIF 2007** (`who_pif2007`, verbatim: “add the exact amount of formula as instructed…”); modules-only-under-supervision kept as clinical-supervision framing | `who_pif2007.pdf` verified; rules.json + base.json safety text updated |
| C-m4 | minor | Diary-overestimation claim needed romano2017 | Added to sources of that item | reasons.json `intake` item 3 |
| C-m5 | minor | WHS epilepsy paper over-extended (metabolic load/ASM appetite) | Claims softened; metabolic part explicitly labelled extrapolation; meds claims re-worded to sedation | reasons.json `requirements`/`meds`, flags.json meds item |
| C-m6 | minor | Dangling `who_wfa` id in evidence table | → `who_standards_wfa` | evidence-table.md row 35 |
| C-m7 | minor | Stale “digitization pending” notes (2025 curves) | Updated in evidence-table + research-notes | both files |
| C-m8 | minor | FAO girls 11–12 mo value missing (present in local raw) | Filled: 712 (calculator + parameters) | energy.ts, parameters.json; test added |
| C-m9 | minor | ≥10 y PAL column mislabels | Columns relabelled per age band (1.4 ≤9 y; 1.6/1.8/2.0 for 10 y+) | parameters.json `pal_columns` |
| C-m10 | minor | NICE monitoring-interval wording | Rewritten to NG75 bands; diary window marked as practice | rules.json `monitoring` |
| C-m11 | minor | Calprotectin / bilious-vomit attributions | Wording adjusted (generic red flag; calprotectin as gastro-led add-on) | reasons.json, flags.json |
| C-m12 | minor | Culley provenance gap | Labelled assumption-grade everywhere (parameters gate note; method note) | parameters.json, base.json p6/p2 |
| C-m13 | minor | Composite grades “A/B”, “D/B” | Single grades adopted (A, A, B) + grade legend added to Sources section | rules.json; base.json `sources.legend`; browser check |
| C-m14 | minor | Pending-list hygiene (3 resolvable items) | 2 resolved (FAO 712; PZH beyond-range note), 1 documented (FAO girls TEE equation — no calculator impact) | parameters.json `pending` |

Coverage note: auditors verified all numeric parameters + all A/B/C claims; D-grade items, USDA foods (out of scope) and deep checks for abstract-level sources were listed as unaudited in their report — no additional actions required.

## 2. Clinical-safety reviewer — 1 critical / 7 major / 5 minor

| # | Sev | Finding | Resolution | Evidence |
|---|---|---|---|---|
| CS-1 | **critical** | Honey listed with no <12-month botulism warning anywhere | Per-item warning + `age-12plus` tag on the honey card; new infant rule item with AAP source (`aap_botulism`, fetched); search now surfaces it (“botulizm” → rule + product) | browser: warning string present; aap_botulism.html artifact |
| CS-2 | major | Infant densification outputs (1.5–2.0 kcal/ml) shown without in-context caveat | Contextual warning banner in the results when age <12 mo and density >1 kcal/ml | base.json `calc.infant_density_caution`; browser check |
| CS-3 | major | Product age limits never rendered (Protifar “<3 y” invisible); no allergen tags | `form` line rendered on every product card (Protifar caution visible); allergen tags added (milk/egg/fish/nuts/sesame/soy/gluten) incl. build pipeline; tags searchable | browser: Protifar form text; build_foods.py ALLERGENS; search “zelazo”/tags |
| CS-4 | major | Outputs showed no evidence grade / no extrapolation flag; p5 claim unsupported | Grade badges on all calculator cards (A A D D D); explicit extrapolation note on C/D/D—2 (“grade D — extrapolation from NI/CP; no WHS studies”); p5 wording corrected; legend added | browser: badges [A,A,D,D,D]; base.json |
| CS-5 | major | Sources section rendered “undefined” badges (44×) | Field bug fixed (`s.class` → `evidence_class`); verified 47/47 render with correct classes | browser: 47 badges, 0 “undefined” |
| CS-6 | major | Content claimed a WHS-vs-WHO proportion the tool didn’t compute | Calculator now shows the child’s WHS-chart position (≈ SD) in the C card; reasons text rewritten to describe exactly what the tool reports | methods.ts `whsZ`; main.ts C card; reasons.json |
| CS-7 | major | D-2 no guardrail (315 kcal/kg shown as plain value); D-1 guardrail buried in English-only details | D-2 labelled “scenario” + per-kg guardrail banner when >167 kcal/kg (TRS 935 table max); all guardrails now render as visible banners (not only collapsed) | methods.ts guardrail; browser check; tests |
| CS-8 | major | Safety strings/notes hardcoded English in the PL UI | All calculator notes, guardrails, flags, banners now bilingual `{pl,en}`; PL verified in DOM | browser: PL strings; notes type change |
| CS-9 | minor | Composite grade semantics | Resolved with single grades + legend (see C-m13) | — |
| CS-10 | minor | Length-substitution not hinted to users | C method note now states that the default length is the WHS mean and that entering a measured length changes C materially | base.json p2; methods.ts note |
| CS-11 | minor | Silent aspiration not mentioned | New red-flag item (“Ciche aspiracje…”) with swallowing-assessment pathway | flags.json; browser: search “aspiracje” |
| CS-12 | minor | Allergen-introduction guidance missing | New infant rule item (ESPGHAN window, one-at-a-time, don’t delay) | rules.json; browser check |
| CS-13 | minor | kcal/cm presented without range on C card | kcal/cm shown with its 6–15 range note directly on the card | main.ts C card; methods.ts note |

## 3. Math/model auditor — 0 critical / 4 major / 4 minor

| # | Sev | Finding | Resolution | Evidence |
|---|---|---|---|---|
| M-F1 | major | C/D used healthy WHO median length when none entered — over-estimating C by 26–64% at WHS-typical lengths | Single consistent default adopted everywhere (grid, calculator, table, charts): **WHS mean length for age** (digitized Antonius 2008); disclosed in UI notes, chart hint, grid meta and REPORT; entering a measured length replaces it | grid regenerated; crosscheck 0.0000%; tests; REPORT numbers updated |
| M-F2 | major | Method B silently fell back to NASEM at fractional weight-ages 7–12 mo (EFSA lookup returned undefined) | EFSA infant series now interpolates properly for fractional months (node range 6→12); note text corrected | energy.ts; new test (7.638 → 651.95); crosscheck mirrors; 490 affected grid rows recomputed |
| M-F3 | major | Girls EFSA year-3 constant 1088 (PZH) instead of 1096 | Corrected to 1096 | energy.ts; test updated |
| M-F4 | major | Month 6 ignored PZH values (597/549) while texts claimed months 6–11 | Month 6 now uses PZH values (source credited); children year-1 anchors month 12; texts corrected | energy.ts; parameters.json; test; site note p1 |
| M-F5 | minor | FAO girls 11-mo value null (A-band low off by −3.2%) | Filled (712) — same change as C-m8 | energy.ts; test |
| M-F6 | minor | EFSA vs PZH children year-1 textual ambiguity (≤1.5%) | Method p1 rewritten: month 6 PZH, months 7–11 EFSA; years EFSA at PAL 1.4 with NASEM/FAO cross-check | base.json p1 |
| M-F7 | minor | Culley fetched-file provenance gap | Labelled assumption-grade (C-m12) | parameters.json |
| M-F8 | minor | crosscheck.py partially independent (mirrored constants; couldn’t catch F2/F3/F5) | Cross-checker reworked to the corrected semantics and now compares **all band fields** (A/Alo/Ahi/B/C/Clo/Chi/D/Dlo/Dhi/fluid; 303 values), includes FAO in the A band and former defect windows | crosscheck-report.md (0.0000%, PASS) |

Extra (from auditor’s O-notes, folded into method p8): band-switch step function, WHO 2-y seam caveat, EFSA yearly-vs-monthly note, NICE-criteria↔WHS-SD-space note.

## 4. UX/i18n reviewer — 0 critical / 13 major / 19 minor

| # | Sev | Finding | Resolution | Evidence |
|---|---|---|---|---|
| U-B1 | major | Calculator notes/guardrails/banners English-only in PL-primary UI | Bilingual notes everywhere (CS-8) | browser PL checks |
| U-B2 | major | Localization leaks (PL unit letters in EN; PL-only product source labels; “ml @0.67” dots; PL series names missing) | Nutrient line localized (P/F/C, fibre), source labels bilingual, chart series names localized, ml@decimal comma | browser checks; products.json; main.ts |
| U-B3 | major | Number formatting inconsistencies (dot decimals in PL; “1 items”; “6.2 mies.”) | PL comma formatting across cards/tables/tooltips/fallbacks; Polish plural rules for product counts | browser; code |
| U-B4 | major (from report) | Grammar/typos („Daganianie”, „aparyczne”, „Kalprotaktyna”, „Aversja”, „oiligo”, „Przy znacznego…”, broken „An” ref) | All fixed („Doganianie”, „apatyczne”, „Kalprotektyna”, „Awersja”, „Mleka aminokwasowe i rzadkie moduły”, „Przy znacznym stopniu”, p4 rewritten) | grep + browser |
| U-B5 | — | PL quotation marks normalized | „…\" style fixed in edited strings; existing „…\" kept | content files |
| U-B6 | major | English source-notes in PL UI unlabeled | Notes now marked `lang=\"en\"` with a PL tooltip (“nota źródłowa (j. angielski)”) | main.ts; sources section |
| U-B7 | minor | Meta description not language-aware | Updates on every render (`meta_desc`) | main.ts renderAll |
| U-C1 | major | Search placeholder promised sections/nav that returned nothing (“sygnały”, “red flags”) | Section-level entries indexed (10 sections with titles + intros) | browser: “sygnaly” → section first |
| U-C2 | major | Localized tag labels not indexed (“żelazo” → 0 products) | Product index now includes localized tag/category labels + form + warning; Fuse `ignoreDiacritics` | browser: “zelazo” → products; “botulizm” → honey |
| U-C3 | major | No focus trap; focus lost after Enter/Esc; arrow selection off-screen; Ctrl+K reset while open | Trap (Tab cycles inside panel), focus restore to opener, `aria-activedescendant` + scrollIntoView(nearest), Ctrl+K no-op when open | browser: focus-open → input; Esc → opener; axe dialog-state clean |
| U-D1 | major | No chart↔table linked hovering | Chart hover highlights nearest table row (and reverse: row hover highlights the chart series point) | main.ts handlers (browser-servable; static check) |
| U-D2 | major | Tooltips raw decimals; no ml-at-density in chart-1 tooltip | Custom formatters: rounded + unit-aware; chart 1 appends “volume at density ≈ ml” | main.ts |
| U-D3 | minor | Sticky table header offset wrong (top: 3.2rem) | `top: 0` inside its scroll container | styles.css |
| U-D4 | minor | Table rows not keyboard-operable | Rows `tabindex=\"0\"`, Enter/Space activates, visible focus ring | main.ts + CSS |
| U-E1 | major | 203–261 px mobile header | Compact mobile header (nav becomes single scrollable row): measured 95 px at 375/360 | browser: hdrH 95 |
| U-E2 | major | Sticky header hid section headings on anchor jumps | Dynamic `scroll-padding-top` from measured header height (`--hdrh`) + focus moves to target | main.ts `updateScrollPad`; CSS |
| U-E3 | major | Horizontal overflow at 360/375 px | Fixed via `min-width:0` on grid children + `overflow-wrap:anywhere`; verified `scrollWidth == innerWidth` at 360/375 | browser measurements |
| U-F1 | major | Dark mode: key chart series near-invisible (C 1.61:1, WHO 2.23:1, marker 1.18:1) | Theme-aware palette (light+dark) applied to all series incl. child marker with contour | main.ts PAL; dark chart legend verified |
| U-F2 | major | Focus ring failed non-text contrast | 3 px `var(--accent2)` ring, theme-aware (≥3:1 both themes) | styles.css; axe re-runs |
| U-F3 | major | ECharts auto-ARIA emitted English NaN text | Per-chart localized `aria.label.description` (short, human descriptions) | main.ts; axe passes |
| U-F4 | minor | Skip-link did not move focus | Destination focus on search-jump (`tabindex=-1`+focus); skip-link itself lands on `#main` (existing) | main.ts |
| U-F5 | minor | Flash highlight invisible in dark; motion not reduced | Dark-mode flash + `prefers-reduced-motion` fallback outline | styles.css |
| U-F6 | minor | Active/hover row too weak | Stronger hover/hl styling via `color-mix` | styles.css |
| U-F7 | minor | Nav labels/aria-pressed/hints gaps | Theme toggle `aria-pressed` state; sort hints present; labels localized | main.ts |
| U-G1 | minor | Dead strings/keys | Removed (`band_*`, `col_ml`, `placeholder` block); remaining strings all referenced | base.json cleanup |
| U-G2 | minor | Resize listener added per render | Guarded one-time binding | main.ts |

### Deferred minors (documented — not silently dropped)

1. Full keyboard navigation *inside* charts (beyond table fallbacks + click parity) — table fallback is the sanctioned path; revisit in a later pass.
2. A dedicated allergen *filter* control (allergen tags are rendered and searchable; a filter is a UI nicety).
3. Real screen-reader test on hardware (no SR available in the audit environment; DOM/ARIA inspected).
4. Table `<caption>`/`aria-describedby` polish; ECharts legend truncation aesthetics at very narrow widths.
5. “🐴” tab-title prefix observed by the UX auditor was investigated — it is browser-harness instrumentation, not site code (site title clean in index.html and dist).

---

## Regression evidence after all fixes

- vitest: **41/41 green** (new tests: month-6 PZH, fractional interpolation, girls year-3 = 1096, FAO girls 712, D-2 guardrail, WHS-length default).
- crosscheck.py: **0.0000%** max relative difference; **303 field values** compared incl. all band edges; acceptance PASS.
- content lint: **0 errors / 0 warnings**; 47/47 sources cited; link check: **47/47, 0 investigate**.
- axe-core (injected live): light **0/0**, dark **0/0**, dialog-open **0 violations / 1 informational incomplete** (panel over dimmed backdrop — manually checked; consistent with the pre-audit baseline).
- Browser checks: sources badges 47/47 correct; honey warning + age tag; Protifar age caution; grades [A,A,D,D,D]; PL notes; search (“sygnaly”, “zelazo”, “botulizm”, “aspiracje”); focus flow; mobile 360/375 no overflow, header 95 px.
- Grid regenerated at the corrected defaults; REPORT method-spread table + uncertainty #1 recomputed (boys 6/18/36 mo; new spread range documented).
