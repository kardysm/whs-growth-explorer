# Round 2 — Clinical-safety review (paediatric gastroenterology + clinical dietetics)

**Role:** independent clinical-safety reviewer (round 2, fresh context), per GOAL.md §7.1 role 2.
**Date:** 2026-10-02. **Repo:** `/opt/data/whs-growth-explorer` (not under git).
**Method:** read all five `content/*.json` (PL+EN), `src/calc/*.ts`, `src/ui/main.ts`, `src/data/*` (products_foods, sources, parameters); served the built site (`dist/`, bundle contains the round-1 strings) on `http://localhost:8793` and exercised every round-1 claim plus new boundary/state cases in a real browser (headless Chromium harness; calculator inputs set through the same `change` events a user produces — the staleness case below was additionally reproduced with real typing + blur). Round-1 artifacts (`review/round-1-clinical-safety.md`, `review/round-1-resolution.md`) were used as leads only; every claim below was re-verified against the artifacts and the live site.
**Out of scope (other roles):** numeric re-derivation (math), source-vs-claim accuracy (citation), Polish/EN language quality (UX/i18n). Overlaps are flagged inline.

**Severity summary (new findings): 1 critical, 5 major, 5 minor.**
Round-1 verdict: **6 of 7 target fixes verified complete; 1 complete-in-trigger but incomplete in coverage (R2-2); 2 round-1 minors not actually resolved as specified (CS-10 → now R2-6; CS-3 texture part → R2-5).**

| ID | Sev | One-line |
|---|---|---|
| R2-1 | **critical** | Age 0–2 mo (WHS-typical lengths): C shows 28–34 kcal/day (≈9 kcal/kg), D 51–68, volumes 19–42 ml — no warning, physiologically impossible as a feeding target |
| R2-2 | major | Infant densification caution only fires when the *input* density >1.0; the E table (and chart 3) always display the 1.5 kcal/ml preset for infants, un-caveated at the default 1.0 |
| R2-3 | major | Calculator input changes do not refresh Charts/Table; chart heading keeps the old age; "same numbers in three places" broken (C 546 card vs 304 table at age 30) |
| R2-4 | major | Boys <3 y: C is effectively weight-independent (2 kg → 303, 10 kg → 305 at 6 mo) — undisclosed; contradicts the tool's dietitian-titration framing |
| R2-5 | major | Product list: no texture/choking-hazard notes and no IDDSI texture tags (whole nuts, raisins, dates, raw carrot/apple, berries) — GOAL §8; round-1 CS-3 only half-fixed |
| R2-6 | major | Refeeding screen requires length; severely wasted inputs without length (18 mo / 4 kg, WFA z ≈ −9) get no banner while D reaches 831 kcal/day (208 kcal/kg) |
| R2-7 | minor | D-2 scenario qualifier hidden when <167 kcal/kg; D-2 guardrail is duplicated onto the D-1 card |
| R2-8 | minor | Table hint lacks the WHS-mean-length assumption disclosure (math-F1 disclosure incomplete: chart hint has it, table does not) |
| R2-9 | minor | New allergen rule lacks texture guidance (round-1 CS-12 partially implemented); window wording "do 12. mies." is broader than ESPGHAN 4–6 mo |
| R2-10 | minor | Items that explicitly say "extrapolation" in text carry a C badge (seizures, cardiac-load); GOAL §1 maps extrapolation to D |
| R2-11 | minor | Empty B card ("—") explanation only inside collapsed details; E volume flags appear only when optional feeds/ml are entered |

---

## Part A — Round-1 fix verification (live `dist/`, both languages)

**(1) Honey card — VERIFIED.** PL card: *"Miód NIE dla dzieci poniżej 12. miesiąca życia — ryzyko botulizmu niemowlęcego (zarodniki Clostridium botulinum)."* + tag *"od 12. mies."*; EN: *"NOT for children under 12 months — infant botulism risk…"* + *"age 12+"*; rendered as `banner crit` above the macros. Search: PL "botulizm" → rules item *"Miodu nie podawaj dziecku poniżej 12. miesiąca życia"* (`aap_botulism`, grade A) + the honey product; EN "botulism" → same pair. `products_foods.json` item has `warning` + `age-12plus`; no other `sweets` item exists.

