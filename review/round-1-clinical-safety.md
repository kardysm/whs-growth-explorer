# Round 1 — Clinical-safety review (paediatric gastroenterology + clinical dietetics)

**Role:** independent clinical-safety reviewer (round 1, fresh context), per GOAL.md §7.1 role 2.
**Scope:** `content/*.json`, `src/calc/*.ts`, `src/ui/main.ts`, `src/data/*` as presented to users; judged against GOAL.md §1 hard rules (safety, evidence grades, extrapolation flagging, uncertainty ranges).
**Method:** read all listed artifacts; served the built site (`dist/`) locally and exercised the calculator and sections in a real browser (PL default and EN) to verify *rendered* behaviour, not just source code. Findings below state exactly what I verified and how.
**Out of scope here:** numeric re-derivation (math auditor), citation-source accuracy (citation auditor), Polish language quality (UX/i18n reviewer) — overlaps are noted where a defect is also a safety matter.

**Severity summary:** 1 critical, 7 major, 5 minor.

| ID | Sev | One-line |
|---|---|---|
| CS-1 | critical | Honey listed as a food with no infant-botulism warning (<12 months) anywhere in the tool |
| CS-2 | major | Calculator outputs densification volumes (incl. 1.5–2.0 kcal/ml) for infants with no in-context "clinician supervision / never concentrate formula" caveat |
| CS-3 | major | Product age-suitability (`form`) never rendered; Protifar "<3 y" caution invisible; no allergen/IDDSI-texture tags, no age filter (GOAL §8) |
| CS-4 | major | Calculator outputs carry no evidence grade; extrapolation is not flagged in the results; the one "extrapolation" sentence (Methods) is unsupported as written |
| CS-5 | major | Sources section renders "undefined" evidence-grade badges for all 44 sources (field mismatch `evidence_class` vs `s.class`) |
| CS-6 | major | Content claims the tool computes the WHS-vs-WHO drop ("narzędzie liczy proporcje") — no such computation exists; no WHS z-score/centile output at all |
| CS-7 | major | Catch-up guardrails weak/low-salience: method D-2 has none (314 kcal/kg actual in one demo case); the method-1 guardrail hides inside collapsed details, English-only |
| CS-8 | major | PL-default page: safety-relevant calculator strings (volume flags, guardrails, notes) are hardcoded English, not in `content/*.json` |
| CS-9 | minor | Composite grade strings "A/B", "D/B" displayed as badges; GOAL §1 defines single grades A–D |
| CS-10 | minor | Refeeding banner coverage: requires length entry; only ≤ −3 WFL/WHF; no ASPEN-broader risk factors; no hint to enter length |
| CS-11 | minor | Silent aspiration not mentioned (only overt choking/cyanosis/apnoea) |
| CS-12 | minor | Infant block lacks allergen-introduction guidance (ESPGHAN); "smooth nut butters" caution vague for <12 mo |
| CS-13 | minor | Height-based kcal/cm shown as a single bare number with no range/derivation caveat; 14.7 kcal/cm value unmapped; wording "derivation does not cover infants" overstates parameters.json ("unclear") |

---

## CS-1 — CRITICAL: Honey ("Miód") in the food list with no infant-botulism warning

**Location:** `src/data/products_foods.json` item `food-honey` (category `sweets`; same file is bundled as products data) → rendered by `src/ui/main.ts` `renderProducts()` (~L673–730), live on the site. No caveat in `content/products.json` note (L2–5), `content/rules.json`, or `content/base.json`.

**Evidence (live site, PL default):** the card reads *"Miód / 100 g: 304 kcal · B 0.3 g … gęste energetycznie / porcje domowe: ≈ 1 cup (339 g) = 1031 kcal … źródło: Honey — USDA FDC"*. A page-wide text search for "botul" returns **0 hits**; there is no age tag and no warning. The tool's own calculator starts at age 0 months and the site has an explicit "Infant-specific rules (0–12 months)" block (`content/rules.json` L23–32) and infant FSMPs — so infants are squarely in the target audience of this list. Honey is the classic vehicle for infant botulism and is universally advised against below 12 months (ESPGHAN complementary-feeding position paper, already in this project's source set as `fewtrell2017`).

