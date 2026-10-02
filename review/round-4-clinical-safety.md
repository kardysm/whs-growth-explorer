# Round 4 — Clinical-safety FINAL confirmation review (paediatric gastroenterology + clinical dietetics)

**Role:** independent clinical-safety auditor, round 4 — FINAL confirmation, per GOAL.md §7.1 role 2 / §9.
**Date:** 2026-10-02. **Repo:** `/opt/data/whs-growth-explorer` (not under git).
**Build audited:** `dist/` served at `http://localhost:8793` (`python3 -m http.server 8793`); bundle `assets/index-CxHa7yaY.js` sha256 `10ed425e176ac1ba78704a6d3841f65b6d861e337265a133090c628b2d978c8e` (1,455,090 B), `dist/index.html` sha256 `285e0bd05b44724b25bce033736a3a26b0b2b6669516a9f7cc88287ed69f2034`; built 2026-10-02 18:40:54 UTC — newer than every `src/`, `content/` and `src/data/` file (latest: `src/data/grid.json` 18:40:45), so the audit ran against the current build.
**Method:** live site in headless Chromium; inputs set through the page's own `change` handlers (the same events a user produces); ECharts tooltip read via a synthetic `mousemove` at the computed axis coordinate for 8 kg; CSV captured by intercepting `URL.createObjectURL`; visibility verified with `innerText` + `getClientRects()` + computed style; PL default with EN spot-checks. Round-1–3 artifacts used as leads only; every statement below was re-verified on the live build.
**Out of scope (other roles):** numeric re-derivation (math), source-vs-claim accuracy (citation), PL/EN language quality and accessibility (UX/i18n).

**Severity summary: 0 critical, 1 major, 2 minor** (R4-1 major; R4-2, R4-3 minor — R4-3 re-surfaces an unfixed round-3 minor).

---

## Verification table (round-4 checklist)

| # | Check | Result | Evidence (live `dist/`, PL unless noted) |
|---|---|---|---|
| 1 | age 18 / weight 8 / length 65 → C card = 8.00 kg table row C, chart-1 C line passes through it (click row, compare) | **PASS** | C card `400 – 400 – 488 kcal/24h`; table row `8,00 \| 903 \| 604 \| 400 \| 400 \| 800 \| 400` (C = 400); chart-1 fallback w=8 `903 \| 604 \| 400 \| 400`; chart-1 tooltip at x=8 kg: `C: 400 kcal`. Clicking the 8,00 row sets the weight input to `8` and re-renders: card C still `400 – 400 – 488`, row C still 400. Shipped default (length 74) also agrees everywhere: card C `547 – 547 – 669`, row C `547`, tooltip `C: 547` (the round-3 R3-1 mismatch repro no longer reproduces). |
| 2 | length 30 → C and D show '—' on cards AND table row shows '—' for C/D (no numbers anywhere) | **PARTIAL — 2 residual numbers** | Cards C/D/D-2 all `—` with visible alerts (C: *"Model poza zakresem dla podanych danych (BMR ≤ 0) — nie podajemy wartości…"*; D: *"D pominięte: C jest poza zakresem modelu…"*); E table all `—`; table row C/D `—`; chart-1 fallback C/D `—`; chart-3 fallback `—`; tooltip `C: — kcal … D: —`. **But**: (a) the C card's visible notes still show `kcal/cm: 11,1 → 333 kcal/24h` (→ R4-1); (b) the table's `ml @1` column shows `0` for all 73 rows, the chart-1 tooltip shows `objętość przy gęstości 1 kcal/ml: 0 ml`, and the CSV shows `…,,,800,0` (→ R4-2). |
| 3 | girls 18/8/30 → generic out-of-range alert with kcal/kg; 48/2 no length → alert (high per-kg) | **PASS** | Girls 18/8/30: C `25 – 25 – 31 kcal/24h` + *"Wartość C (25 kcal/24h ≈ 3 kcal/kg) leży poza wiarygodnym zakresem dla tych danych — sprawdź długość i masę ciała…"* — generic wording (no boys-specific rationale), kcal/kg shown; EN identical (*"C (25 kcal/day ≈ 3 kcal/kg) is outside a plausible range…"*). 48/2 no length: girls C `590 – 590 – 721` + *"(590 kcal/24h ≈ 295 kcal/kg)"*; boys C `610 – 610 – 746` + *"(610 kcal/24h ≈ 305 kcal/kg)"*; D guardrails (tempo >20 g/kg + D-1 ~525 kcal/kg) fire on the same state. (In the girls-30 state the derived D/E/table/chart values inherit the flagged C without a carry-over caution — see R4-3.) |
| 4 | blueberry product card: choking warning + 'ryzyko zadławienia' tag | **PASS** | `#prod-food-blueberry` shows badge **"ryzyko zadławienia"** and a visible banner *"Ryzyko zadławienia: owoce okrągłe — przekrój na połówki lub rozgnieć."*; product search "zadławienia" returns **10 pozycji** (was 9 before the R3-3 fix); EN card: badge "choking risk" + *"Choking risk: round fruit — halve or crush."* |
| 5 | D-2 card at no-length: '—' and NO protein line | **PASS** | 18/4/no length: D-2 band `—`, text *"wymaga masy w zakresie WHO oraz podanej długości"*; no `białko`/`protein` string anywhere in the card (visible or details). EN: *"needs weight within WHO range and length provided"*, no protein line. |
| 6 | null-band card (B, age 0 / weight 20) shows its explanation VISIBLY | **PASS** | B band `—`; note *"Wprowadzona masa poza zakresem siatek WHO 0–60 mies. (masa do wieku)."* rendered as a visible `list-item` (computed `display: list-item`, `getClientRects().length = 1`), card has no `<details>`. Same at 2 mo/2 kg and 48 mo/20 kg. EN: *"Entered weight outside the WHO 0-60 mo weight-for-age range."* |
| 7 | No-regression sweep | **PASS** | age 0/3 kg/no length → C `28 – 28 – 34` + *"(28 kcal/24h ≈ 9 kcal/kg)"* alert + E infant caution; 18/4/no length → visible refeeding `crit` banner (*"UWAGA: masa ciała względem długości (lub względem wieku, gdy brak długości)…"*) + D `651 – 683 – 831` with D-1 *"~171 kcal/kg"* banner; 18/4/80 cm → D `792 – 824 – 1003` + D-1 *"~206 kcal/kg"* banner (D card only) and D-2 `1261 – 1261 – 1261` + D-2 scenario banner (D-2 card only); 3 mo → E infant caution *"NIEMOWLĘ: nie zagęszczaj mleka modyfikowanego ponad instrukcję producenta…"* visible. |
| 8 | Whole calc DOM scan for NaN/undefined | **PASS** | 0 hits in `#results`, `#charts-body`, `#table-body`, `#why-body`, `#flags-body`, `#rules-body`, `#products-body`, `#sources-body`, `#method-body`, `#start-body` and in a body-wide direct-text scan, across 13 state checks (10 PL incl. both suppressed states, null-band and the 2 kg / 20 kg extremes; 3 EN); word `null` scan also clean. |