**(2) Infant densification banner — VERIFIED for the specified trigger; INCOMPLETE coverage (see R2-2).** age 3 mo + density 1.5 → visible warn banner in the E card: *"NIEMOWLĘ: nie zagęszczaj mleka modyfikowanego ponad instrukcję producenta i nie dodawaj modułów energetycznych/białkowych bez nadzoru klinicznego. Objętości przy gęstości >1 kcal/ml zakładają produkt specjalistyczny…"* (EN identical in meaning). But with age 3 mo and density 1.0 the E table still shows the preset *"1,5 kcal/ml → 139 ml"* row with no caution anywhere — see R2-2.

**(3) Grade badges + extrapolation notes — VERIFIED.** `#results` badges in PL and EN: `["A","A","D","D","D"]` on cards A, B, C, D, D—2. C, D and D—2 each render the visible line *"D — ekstrapolacja z populacji z niepełnosprawnością neurologiczną / MPD; brak badań wydatku energetycznego w WHS."* (`calc.extrapolation_note`). Content-side D audit (all grade-D items render their D badge): flags 2×D (`flag-now-i0`, `flag-visit-i3`), reasons 2×D (measurement-error item; "no single cause" item), rules 0×D, sources 1×D source badge; item-level caveats → R2-10.

**(4) D-2 scenario guardrail (18 mo, 4 kg, 80 cm) — VERIFIED.** Two visible `banner warn`s fire: *"Metoda D-2 (scenariusz): ~315 kcal/kg aktualnej masy — powyżej maksimum tabeli TRS 935 (~167 kcal/kg/d). Nie zaczynaj od tego poziomu; to wartość orientacyjna do stopniowego dochodzenia pod nadzorem."* (one on the D card via the shared alerts list, one on the D—2 card) and the refeeding `banner crit`. D—2 shows *"1261 – 1261 – 1261 kcal/24h"*. Duplication + hidden scenario label → R2-7.

**(5) Sources badges — VERIFIED.** 47/47 badges render with classes: A 19, B 13, C 14, D 1 (matches `sources.json`); zero "undefined"; zero "UNVERIFIED"; page-wide `undefined`/`NaN` scan clean. Legend ("Klasy dowodów…") present above the list.

**(6) Product age/form lines + allergen tags — VERIFIED (form/allergens); texture part missing → R2-5.** Protifar card: *"proszek 225 g — UWAGA: nie stosować u dzieci <3 r.ż."*, tag *"od 3 lat"*, allergen tag *"mleko"*; almonds: *"orzechy"*; fish items *"ryby"* etc. `form` is rendered and searchable; no dedicated allergen filter (documented deferred minor).

**(7) New content items — VERIFIED present, readable, searchable.** Flag (`week`): *"Ciche aspiracje (bez kaszlu): nawracające infekcje oddechowe, chrypka lub „mokry” głos po jedzeniu mogą sugerować aspirację — poproś o ocenę połykania (VFSS/FEES)."* (grade B, sources romano2017, iddsi) — found via search "ciche aspiracje"/"aspiracje". Rules (infant block): honey rule (aap_botulism, A) + *"Alergeny pokarmowe wprowadzaj w zalecanym oknie czasowym (od ~4.–6. do 12. mies.), pojedynczo i w małych ilościach — nie odraczaj ich wprowadzania bez powodu medycznego (ESPGHAN)."* (fewtrell2017, A). Wording nits → R2-9.

---

## Part B — New findings

### R2-1 — CRITICAL: ages ~0–2 months produce a physiologically impossible "maintenance" estimate with no warning