**Suggested fix:** (a) remove honey from the curated list, or (b) keep it only with a prominent, non-optional warning rendered on the card and in search results, e.g. an `age_note`/`warning` field: PL "Nie podawać dzieciom poniżej 12. miesiąca — ryzyko botulizmu niemowlęcego" / EN "Do not give under 12 months — risk of infant botulism", plus an infant-block bullet in `content/rules.json`. Add a CI check that no `sweets` item passes without an age note.

---

## CS-2 — MAJOR: Infant feed densification presented without an in-context clinician-supervision caveat

**Location:** `src/calc/methods.ts` §E (L237–254: densities `[0.67, 1.0, 1.5, input.feedDensityKcalPerMl]`); `src/ui/main.ts` density input min 0.6/max 2.0 (L205–206) and E card (L296–301).

**Evidence (live site):** for a 3-month-old (4.5 kg, 58 cm) with the density field set to 1.5, the Volumes card shows *"1.5 kcal/ml → 190 ml/24h"* with no age-specific message. The only relevant statements are the global disclaimer and `content/base.json` method p6 (L170–171, "densities above 1 kcal/ml require clinical supervision") — both away from the number. GOAL §1 safety: *"Never instruct: concentrating infant formula beyond manufacturer instructions, or adding energy/protein modules to infant feeds, without clinician supervision."* The E card for an infant comes close to instructing (a volume of a 1.5 kcal/ml feed) without attaching the supervisor condition.

**Suggested fix:** when `ageMonths < 12` (and/or chosen density > 1.0 kcal/ml), render a visible caution in the E (and D) card: "For an infant: do not concentrate formula or add modules beyond manufacturer instructions; these volumes assume a prescribed FSMP under dietitian/physician supervision." Consider capping/annotating preset densities by age and moving the p6 sentence into the results area.

---

## CS-3 — MAJOR: Product age limits invisible; no allergen/texture tags or age filter (GOAL §8)

**Location:** `content/products.json` — every item has a `form` field with age suitability (L11 Infatrini "0–18 mies.", L33 Nutrini "1–6 lat", L44/L55, L66 Nutridrink "dzieci", L88 Protifar "UWAGA: nie stosować u dzieci <3 r.ż.", L99/L110 Resource Junior "1+"); `src/ui/main.ts` `renderProducts()` never renders `form`. `content/base.json` taglabels (L194–197) contain no "allergen" and no IDDSI/texture tag; there is no age filter in the products UI.

**Evidence (live site):** the Protifar card shows only *"wysokobiałkowe moduł bez laktozy bezglutenowe doustnie przez sondę **od 3 lat**"* — the explicit contraindication text "nie stosować u dzieci <3 r.ż." is not rendered anywhere. Infatrini's "0–18 mies." and Nutrini's "1–6 lat" are likewise not displayed (only generic `infant`/`child` tags). Nutridrink dla dzieci has no age statement at all in `form`. GOAL §8 requires tags for "IDDSI-friendly texture, allergen, age suitability" and a sortable/filterable list — none of these three is filterable. Mitigation present: the section note says FSMP products are only for use under physician/dietitian supervision (`content/products.json` L2–5).

**Suggested fix:** render `form` (or a dedicated `age` field) on every card and in search text; add allergen and IDDSI/texture tags per GOAL §8 (at minimum: dairy, gluten, nuts/sesame, egg, fish; textures for thickeners/whole nuts/raisins); add an age filter; verify Nutridrink's actual age indication from the manufacturer page before publishing.

---

## CS-4 — MAJOR: No evidence grade on calculator outputs; extrapolation not flagged in results; Methods claim unsupported as written

**Location:** `src/ui/main.ts` results rendering (L273–305) — cards show only `source_ids`; `content/base.json` method p5 (L166–167); sources used by C/D (`src/calc/methods.ts` L107, L225).

