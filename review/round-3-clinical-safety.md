# Round 3 — Clinical-safety confirmation review (paediatric gastroenterology + clinical dietetics)

**Role:** independent clinical-safety auditor, round 3 (final confirmation), per GOAL.md §7.1 role 2.
**Date:** 2026-10-02. **Repo:** `/opt/data/whs-growth-explorer` (not under git).
**Build audited:** `dist/` served at `http://localhost:8793` (`python3 -m http.server 8793`); bundle `assets/index-jIC4ApPq.js`, sha256 `3d3ab94c5fdf662dc253b66648535ed6715e48ffa67c641b2f710f6f7d0d1462` (built 18:16 from the 18:10–18:11 sources; confirmed to contain the round-2 strings "Metoda D-1:", "NIEMOWLĘ: nie zagęszczaj", "ryzyko zadławienia").
**Method:** live site in headless Chromium; calculator inputs set through the page's own `change` handlers (the same events a user produces); every number re-read from the DOM; both PL and EN. Round-1/2 artifacts (`review/round-1-*.md`, `review/round-2-*.md`, resolution logs) were used as leads only; every claim below was re-verified against the live build.
**Out of scope (other roles):** numeric re-derivation (math), source-vs-claim accuracy (citation), PL/EN language quality, accessibility (UX/i18n).

**Severity summary (new findings): 0 critical, 1 major, 5 minor.**
**Round-2 fixes: 5 of the 6 checklist areas verified as specified (R2-2, R2-6, D-1/D-2, R2-3 propagation, R2-1 card-level suppression/alert); R2-1's "no numbers anywhere" expectation fails on the charts/table and R2-3's cross-surface agreement fails in the shipped default configuration (R3-1); R2-5 is complete for 9 of the 10 listed items — blueberries were dropped (R3-3).**

---

## Part A — Round-2 fix verification (live `dist/`, PL unless noted)

### (1) R2-1 — validity guard on method C

**VERIFIED on the cards; FAILS the "no numbers anywhere" part on the charts/table (→ R3-1).**

- **Age 0 mo / 3 kg / no length (boys, hypotonic/dependent):** C card **"28 – 28 – 34 kcal/24h"** with a *visible* `banner warn`: *"Wartość C (28 kcal/24h) poniżej wiarygodnego zakresu dla tego wieku i (krótkiej) długości — u chłopców <3 lat równanie Schofielda opiera się tu niemal wyłącznie na długości. NIE używaj C jako celu żywienia; oprzyj się na A/B i ocenie klinicznej."* (`getClientRects` + computed display confirm visibility). C details are null-guarded ("% A: 7%, % B: —%"). E card shows the infant caution (age < 12).
- **Age 18 mo / 8 kg / length 30 cm:** C **"—"** + visible *"Model poza zakresem dla podanych danych (BMR ≤ 0) — nie podajemy wartości; sprawdź długość i masę ciała i oprzyj się na A/B oraz ocenie klinicznej."*; D **"—"** + visible *"Masa docelowa nie przewyższa obecnej…"* and *"D pominięte: C jest poza zakresem modelu dla tych danych (patrz karta C)."*; D-2 **"—"** ("wymaga masy w zakresie WHO oraz podanej długości"); E table all three rows **"—"**. **But** the chart data table ("Dane wykresu w formie tabeli") and the section-4 table still show **C = 504, D = 504 kcal/24h at 8 kg** (all weights likewise), and the C card's collapsed details still show **"kcal/cm: 11,1 → 333 kcal/24h"** computed from the entered 30 cm — i.e. numbers for this state remain on other surfaces (see R3-1; details-level number noted there).
- **Girls, age 0 mo / 3 kg / no length:** alert fires — C **"105 – 105 – 128 kcal/24h"** + the same visible warning. **VERIFIED** (the wording is boys-specific → R3-2; EN identical: *"the boys' Schofield <3 y equation rests almost only on length here"*).

### (2) R2-2 — densification cautions

**VERIFIED.**
- Age 3 mo / 4.5 kg / density **1.0**: E card shows the visible banner *"NIEMOWLĘ: nie zagęszczaj mleka modyfikowanego ponad instrukcję producenta i nie dodawaj modułów energetycznych/białkowych bez nadzoru klinicznego. Objętości przy gęstości >1 kcal/ml zakładają produkt specjalistyczny zalecony przez lekarza lub dietetyka."* — fires for every age < 12 regardless of the chosen density (also verified at age 0), and the 1.5 kcal/ml preset row is displayed under it.
- Age 24 mo / 10 kg / density **1.5**: visible *"Gęstość >1 kcal/ml wymaga nadzoru klinicznego (produkt specjalistyczny zalecony przez lekarza/dietetyka)."*; at 24 mo / density 1.0 no banner (no over-firing).

### (3) R2-3 — calculator → charts/table propagation