**Location:** `src/calc/methods.ts` C/D (Schofield boys 0–3 y height term collapse against the WHS mean length default, `defaultLengthCm`), rendered by `src/ui/main.ts` cards C/D/E with the default WHS-mean-length substitution; no guardrail condition covers it.

**Evidence (live site, PL, defaults = hypotonic/dependent):**
- age 0 mo, 3 kg, no length → C card: **"28 – 28 – 34 kcal/24h"** (≈9 kcal/kg/d; the details say *"% A: 7%"*), D card **"51 – 56 – 68 kcal/24h"**, E card **"0,67 → 42 · 1,0 → 28 · 1,5 → 19 ml/24h"** against 300 ml maintenance fluid. **No banner anywhere** (banners list empty; the C card has no alerts by construction). The same child's A card reads 423–518 kcal/day, so the tool contradicts itself by ~93% between two visible cards.
- Sweep (boys, no length): age 0→28, 1 mo→88, 2 mo→148, 3 mo→208 kcal/day; girls age 0→105–128. The collapse is the documented Schofield boys 0–3 y fragility at short lengths (round-1 math audit F1 noted "neither default is a trustworthy stand-in there"), but the round-1 F1 fix *changed the default to WHS mean length* (42.4 cm at month 0), which **deepens** the month-0 collapse (~151 kcal/day under the old WHO-length default → ~28 kcal/day now) and added no mitigation.
- Neither `README.md` "Known limitations" nor `DECISIONS.md` discloses this.

**Why critical:** WHS infants (often SGA, feeding difficulties) are the core audience; a caregiver who reads "C — zapotrzebowanie podstawowe 28 kcal/24h (28 ml pokarmu)" can underfeed a newborn catastrophically. The general disclaimer and the neighbouring A card mitigate, but an impossible number presented as maintenance is exactly the class of output the project's safety rules exist to prevent.

**Suggested fix (pick one or combine):** (a) guardrail banner on the C (and E/D) card when the Krick-type estimate is implausible — e.g., `ageMonths < 6` and (C < 0.5 × A or C/weight < 40 kcal/kg) → "estimate unreliable at this age/length; do not use as a feeding target; discuss with the dietitian"; (b) gate C to `ageMonths ≥ 3` (or require a measured length <~3 mo) with the reason shown, as is already done for the kcal/cm method <12 mo; (c) show the per-kg value in the C card so the implausibility is visible. Add a regression test for month 0–2 outputs.

### R2-2 — MAJOR: densification caution does not cover the E-table presets / chart 3 (round-1 CS-2 incompletely fixed)

**Location:** `src/ui/main.ts` E card (condition `input.age < 12 && input.density > 1.0` for `calc.infant_density_caution`), E table (`byDensity` always includes `1.5`), chart 3 (always plots the 1.5 line, `base.json` `charts.chart3_hint`).

**Evidence:** age 3 mo, 4.5 kg, **density 1.0** (the app default) → E card shows *"0,67 → 310 · 1,0 → 208 · 1,5 → 139 ml/24h"* and **no caution banner**. Setting density to 1.5 does show the caution — the banner keys off the user's chosen density, not off the >1.0 rows actually displayed. Chart 3's hint repeats the 0.67/1.0/1.5 presets with no infant caveat. A caregiver can therefore read "my 3-month-old needs 139 ml at 1.5 kcal/ml" in a fully un-caveated state — the exact scenario round-1 CS-2 was raised for (concentrating formula is never acceptable for infants without supervision).

**Suggested fix:** trigger the caution whenever `age < 12` and the UI displays any density >1.0 (i.e., always for infants — the presets include 1.5), or annotate the 1.5 row inline ("only a prescribed FSMP, under supervision") and add the same caveat to chart 3's hint/footnote.

### R2-3 — MAJOR: calculator changes don't propagate to Charts/Table; stale age in the chart heading