---

## New findings

### R4-1 — [major] The suppressed/flagged C card still displays a concrete energy value from the Culley height-based sub-method; in the suppressed state it is *visible* on the card, contradicting the card's own "nie podajemy wartości"

**Location:** `src/ui/main.ts` l. 304 (the `kcal/cm: … → … kcal/24h` bullet is appended to the C-card notes whenever `heightBased.kcalPerDay !== null`) + l. 290–292 (when `b.central === null` the notes render as a **visible** `<ul>`, not collapsed `<details>` — the round-3 R3-6 fix); `src/calc/methods.ts` l. 161–178 (Culley block gated only by `ageMonths >= 12`, not by the C validity/plausibility guard at l. 130–139).

**Evidence (live):**
- **Boys 18 mo / 8 kg / length 30 (PL):** C card band `—` with the banner *"Model poza zakresem dla podanych danych (BMR ≤ 0) — nie podajemy wartości; sprawdź długość i masę ciała…"*, and in the card's visible notes list: **`kcal/cm: 11,1 → 333 kcal/24h`** — element verified visible (`display: list-item`, `visibility: visible`, `getClientRects().length = 1`, 452×19 px); the card has no `<details>` at all.
- **EN identical:** *"Model out of range for these inputs (BMR <= 0) — values withheld…"* + visible **`kcal/cm: 11.1 -> 333 kcal/24h`** (visible `list-item`, rects = 1).
- **Girls 18 mo / 8 kg / length 30:** same line `kcal/cm: 11,1 → 333 kcal/24h` inside the collapsed "Jak to policzono" details, while the card simultaneously flags C as *outside the plausible range*.
- The 333 kcal/24h is computed from the implausible entered length (30 cm) — the very datum the banner tells the user to re-check — and is the only `kcal/24h` figure on the card. In round 3 this line was reported (inside the R3-1 major's evidence) as being in collapsed details; the round-3 fix that renders null-band notes visibly moved it **onto the visible card face**, i.e. it is now more prominent than when it was first flagged. It fails the round-4 item-2 expectation ("no numbers anywhere") and self-contradicts the card's *"nie podajemy wartości"*.

**Suggested fix:** suppress (or replace with "—"/a withheld-note) the `kcal/cm` bullet whenever `!cValid` **or** the plausibility guard fired; alternatively gate the Culley computation by the same condition. (Trivial, one-line class of change.)

### R4-2 — [minor] C-derived volumes show `0` instead of `—` when C is suppressed (table `ml @density` column, chart-1 tooltip, CSV)

**Location:** `src/ui/main.ts` l. 581–583 (table row: `Number(r.C) / input.density` → `Number(null) = 0`), l. 617 (CSV: same expression), tooltip formatter l. 396–399 (`kcalV / input.density` with `cv = null` → 0). The E card (l. 320) and chart-3 fallback (l. 541) already render `—` for the same null — only these three surfaces miss the guard.

**Evidence (live, boys 18/8/length 30):** table row `8,00 | 903 | 604 | — | — | 800 | 0` and all 73 rows show ml `0`; chart-1 tooltip: `… C: — kcal … objętość przy gęstości 1 kcal/ml: 0 ml`; CSV line `8,902.5,604.090909090909,,,800,0`. A caregiver could misread `0` as "no volume needed" in a state where the volume is simply not computable. (Not dangerous — the C column shows `—` and the E card shows all `—` — but it is a wrong number on three user-facing surfaces.)

**Suggested fix:** null-guard the ml computations in the table, CSV and tooltip exactly as the E card already does (show `—` when C central is null).

### R4-3 — [minor] When the C plausibility alert fires without suppression, the derived D / E / table / chart numbers inherit the flagged C value with no carry-over caution (the unfixed half of round-3 R3-5)

**Location:** `src/calc/methods.ts` — the guard (l. 130–139) only pushes an alert onto the C card; D (`dPrice`, l. 211+) and E (`byDensity`) are computed from `C.kcalPerDay` unconditionally and no caution is added to D/E when the guard fires.

**Evidence (live):** girls 18/8/30 → C card `25 – 25 – 31 kcal/24h` + the out-of-range alert; D card `25 – 25 – 31 kcal/24h` with only the "target ≤ current" banner (no caution); E card rows `0,67 → 38 ml | 1,0 → 25 ml | 1,5 → 17 ml`, no caution; table row `8,00 | 829 | 604 | 25 | 25 | 800 | 25`; chart-1 tooltip `C: 25 kcal … objętość przy gęstości 1 kcal/ml: 25 ml`. Same pattern at boys 0/3/no length (C `28 – 28 – 34` flagged; D `51 – 56 – 68` with no banner). Round-3 R3-5 recommended carrying the caution to the derived D/E numbers; the guard extension was implemented, the carry-over was not (it is also not listed among the resolution log's remaining minors).

**Suggested fix:** when the C plausibility alert fires, repeat a short caution on the D (and E) card, or annotate the derived values, e.g. *"wartość pochodna od C, które jest poza wiarygodnym zakresem dla tych danych"*.

**Severity rationale (minor):** the flagged numbers are absurdly low (25–28 kcal/24h) and unlikely to be used as a plan; the C card directly above carries the prominent warning; round 3 classified the same family as minor. The girls case is by design *not* suppressed (item 3 expects a computed C + alert), so this is a warning-propagation gap, not a missing suppression.

---

## Observations (verified, not counted as findings)

- The two-sided plausibility alert fires at the item-1 state (boys 18/8/65: *"Wartość C (400 kcal/24h ≈ 50 kcal/kg) leży poza wiarygodnym zakresem…"*, because C < 0.5·A). Typical WHS states do **not** trigger it (18 mo / 7 kg / 70 cm → C 481, no alert; girls 18/7/68 → C 428, no alert). Conservative direction; recorded for awareness, not a defect per this checklist.
- Other numbers remain in the suppressed state by design and were judged informational, not C/D outputs: tone/activity constants (0,9 / 1,2), the Culley coefficient/range text (11,1; 6–15; 13,9), the D-card target explanation (*"cel: 7,01 kg w 12 tygodni (-11,8 g/dzień)"*), the energy-cost band (4,1 / 5,0 / 6,0 kcal/g) and the WHS position (≈ 1,7 SD).
- CSV exports unrounded values (A `902.5`, B `604.090909090909`) vs the rounded UI — cosmetic only.
- Round-3 fix re-confirmations on this build: card/table/chart agreement with entered length incl. the shipped default (547/547/547 at 18/8/74); table + charts now `—` in the suppressed state (except the two residuals above); girls alert generic; 48/2 high-per-kg alert; blueberry warning + tag; D-2 protein gating; B-note visibility; refeeding/D-1/D-2/infant banners.

---

## Coverage note

**Exercised on the live built site (`dist/`, served on 8793):** all eight round-4 checklist areas; calculator states at ages 0/2/3/18/48 mo; weights 2/3/4/4.5/7/8/20 kg; lengths empty/30/65/68/70/74/80 cm; boys and girls; PL and EN; boot state after a fresh reload; surfaces read: all six result cards (bands, visible text, banners, details), the E volume table, all 73 table rows, both chart fallbacks, the chart-1 tooltip (via synthetic mousemove at 8 kg), the CSV export (captured in-memory), and the products section (blueberry + search). Visibility checks used rendered geometry (`getClientRects`, computed style), not just DOM presence. The full-page NaN/undefined scan ran in 13 states.

**Not assessed (other roles):** quantitative re-derivation of A–F and the grid (math auditor), source-vs-claim accuracy (citation auditor), Polish/English language quality and accessibility (UX/i18n), real screen-reader hardware.

**Environment:** headless Chromium via the browser harness; HTTP server `python3 -m http.server 8793` on `dist/`.

---

## Verdict

critical: 0, major: 1