**VERIFIED for propagation; cross-surface agreement holds only while the length field is empty (→ R3-1).**
- State A: age 30 mo / 8 kg / **no length** → chart heading *"Energia vs masa ciała (w wieku 30 mies.)"*; table row `8,00 | A 1101 | B 604 | C 617 | D 637 | fluid 800 | ml 617`; chart data w=8 → C 617 / D 637; cards A 1101, B 604, C 617, D 633–637–778. All agree.
- State B: age 6 mo / 12 kg / no length → heading *"…w wieku 6 mies."*; row `12,00 | 597 | 1012 | 305 | 305 | 1100 | 305` = cards (A 597, B 1012, C 305, D 305).
- **With the shipped default length (field pre-filled "74"):** 18 mo/8 kg → card C **547** vs table/chart C **504**; 30 mo/8 kg → card C **547** vs table C **617**. Agreement fails in the default configuration (R3-1).

### (4) R2-5 — choking/texture warnings on food cards

**9 of 10 listed items VERIFIED; blueberries missing (→ R3-3).**
- `#prod-food-almonds`, `-walnuts` (orzechy + ryzyko zadławienia + *"całe orzechy — podawaj wyłącznie zmielone lub na gładko…"*); `-raisins`, `-dates` (*"suszone owoce — miękkie, drobno pokrojone…"*); `-carrot`, `-apple` (*"podawaj ugotowane/starte, nie surowe kawałki…"*); `-sunflower`, `-pumpkin-seeds` (*"nasiona — mielone, nie całe…"*); `-peanut-butter` (ryzyko zadławienia tag + *"rozcieńczaj do gładkiej konsystencji… nigdy grudki"*). All badges/banners visible; product search "zadławienia" returns exactly these 9.
- `#prod-food-blueberry` ("Borówka amerykańska / Blueberries"): **zero badges, zero banners** — no choking note, no tag, absent from the "zadławienia" search results.

### (5) R2-6 — refeeding screen without length

**VERIFIED.** Age 18 mo / 4 kg / **no length** → visible `banner crit`: *"UWAGA: masa ciała względem długości (lub względem wieku, gdy brak długości) jest bardzo niska (poniżej −3 SD / ostre wyniszczenie)…"*; additionally the new D-1 ceiling banner *"Metoda D-1: ~171 kcal/kg aktualnej masy…"* fires in this state (D = 651–683–831).

### (6) D-1 / D-2 banners and the visible scenario line

**VERIFIED.** Age 18 mo / 4 kg / 80 cm:
- D card: only *"Metoda D-1: ~206 kcal/kg aktualnej masy — powyżej górnego zakresu tabeli TRS 935 (~167 kcal/kg/d dla składu 73:27). Zwiększaj stopniowo, pod nadzorem."* (no D-2 banner on this card).
- D-2 card: only *"Metoda D-2 (scenariusz): ~315 kcal/kg aktualnej masy — … Nie zaczynaj od tego poziomu; to wartość orientacyjna do stopniowego dochodzenia pod nadzorem."* (no D-1 banner on this card), band "1261 – 1261 – 1261", and the **visible scenario line**: *"Wartość scenariuszowa — pojedyncza liczba, nie pasmo; cel = masa odpowiednia do długości."* (on the card face, not only in `<details>`).
- Cross-check at 18 mo / 8 kg / 80 cm (no guardrails): scenario line visible, band "827 – 827 – 827".

---

## Part B — New findings

### R3-1 — [major] Charts and Table always use the WHS mean length; the calculator (cards + E) uses the entered length → the three surfaces disagree, including the shipped default state; the hint wording covers only the no-length case

**Location:** `src/ui/main.ts` `drawCharts()` (each weight computed with `lengthCm: null`), `renderTable()` + `src/data/grid.json` (precomputed at WHS mean length), hints `charts.chart1_hint` / `table.hint`; default `input.length = 74` (main.ts l. 49).

**Evidence (live):**
- **Default/boot state** (age 18 mo, 8 kg, length field = "74"; WHS mean length at 18 mo is 71.396 cm per the digitized Antonius data): C card **"547 – 547 – 669 kcal/24h"** while the table row `8,00` shows **C 504 / D 504** and the chart data table shows **C 504 / D 504** at 8 kg. Two different "C" values for the same child on one page, before any input is touched.
- **Entered 65 cm** (plausible short length): C card **400 – 400 – 488** (E card uses it: "1 kcal/ml | 400"); table/chart C **504** → Δ ≈ 26 % between surfaces.
- **Entered 30 cm** (the R2-1 suppression case): cards C/D/E all "—" with alerts, but the chart data and the table still show **C 504 / D 504** at 8 kg — the "no numbers anywhere (charts)" expectation fails.
- **Wording:** `chart1_hint` — *"…bez wpisanej długości przyjmowana jest średnia długość WHS dla wieku…"*; `table.hint` — *"…bez wpisanej długości kolumny C/D liczone są ze średniej długości WHS dla wieku."* Both imply that an entered length is used when present; in fact the entered length is never used by the chart or table. This contradicts GOAL §9 ("same numbers on hover, in table, in cards") and the README/M-F1 framing "entering a measured length replaces it".
- **Details-level:** at 30 cm the C card's collapsed "Jak to policzono" still shows **"kcal/cm: 11,1 → 333 kcal/24h"** (Culley sub-method computed from the implausible length; not gated by the R2-1 validity guard).