**Location:** `src/ui/main.ts` `read()` (form `change` → `recalc()` only); `drawCharts()` runs only on boot, chart-1 click, table-row click, theme toggle; `renderTable()` only on boot, chart-1 click, table-row click, sort; the chart heading is rendered once by `renderChartsShell()`.

**Evidence (real typing into `#in-age` = 30, blur):** calculator card C = **"546 – 546 – 668"** (age 30), chart heading still *"Energia vs masa ciała (w wieku 18 mies.)"*, table row 8.00 kg still `A 597 · B 604 · C 304 · D 304` (previous age-6 values; at age 30 the same calculator produces C=546). Table hint promises *"wiek i płeć jak w kalkulatorze"*. Clicking a table row refreshes table data but **not** the heading (it keeps the boot age until reload). This breaks GOAL §9 ("same numbers on hover, in table, in cards") and can put a wrong-age C value in front of someone dosing per kg. Overlaps the UX/math remits but is reported here as a misinforming-numbers defect.

**Suggested fix:** in `read()`/`recalc()` also call `drawCharts()` + `renderTable()` (and re-render the chart titles/hints with the current age/density); add a DOM test that the three surfaces agree after an input change.

### R2-4 — MAJOR: boys <3 y — C barely responds to weight; not disclosed

**Location:** `src/calc/methods.ts` C (Schofield weight+height, boys 0–3 y coefficient 0.167 kcal/kg as published in EFSA App. 13); disclosure only in `base.json` method p2 ("highly length-sensitive").

**Evidence (live, boys, no length):** age 6 mo — C(2 kg) = **303–303–371**, C(10 kg) = **305–305–372**: +0.7% across a 5× weight span (girls at the same ages: 225 vs 541, i.e. normal). Round-1 math audit F1 documented this ("nearly independent of weight… +0.7% across a 10-fold weight range") but the F1 resolution only disclosed the length assumption, not the weight-insensitivity. Caregivers are told to titrate C with the weight trend; for boys <3 y the number will not move with weight.

**Suggested fix:** add a C-card note for `boys && age < 36`: "the boys' Schofield 0–3 y equation is only weakly weight-dependent (source coefficient), so C changes little with weight — read it together with the %A/%B and the weight trend"; or display the per-kg value to make the insensitivity visible.

### R2-5 — MAJOR: product list — no texture/choking-hazard notes, no IDDSI texture tags (round-1 CS-3 residual; GOAL §8)

**Location:** `src/data/products_foods.json` / `buildProducts()` / cards; `base.json` taglabels (no texture tag exists).

**Evidence:** item cards carry composition, allergen tags and FSMP `form`, but texture-safety information is absent. Concretely, for a hypotonic/dysphagia-prone population (and infants in scope): **whole almonds, walnuts, raisins, dates, raw "Marchew" (USDA "Carrots, raw"), raw apple, raw blueberries, sunflower/pumpkin seeds** — no choking-hazard note, no age note, no texture tag; "Masło orzechowe (gładkie)" has no "thin for infants/young children" note. The only texture guidance is the ladder step-1 phrase *"gładkie pasty orzechowe — z uwagą na alergeny i konsystencję"*. GOAL §8 explicitly requires an "IDDSI-friendly texture" tag; round-1 CS-3 asked for texture tags; the fix log claims only allergen tags.

**Suggested fix:** add texture/risk notes per item (whole nuts → ground/smooth only <4 y or dysphagia; dried fruit/hard raw foods → soft, cooked, cut; nut butter → thinned), and a small texture tag set (e.g., "gładkie/miksowane" / "twarde — ryzyko zadławienia"); surface the choking warning in the search index too.

### R2-6 — MAJOR: refeeding screen silently skips children when length is not entered (round-1 CS-10 not implemented as specified)