**Evidence:** GOAL §1 requires an evidence grade on every claim *shown in UI* and to *"flag extrapolation explicitly"*. Live check: `#results` contains **0** grade badges. The WHS-specific estimates (methods C/D, the site's core outputs) are grade-D extrapolations, yet the results never say so; the word "ekstrapolacja" appears on the whole page only in the Methods section (p5), and p5 claims the values are *"oznaczone w źródłach jako ekstrapolacja"* (marked in the sources as extrapolation). Checking `research/sources.json`: the only note containing that marker is `ds_nutrition_2025` ("flag as extrapolation"), which is **not** a source of the calculator methods; the actual C/D sources (`ni2009_sullivan`, `krick1992`, `schofield1985`, `fao2004`, `who_protein2007`) carry no such note. There is also no legend anywhere explaining A/B/C/D badges (content items do render letter badges).

**Suggested fix:** add a visible grade marker to every calculator card (e.g. "D — ekstrapolacja z populacji NI/CP; brak danych dla WHS" with tooltip); add a short extrapolation sentence inside the C and D cards; either correct p5's "marked in the sources" wording or add explicit extrapolation notes to the relevant source records; add a grade legend to the Sources/Methods section.

---

## CS-5 — MAJOR: Sources section renders "undefined" for every evidence-grade badge

**Location:** `src/ui/main.ts` L545: `` `<span class="badge grade${s.class}">${s.class}</span>` `` vs `src/data/sources.json` field name `evidence_class`.

**Evidence (live site DOM):** first bibliography entry renders as `<span class="badge gradeundefined">undefined</span>`; same for all 44 entries (their verified/accessed status renders correctly). This breaks the required grade display exactly where every claim's traceability lands.

**Suggested fix:** use `s.evidence_class`; add a unit/render test asserting each source renders a badge in {A,B,C,D}. (Also note the grade legend from CS-4 should live here.)

---

## CS-6 — MAJOR: Content promises a WHS-vs-WHO comparison the tool does not compute; no WHS z-score output

**Location:** `content/reasons.json` group "reference" (L116–138), specifically L130 ("kalkulator pokazuje obie ('WHS vs WHO')") and L132 ("Porównaj spadek na siatce WHS ze spadkiem na WHO — **narzędzie liczy proporcje**").

**Evidence:** no code computes any WHS-vs-WHO drop/proportion (grep across `src/` finds the phrase only in the content file). The calculator computes WHS reference values (`src/calc/methods.ts` L270–277 `whsRef`) but never displays them — `whsRef` has zero UI usage (only a unit test, `methods.test.ts` L43–45). There is no WHS z-score/centile function (`src/calc/whs.ts` exposes only `get/sd/range`), so a caregiver cannot learn where the child sits on the WHS chart from the calculator, nor compare drops as instructed. GOAL §5.6 also requires NICE thresholds "mapped to WHS SD charts (document centile-space ↔ SD conversion)" — no such mapping exists in the site content.

**Suggested fix:** either implement it (display WHS reference values/z-position for the entered age/weight in the B or C card, and/or compute the drop comparison) or rewrite L130/L132 to say the user must *visually* compare the two curves in the Charts section. Document the centile-space↔SD conversion per GOAL §5.6.

---

## CS-7 — MAJOR: Catch-up guardrails weak/inconsistent; method D-2 unguarded and shows extreme values

**Location:** `src/calc/methods.ts` D method-2 (L168–199, no guardrail logic), method-1 guardrails (L215–221), rendering in `src/ui/main.ts` L290–295.

**Evidence (live site):** case 18 mo, 4 kg, 80 cm → "D — 2" card shows **"1261 – 1261 – 1261 kcal/24h"** and, only inside collapsed "Jak to policzono", *"per kg actual weight: 315.3 kcal/kg"* — no warning anywhere on that card. Earlier case (12 mo, 5 kg, 70 cm) similarly showed 953 kcal/day = 190.6 kcal/kg. The method-1 guardrail does fire ("catch-up rate above ~20 g/kg/day (FAO optimal-conditions ceiling)" for a 4-week-horizon case) but is rendered inside the collapsed `<details>` on the card, in English, with no action statement — a warning invisible unless the user expands it. GOAL §4.D requires guardrails for catch-up; method 2 has none. The "range" display for D-2 is also degenerate (same value three times), contradicting GOAL §1's "never a single bare number" spirit.

**Suggested fix:** (a) add a guardrail to D-2 (e.g. flag when kcal/kg actual exceeds a source-anchored cautious ceiling, or D-2 > ~1.3× C) with an explicit recommendation ("do not start at this level; titrate under supervision"); (b) raise method-1 guardrail output to a visible banner/callout rather than collapsed details; (c) label D-2 as a scenario value, not a band.

---

## CS-8 — MAJOR: Safety-relevant calculator strings are English-only on the Polish (default) UI

**Location:** hardcoded strings in `src/calc/methods.ts` (notes L108–113, L122–123, L192–196, L227–229; guardrails L215–221; volume flags L250–252) rendered by `src/ui/main.ts`. GOAL §5: "All strings/content in `content/*.json` with `pl`/`en` fields; PL default."

**Evidence (live site, `document.lang = "pl"`):** the Volumes card shows *"volume-limited at 1 kcal/ml: 645 ml/day needed vs 480 ml/day tolerated (feeds x ml/feed) - consider energy densification with clinician guidance"* and *"volume needed (645 ml) exceeds Holliday-Segar maintenance fluid (400 ml) at this density"* in English; the D card guardrail *"catch-up rate above ~20 g/kg/day (FAO optimal-conditions ceiling)"* in English; C/B notes ("Krick-type: … documented deviation", "EFSA/PZH AR not published below 7 months; NASEM used.") in English. These include the calculator's own warning logic — the primary audience (PL caregivers/clinicians) cannot read them without English.

**Suggested fix:** move all calculator note/guardrail/flag strings into `content/base.json` (pl/en) and render `t(...)`; keep formulas/source ids as-is.

---

## CS-9 — MINOR: Composite grade strings in badges

**Location:** `content/rules.json` L19 ("A/B" tube-feeding step), L43 ("A/B" protein), L70 ("D/B" texture/thickening); rendered by `gradeBadge()` (`src/ui/main.ts` L561–565) which styles by first letter but prints the raw string.

**Evidence (live DOM badges from `#rules-body`):** `['B','A','A/B','A','A','B','A/B','B','A','A','A','D/B','B','A','C']`. GOAL §1 defines grades A–D as single categories; "D/B" is ambiguous (is it extrapolation or cohort evidence?).

**Suggested fix:** split each composite claim into its two parts with the single applicable grade, or define composite semantics in the legend.

---

## CS-10 — MINOR: Refeeding banner scope and triggers

**Location:** `src/ui/main.ts` L265–271; text `content/base.json` L106–109.

**Evidence:** banner fires only when length is entered (no prompt to enter length for wasting screening: without it, no wasting screening and no banner) and only at weight-for-length/height z ≤ −3. ASPEN/da Silva risk factors beyond severe wasting (ongoing weight loss, very low intake, low baseline electrolytes) are not covered; the parameters file itself sources the threshold from the SAM refeeding review (`refeeding_children_2025`), not from ASPEN, which the text does not distinguish (acceptable, but the banner could say "risk factors beyond this screen exist"). Verified live: banner appears for 12 mo/5 kg/70 cm; absent for 3 mo/4.5 kg/58 cm (z ≈ −1.8, expected).

**Suggested fix:** add a small hint next to the length field ("enter length to screen for wasting/refeeding risk"); reference the broader risk-factor caveat in the banner or Methods.

---

## CS-11 — MINOR: Silent aspiration not addressed in the aspiration pathway

**Location:** `content/flags.json` L20–27 (coughing/choking/cyanosis/apnoea only); `content/reasons.json` L104–112 (aspiration mentioned as an energy cost, not as a detection pathway).

**Evidence:** the overt-signs pathway is correct and prominent (stop oral feeding, urgent help, swallow assessment before texture changes; also `content/base.json` L56 and `content/rules.json` L65–67). Missing: the classic *silent* aspiration red flags (wet/"gurgly" voice after feeds, recurrent unexplained wheeze or pneumonia, desaturations during feeding) that a hypotonic WHS infant may present before any choking episode — precisely the case where "no overt choke = safe oral feeding" may be wrongly assumed.

**Suggested fix:** add a "week"/"now" item: recurrent chest infections, wheeze or wet voice around feeds → neurologopeda + VFSS/FEES before any texture change or oral feeding increase.

---

## CS-12 — MINOR: Infant allergen-introduction guidance absent; nut-butter caution vague

**Location:** `content/rules.json` infant block L23–32 (only formula concentration and cow's milk); ladder step 1 L11–13 ("gładkie pasty orzechowe — z uwagą na alergeny i konsystencję"); no other allergen content in the site (grep "alergen": one hit).

**Evidence:** ESPGHAN (`fewtrell2017`, already in the source set) advises active introduction of allergenic foods from ~4–6 months, no deliberate delay. The site, aimed at infants with feeding difficulties (exactly the group where families may delay allergens), gives no timing guidance and no texture guidance for nut butters (thin dilutions; never a spoonful/glob for a young infant — aspiration/choking risk).

**Suggested fix:** add 2–4 bullets to the infant block: introduce allergens one at a time, early (from ~6 months / per ESPGHAN window), in age-appropriate textures; nut butters thinned/diluted, never lumps; honey <12 months (CS-1).

---

## CS-13 — MINOR: Height-based kcal/cm presentation and mapping

**Location:** `src/calc/methods.ts` L116–127; `research/data/parameters.json` `height_based_kcal_per_cm` (L124–129).

**Evidence (live site, 18 mo):** C card details show *"kcal/cm: 11.1 → 888 kcal/24h"* — a single bare number, with no note that the same literature spans ≈6–15 kcal/cm by motor function (the range text exists in `heightBased.note` but is only rendered when the method is hidden, i.e. <12 months, `src/ui/main.ts` L288). The parameters' "no_motor_dysfunction: 14.7" value is never selectable (code only uses 11.1 dependent/bedridden and 13.9 crawling/ambulatory), so the mobility→factor mapping is undocumented in the UI. The <12-month note says the derivation "does not cover infants", while `parameters.json` says "derivation in infants unclear" — the stronger claim is not sourced.

**Suggested fix:** in the ≥12-month case show the range caveat ("~6–15 kcal/cm across paediatric NI literature") alongside the value and keep the derivation-age caveat; align wording with `parameters.json`; document which `kcal/cm` category maps to which mobility choice.

---

## Coverage note

**Reviewed:** all five `content/*.json` files (base, flags, reasons, rules, products) item-by-item; `src/calc/*.ts` (types, energy, methods, who, whs, load, tests); `src/ui/main.ts`; `src/data/products_foods.json`, `src/data/sources.json`, `research/data/parameters.json`; `research/evidence-table.md`, `DECISIONS.md`, `README.md`, `REPORT.md`, `research/qa/content-lint-report.md`; and the **built site** (`dist/`, served locally) exercised in a real browser for: honey/Protifar/Infatrini product cards, all three content sections' grade badges, Sources badges, and calculator runs at ages 3/12/18/30 months including values that trigger the refeeding banner, volume flags and catch-up guardrails.

**Checked and found clinically acceptable:** persistent PL/EN disclaimer and "starting estimate" framing; the "never concentrate formula / no modules without supervision" rule itself (`content/rules.json` L26–28, `content/base.json` L55–63); the dysphagia/aspiration *pathway* (urgent stop-and-refer; VFSS/FEES before texture changes); refeeding-syndrome banner logic and its trigger case (verified live); red-flag urgency structure (now/week/visit) and its faltering thresholds as documented in `research/data/parameters.json` ("−1.65 z / −2 z velocity / ≥1 z drop", AAP/NASPGHAN 2026, `faltering_2026`) — these are internally sourced, so only their presentation was judged here; vitamin D/iron/zinc doses vs `parameters.json`; Holliday–Segar values; WHO overlay values on chart 2 spot-checked against published WHO medians/−2SD (3.3464/2.459 kg at 0 mo; 9.648/7.742 kg at 12 mo boys) — correct; WHS digitized anchors match the paper's text means per `provenance.md`.

**Not assessed (other audit roles):** arithmetic re-derivation of A–F and grid values; source-vs-claim citation accuracy; Polish-language quality; accessibility/i18n mechanics beyond the safety strings in CS-8.

**Note on severity calls:** CS-1 is graded critical as a missing *absolute* infant-safety warning in a curated list served to caregivers of infants, not as wrong advice — but it should be fixed before any release. CS-2/CS-3/CS-7 are the other safety-relevant must-fix items; CS-4/CS-5/CS-6 concern the project's own evidence-transparency hard rules.