**Suggested fix:** (a) preferred — pass the entered length into the chart series and the table rows (the chart already recomputes per weight on every change; the table can recompute its rows the same way) so cards/table/chart show the same numbers; or (b) if the mean-length reference scenario is intended, state it explicitly in both hints ("tabela i wykres zawsze używają średniej długości WHS dla wieku — niezależnie od wpisanej długości"), add a visible C-card note when the entered length ≠ WHS mean, and consider not pre-filling "74" (or pre-filling the current-age WHS mean) so the default state cannot silently mismatch.

### R3-2 — [minor] The sub-6-month C alert explains the boys' equation even when it fires for girls

**Evidence:** girls 0 mo / 3 kg / no length → alert text *"…u chłopców <3 lat równanie Schofielda opiera się tu niemal wyłącznie na długości…"*; EN *"…the boys' Schofield <3 y equation rests almost only on length here."* For a girl the boys-specific rationale is wrong (the girls' trigger is the < 40 kcal/kg branch; the girls' equation is not the collapsed one). The guard itself fires correctly and the advice ("do not use C as a target") is appropriate. **Fix:** make the explanation sex-aware or neutral ("przy tej długości równanie dla tego wieku jest skrajnie czułe… / at this age and length the estimate is at the edge of the model").

### R3-3 — [minor] Blueberry card has no choking warning or tag (an explicitly listed R2-5 item left unfixed)

**Evidence:** `#prod-food-blueberry` renders no badge and no banner on the live site; the nine other R2-5 items all show "ryzyko zadławienia" + a per-item warning; product search "zadławienia" returns exactly 9 items (blueberry absent). R2-5's own item list included "raw blueberries". **Fix:** add the warning + tag (e.g. "całe jagody — przekrój/rozgnieć dla małych dzieci; dysfagia wg IDDSI").

### R3-4 — [minor] The D-2 card shows a catch-up protein number even when the D-2 value itself is "—"

**Evidence:** 18 mo / 4 kg / no length → D-2 card: *"wymaga masy w zakresie WHO oraz podanej długości"*, band "—", then a visible *"białko: 10,4 g/24h (2,61 g/kg/24h)"*; same pattern at 0 mo / 3 kg (*"białko: 3,6 g/24h (1,19 g/kg/24h)"*). The protein is derived from the D-1 target gain (WHO TRS 935 table) but is rendered on the D-2 card; a protein target next to a withheld energy value reads as a plan. **Fix:** render the protein line on the D (D-1) card, or only when the D-2 scenario has a value, and label which method it belongs to.

### R3-5 — [minor] The C plausibility guard is age-bounded and C-only: implausible-high C/weight at ≥ 6 mo is unflagged, and derived D/E numbers stay unflagged when the < 6-mo guard fires

**Evidence (boundary sweep):** 48 mo / 2 kg → C **"610 – 610 – 746 kcal/24h"** (≈ 305 kcal/kg) with no C-level caution — the refeeding `crit` banner, the ">20 g/kg" tempo banner and the "Metoda D-1: ~532 kcal/kg" banner do fire, but the C card itself is silent (the guard condition is `ageMonths < 6`). Same pattern: 36 mo / 3 kg → C 625 (≈ 208 kcal/kg); 48 mo / 4 kg → C 653 (≈ 163 kcal/kg). Sub-6 mo: at 0 mo / 3 kg the alert names only C, while D (51–56–68 kcal/24h) and the E volumes (84/56/37 ml) remain unflagged; likewise at 0 mo / 2 kg (D 100–115–139). Round-2 math already recorded the extreme grid corner (32 mo / 2 kg → 315.7 kcal/kg) as an "implausible cell"; from the clinical side I recommend extending the R2-1 guard (e.g. flag/suppress when C/weight > ~150–200 kcal/kg or weight-for-age z ≤ −5, at any age) and carrying the caution to the derived D/E numbers when it fires.

### R3-6 — [minor] B-card "—" explanation is still only inside collapsed details (the R2-11 fix is not observable for B)