**Location:** `src/ui/main.ts` refeeding banner (needs `input.length`), calc form (no hint at `in-length`), round-1 resolution row CS-10 (rewritten to a different issue than the finding's text).

**Evidence:** 18 mo, 4 kg, **no length** (a real use: caregiver doesn't know length) → **no banner at all**; D card **"651 – 683 – 831 kcal/24h"** = 163–208 kcal/kg actual, and the rate-based guardrails don't fire (target 7.01 kg over 12 weeks = 35.8 g/day ÷ 4 kg = **8.95 g/kg/d** < 10). The same child with 80 cm entered fires the refeeding banner. WHO tables: 4 kg at 18 mo is WFA z ≈ **−8.95** (−3 SD = 7.8 kg); at 80 cm, WFL z ≈ −13.8 (−3 SD = 8.2 kg). The length field label is only *"Długość/wzrost (cm, opcjonalnie)"* and the calculator hint says nothing about wasting screening — so the screen is silently disabled in exactly the state where its trigger would fire.

**Suggested fix:** (a) fallback screen using weight-for-age z ≤ −3 when length is missing (or at least a warning "enter length to screen for wasting/refeeding risk"); (b) small hint next to the length field; (c) consider a per-kg ceiling guardrail on D-1 as already exists for D-2.

### R2-7 — MINOR: D-2 presentation (scenario label hidden; guardrail duplicated)

**Location:** `main.ts` D-2 card (`extrapolation_note` + filter for "D-2" in shared guardrails), `methods.ts` guardrails list.

**Evidence:** at 18 mo / 8 kg / 80 cm the D—2 card shows **"827 – 827 – 827 kcal/24h"** with no visible qualifier; the "scenario value — single number, not a range" note is only inside the collapsed details, and the >167 guardrail obviously doesn't fire (103 kcal/kg). In the 4 kg case the same "D-2" guardrail banner is rendered on **both** the D-1 and D-2 cards (the D card passes the whole guardrails array).

**Suggested fix:** move the "wartość scenariuszowa" line out of `<details>` onto the card face; filter the D-2 guardrail out of the D-1 alerts (or render it once).

### R2-8 — MINOR: WHS-mean-length disclosure missing in the Table hint

**Location:** `base.json` `table.hint` vs `charts.chart1_hint`.

**Evidence:** the math-F1 resolution says the default-length assumption is disclosed in "UI notes, chart hint, grid meta and REPORT". Chart 1's hint does (*"bez wpisanej długości przyjmowana jest średnia długość WHS dla wieku"*), the table hint (*"Wiersze: masy 2–20 kg; wiek i płeć jak w kalkulatorze…"*) does not, although the table columns C/D are exactly the affected values.

**Suggested fix:** append the same one-liner to `table.hint` (both languages).

### R2-9 — MINOR: new allergen rule — texture nuance and window wording

**Location:** `content/rules.json` infant block, allergen item (new in round 1).

**Evidence:** items read well and are sourced (fewtrell2017). Round-1 CS-12 asked for "age-appropriate textures; nut butters thinned/diluted, never lumps" — the implemented text has "*pojedynczo i w małych ilościach*" but no texture line (relevant for the nut/sesame pastes whose product cards are also silent — see R2-5). The window "*(od ~4.–6. do 12. mies.)*" reads as if allergens may be introduced as late as 12 months; ESPGHAN's window is introduction around 4–6 months with no delay beyond 6 months.

**Suggested fix:** add "; introdukuj w bezpiecznej konsystencji (np. gładkie pasty rozcieńczone — nigdy grudki lub całe orzechy)" and tighten the window wording ("nie wcześniej niż po 4. mies.; nie odwlekaj po 6. mies.").

### R2-10 — MINOR: extrapolation sub-claims inside C-graded items

**Location:** `content/reasons.json` group `requirements` items 0 and 2.

**Evidence:** both items say in-text that the energy part is an extrapolation (*"Hipoteza podniesionego wydatku energetycznego przy napadach to ekstrapolacja"*; *"ekstrapolacja z innych populacji"*) but carry grade **C** badges. GOAL §1 defines D = "expert opinion or extrapolation from another population". The text flags the nuance, so risk is low, but the badge semantics conflict; a reader trusting the C badge reads the energy claim as WHS-cohort evidence.

**Suggested fix:** split the composite claims or mark them "C/D" with a hover note — or apply D to the extrapolated sentence in a split item.

### R2-11 — MINOR: explanations hidden in collapsed details for empty/incomplete cards

**Location:** `main.ts` B card; E card `volumeFlags`.

**Evidence:** with weight outside the WHO 0–60 mo table (2 kg at 2 mo; 20 kg at 48 mo), card B renders *"wiek masowy: — mies."*, value "—", grade badge A, and the explanation only inside *"Jak to policzono"*. Similarly the E-card "volume-limited / exceeds maintenance fluid" flags appear only when the optional feeds/ml fields are filled — a 12 kg, 48 mo child at the default density shows 1227 ml at 0.67 kcal/ml against 1100 ml maintenance with no flag.

**Suggested fix:** show these notes as visible small text, not only in `<details>`.

---

## Checked and found clinically acceptable (round 2)

- Persistent PL/EN disclaimer + "starting estimate to be titrated by the dietitian" framing; `start.safety` block (formula concentration, aspiration pathway, refeeding).
- Refeeding banner logic (when length is given), dysphagia/aspiration pathway (overt + now silent aspiration), meds item ("never change doses on your own"), monitoring bands, micronutrient doses vs `parameters.json`/PZH (iron 7/11 and 3/7 mg, zinc 2.5/3 mg, vit D 400–600 IU ≤1 y / 600 IU 1–3 y — consistent between `rules.json`, `reasons.json`, `parameters.json`), Holliday–Segar values (4 kg → 400 ml; 12 kg → 1100 ml; 20 kg → 1500 ml; 25 kg → 1600 ml).
- No `NaN`/`Infinity`/`undefined` in any tested state (ages 0–48, weights 1–25 kg); ranges ordered low ≤ central ≤ high; the D-2 >167 guardrail and A/B/C/D badge rendering correct in PL and EN.
- Search surfaces the honey rule/product, silent aspiration, section entries; EN mirrors PL for all new safety strings.
- Products: FSMP forms and allergen tags verified; honey the only `sweets` item and the only `warning` item; FSMP supervision note present at section top.

## Coverage note

**Verified on the live built site (`dist/` served locally, bundle confirmed to contain the round-1 strings):** all seven round-1 claims above; calculator runs at ages 0/1/2/3/4/5/6/7/12/14/18/30/48 months; weights 1/2/3/4/4.5/5/8/10/12/20/25 kg; densities 1.0 / 1.5 / 2.0 (plus the displayed 0.67/1.0/1.5 preset rows); both sexes; PL and EN; sources section (47 badges, legend); products (honey, Protifar, almonds, milks, FSMP list rendering); flags/rules/reasons sections item-by-item; global search (botulizm, aspiracje, żelazo).

**All five `content/*.json` scanned** (PL+EN, manual read + keyword sweep for supervision/instruction language in feeding/texture/supplement/medication advice). Findings above are the residual issues; the rest of the corpus keeps its caveats ("pod nadzorem klinicznym", "nigdy nie zmieniaj dawek samodzielnie", "decyzja zespołu", "dawki ustawia dietetyk"). One wording note (not raised as a finding): the GERD item's *"próba leczenia próbnego wg wytycznych"* could read as self-initiated treatment — suggest "leczenie próbne prowadzone przez gastroenterologa" in a future pass.

**Not assessed (other roles):** quantitative re-derivation of A–F (math auditor — but note R2-1/R2-4 were identified by round-1 math F1 as consequences, and are raised here in their clinical presentational form); source-vs-claim accuracy; Polish language quality; link checks; accessibility.

**Environment:** Chromium harness, headless; calculator states set via the page's own `change` event handlers (one case additionally via real typing + blur to confirm R2-3); HTTP server `python3 -m http.server 8793` on `dist/`.