**Evidence:** 48 mo / 20 kg and 2 mo / 2 kg, no length → B card visible text is only *"(wiek masowy: — mies.) A / — / Jak to policzono"*; the explanation *"Wprowadzona masa poza zakresem siatek WHO 0–60 mies. (masa do wieku)."* appears only after expanding the collapsed details (`details.open = false`; not in `innerText`). The D-2 empty-card note **is** visible, so the resolution log's "B/empty-card notes render visibly" holds for D-2 but not for B. **Fix:** render the B note as visible small text when the band is null.

---

## Part C — New checks

### Boundary sweep (ages 0/1/48; weights 2/20; density 2.0)

States run with hypotonic/dependent defaults and no length unless noted; all bands ordered low ≤ central ≤ high; no numeric anomalies beyond the items below:

| state | C card | D card | banners fired | note |
|---|---|---|---|---|
| boys 0 mo / 2 kg / 2.0 | 28–28–34 | 100–115–139 | refeeding (z≈−3.2), C-low, infant | ok |
| boys 1 mo / 2 kg / 2.0 | 88–88–107 | 176–195–236 | refeeding, C-low, >10 g/kg, infant | ok |
| boys 48 mo / 20 kg / 2.0 | 991–991–1212 | =C | target≤current, density | B "—" by design (R3-6) |
| boys 48 mo / 2 kg / 2.0 | 610–610–746 | 983–1065–1291 | refeeding, >20 g/kg, D-1 ~532 kcal/kg, density | **R3-5** |
| boys 0 mo / 20 kg / 2.0 | 31–31–38 | =C | C-low, target≤current, infant | ok |
| girls 0 mo / 2 kg / 2.0 | 87–87–107 | 156–171–207 | refeeding, C-low, infant | ok |
| girls 48 mo / 20 kg / 2.0 | 920–920–1124 | =C | target≤current, density | ok |
| girls 48 mo / 2 kg / 2.0 | 590–590–721 | 967–1050–1273 | refeeding, >20, D-1 ~525, density | **R3-5** |
| girls 1 mo / 2 kg / 2.0 | 117–117–143 | 201–219–265 | refeeding, C-low, >10, infant | ok |
| boys 1 mo / 2 kg / length 30 | — | — | model-out-of-range, >10, D withheld, infant | **R3-1** (charts/table still numeric) |
| boys 0 mo / 3 kg / 2.0 | 28–28–34 | 51–56–68 | C-low, infant | **R3-5** (D/E unflagged) |

Also: the E table at 48 mo / 2 kg with density 2.0 renders all four rows (0.67/1.0/1.5/2.0) and the visible "0.67 kcal/ml exceeds maintenance fluid" note; the refeeding threshold behaves correctly at the tested z boundary (2 kg at 0 mo fires, z ≈ −3.2; 3 kg girls at 0 mo does not, z ≈ −0.5). No other unsafe or misleading output was found in the swept states.

### Stray NaN/undefined scan

`#results`, `#charts-body`, `#table-body`, `#why-body`, `#flags-body`, `#rules-body`, `#products-body`, `#sources-body`, `#method-body`, `#start-body` and `document.body.innerText` were scanned in every tested state (PL and EN): **no `NaN`, `undefined`, `Infinity`, or bare `null`** anywhere.

### Grade-D badge visibility (reasons/flags)

Content carries 5 grade-D reasons items and 3 grade-D flags items; all are rendered with `class="badge gradeD"` and are visible (`getClientRects` + computed display): reasons → `why-losses-i1`, `why-requirements-i1`, `why-requirements-i4`, `why-measurement-i0`, `why-endocrine-i1`; flags → `flag-now-i0`, `flag-week-i4`, `flag-visit-i3`. Card C, D and D-2 each carry a visible D badge + the extrapolation note; the sources list keeps its 1 grade-D source badge (unchanged from round 2).

---

## Coverage note

**Exercised on the live built site (`dist/`, PL default, EN spot-checks):** all six round-2 checklist areas; calculator states at ages 0/1/2/3/6/18/24/30/36/48 mo; weights 2/3/4/4.5/8/10/12/20 kg; lengths empty/30/65/74/80 cm; densities 1.0/1.5/2.0 (plus the 0.67/1.0/1.5 preset rows); both sexes; boot state after a fresh reload; banner visibility via rendered geometry, not just DOM presence; the full-page NaN/undefined scan; the products section for all 10 R2-5 items plus the honey card; reasons/flags/sources badge inventory.

**Not assessed (other roles):** quantitative re-derivation of A–F and the grid (math auditor), source-vs-claim accuracy (citation auditor), Polish/English language quality and accessibility (UX/i18n), real screen-reader hardware.

**Environment:** headless Chromium via the browser harness; inputs set through the page's own `change` events (equivalent to typing + blur); HTTP server `python3 -m http.server 8793` on `dist/`.

---

## Verdict

critical: 0, major: 1

(Open items: R3-1 [major]; R3-2…R3-6 [minor].)
