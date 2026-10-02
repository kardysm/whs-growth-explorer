# Round 2 — UX / i18n + accessibility verification audit (independent auditor, fresh context)

Auditor role: GOAL.md §7 round-2 verification (UX/i18n + a11y). Acting as an **independent verifier**: round-1 findings and `review/round-1-resolution.md` were treated as *lead claims*, not truth. All claims below were re-tested on the live production build in `dist/` and are reproducible from the evidence given.

Date: 2026-10-02. Scope: built site served from `dist/` on `localhost:8793` (CLI: `python3 -m http.server 8793`), Chromium via CDP, PL + EN, light + dark, desktop + 360/375/390 px emulation, print-media emulation. axe-core 4.13.0 injected from a separate server (`localhost:8794`, `node_modules/axe-core/axe.min.js`) so `dist/` was never modified.

**Summary: 0 critical · 1 major · 7 minor.**

Top 3 issues:
1. **[new, major] Dark mode: chart text is unreadable and one chart-3 series is below the ≥3:1 bar** — ECharts 6's `darkMode:'auto'` never engages (the chart container's own background is transparent), so axis tick labels + legend labels render in the light-theme grey `#54555a` = **2.17:1** against the dark card. Chart 1–2 and the fluid line got the round-1 theme-aware palette, but **chart 3's first four series still use ECharts' default (light) palette** — `#505372` measures **2.17:1**, `#5070dd` 3.61:1.
2. **[verified leftover] axe dialog-open state**: with a scrollable results list (12 hits), axe flags `scrollable-region-focusable` on `#search-results` (impact: serious; "Element should have focusable content / Element should be focusable"). The round-1 claim "dialog-open 0 violations" only holds when the list is short (≤~8 hits, not scrollable). Light/dark closed states are 0/0 as claimed.
3. **[verified leftover] PL copy items** the round-1 log marked done are partly still live: `Kalprotaktyna` typo renders in "Jak sprawdzić" (`reasons.json:70`); **49 of 56** "porcje domowe" lines on PL product cards still show English/imperial units (`cup`/`tbsp`/`oz`) and USDA source links are English-only; calculator notes still print dot decimals ("czynnik napięcia: **0.9**").

---

## A. Round-1 verification (claims re-tested live)

Legend: ✅ verified · ⚠️ partially verified / partially fixed · ❌ not reproduced / not fixed.

### A1. Ctrl+K search (round-1 C1–C5, U-C1/U-C2/U-C3) — ✅ all pass

| Check | Verdict | Evidence (live, PL unless noted) |
|---|---|---|
| `sygnaly` hits the Red-flags section | ✅ | first hit `flags` = "Sygnały alarmowe"; text = section intro |
| `zelazo` (no diacritics) hits products | ✅ | 12/12 hits are `prod-*` cards (top: Szpinak, Ciecierzyca, Fasola biała…) |
| `botulizm` hits rule + product | ✅ | `rule-infant-i1` ("Miodu nie podawaj…") + `prod-food-honey` (Miód / „od 12. mies.”) |
| Arrow keys move selection (aria-activedescendant + scrollIntoView) | ✅ | query `mleko` → 12 hits; ArrowDown ×12: `aria-activedescendant` `search-r0`→`search-r11`, `#search-results.scrollTop` 0→534, active `li` in visible list area at every step (`inView=true`) |
| Tab trapped inside dialog | ✅ | Tab ×5 cycles `search-input` ⇄ `search-close`, `inPanel=true` every step; Shift+Tab same |
| Esc returns focus to opener | ✅ | opened via real click on `#search-open` → input focused; Esc → overlay hidden, `document.activeElement = #search-open` |
| Ctrl+K while open does not reset | ✅ | value `infant` preserved, overlay stays open, focus stays in input (handler early-returns when open) |
| Enter → destination focus | ✅ | overlay closes; target gets `tabindex="-1"`, is focused, gets `.hl-flash` |
| Short/no query | ✅ | <2 chars → "Wpisz co najmniej 2 znaki.", `aria-activedescendant` removed; no results → "Brak wyników." |
| EN parity | ✅ | EN "red flags" → section `flags` first; EN placeholder "Search (Ctrl+K): e.g. iron, reflux, botulism…"; EN `botulism` → rule + honey product |

### A2. Dark mode: series + child marker + focus ring — ⚠️ partially (see R2-1)

Rendered-colour pixel census (canvas `getImageData`, dark card `#1f2124`), contrast = WCAG 2.x formula:

| Element | Rendered | Contrast vs dark card | Verdict |
|---|---|---|---|
| Chart 2 WHS series (dark palette) | `#e58aa8` | 6.56:1 | ✅ |
| Chart 2 WHO series | `#8fc5da` | 8.58:1 | ✅ |
| Chart 2 2025 percentiles | `#7fd0b4` | 8.90:1 | ✅ |
| Chart 2 ±2 SD | `#c98ba0` | 5.91:1 | ✅ |
| **Child marker** | `#f5f5f5`, 12 px, 152 px cluster at expected data point | **14.80:1** | ✅ |
| Chart 1 series A/B/C/D | `#8ab4e0` / `#f0c674` / `#e58aa8` / `#8fc5da` (all render) | 5.9–9.8:1 | ✅ |
| Chart 3 fluid line | `#bbbbbb` | 8.41:1 | ✅ |
| Chart 3 series 1–4 (default palette) | `#5070dd`, `#b6d634`, `#505372`, `#ff994d` | 3.61 / 9.73 / **2.17** / 7.62 | ⚠️ R2-1 |
| Chart text (axis ticks + legend labels, all charts) | `#54555a` (2 260 px sample in chart 2; same in ch1/ch3) | **2.17:1** | ⚠️ R2-1 |
| Focus ring light | 3 px `#1f5d7a` | 6.91:1 (bg) / 7.23:1 (card) | ✅ |
| Focus ring dark | 3 px `#8fc5da` | 9.45:1 (bg) / 8.58:1 (card) | ✅ |

Round-1 F1's specific complaint (near-invisible C/WHO lines and child marker, 1.18–2.23:1) is fixed; a screenshot + visual check confirmed the series and marker are clearly visible. The remaining dark-mode problem is **text and chart-3 default series** (R2-1), which the round-1 checks missed.

### A3. Mobile 360/375 px — ✅ pass

| Viewport | `document.scrollWidth == innerWidth` | `header.top` height | Verdict |
|---|---|---|---|
| 360 px | 360 == 360 | **95 px** | ✅ |
| 375 px | 375 == 375 | **95 px** | ✅ |
| 390 px | 390 == 390 | 95 px | ✅ |

No horizontal overflow; navigation collapses to one scrollable row (nav height 23 px). Well under the 120 px budget.

### A4. axe-core (light / dark / dialog-open) — ⚠️ partially (see R2-2)

- Light, dialog closed: **0 violations, 0 incomplete** (52 passes) ✅
- Dark, dialog closed: **0 violations, 0 incomplete** (52 passes) ✅
- Dialog open with **12 results (scrollable list)**: **1 violation** `scrollable-region-focusable` [serious] on `<ul id="search-results" aria-label="Szukaj" aria-live="polite">` + **1 incomplete** `color-contrast` (#search-close and result rows r5–r7; axe cannot compute over the dimmed backdrop — manual check suggests colours are fine). With a non-scrollable list (1 hit) it is 0 violations / 1 incomplete. The round-1 "0 violations" claim reproduces only for short result lists → R2-2.

### A5. PL calculator cards: no English leftovers — ✅ (visible text), one cosmetic note

`#calc-body` visible text (PL) is fully Polish: form labels, all six cards, notes ("Metody różnią się o więcej niż 5%…", "Typ Krick…", "D — ekstrapolacja…", "Masa docelowa nie przewyższa obecnej…"), banners, sources, E table. 16/16 collapsible notes are Polish (regex scan for EN function words = 0 hits). Leftover is only numeric formatting (R2-6).

### A6. Source notes marked `lang=en` — ✅ pass

`#sources-body`: 47 list items / 47 `[lang="en"]` nodes (0 unmarked), tooltip `title="nota źródłowa (j. angielski)"` present; 0 "undefined" badges.

### A7. Products: honey / Protifar / pluralization — ✅ pass

- Honey: warning banner visible in PL ("NIE dla dzieci poniżej 12. miesiąca życia — ryzyko botulizmu niemowlęcego (zarodniki Clostridium botulinum).") + age badge "od 12. mies."; EN banner likewise.
- Protifar: age line visible ("proszek 225 g — UWAGA: nie stosować u dzieci <3 r.ż."; EN "225 g powder — NOTE: not for children under 3 y").
- Counts pluralize correctly: PL `1 pozycja` (miód/tahini), `2 pozycje`, `3 pozycje` (masło), `5 pozycji` (dairy), `6 pozycji`, `12 pozycji` (owoce — 12–14 branch), `26 pozycji` (żelazo); EN `1 item`, `4 items`, `26 items`.

### Previously-fixed items spot-verified in passing

- CS-7 D-2 guardrail: weight 3.4 kg + length 60 cm → per-kg banner **"Metoda D-2 (scenariusz): ~222 kcal/kg aktualnej masy — powyżej maksimum tabeli TRS 935 (~167 kcal/kg/d)…"** visible, plus scenario note ✅; CS-2 infant-density banner (age 6, density 1.5) visible ✅; CS-6 "Pozycja masy na siatce WHS: ≈ -1,4 SD" note visible ✅; F3 chart aria-labels localized, `role="img"` ✅; F4 skip-link: after activation `location.hash=#main`, `document.activeElement=BODY` (no `tabindex` on `#main`) but the **next Tab lands in `#main` content (`SELECT#in-sex`), so the header is skipped — functionally works**; D4 table rows `tabindex="0"` ✅; E2 anchor jump: `#flags h2` top 226 px vs header bottom 103 px (desktop) and 210 vs 95 (375 px) — headings no longer hidden ✅.

---

## B. New findings (round 2)

### R2-1 [major] — Dark mode: chart axis/legend text and chart-3 default-palette series are below/at the contrast bar (ECharts 6 auto dark-mode never engages)

- **Location**: `src/ui/main.ts` `drawCharts()` (textStyle), `src/ui/styles.css` `.chart { width:100%; height:380px; }` (no background); chart 3 series definitions (lines 474–480) have no `color` except the fluid line.
- **Evidence** (live, dark theme, canvas pixel census + WCAG formula):
  - Axis tick labels and legend labels in **all three charts** render `#54555a` = **2.17:1** vs the dark card `#1f2124` (2.39:1 vs page bg). The same colour is used in light mode, where it is 7.44:1 on white — i.e. ECharts keeps its light-theme default text in dark mode. Only ~119 px of text inherit the `textStyle: {color: var(--fg)}` override (axis names), vs 2 260 px for `#54555a`. A rendered screenshot confirms the labels look "dim, low contrast".
  - Chart 3 series 1–4: `#5070dd` 3.61:1, `#b6d634` 9.73:1, **`#505372` 2.17:1**, `#ff994d` 7.62:1 vs dark card — the hand-set theme-aware palette (`PAL`) is applied to charts 1–2, chart 3's fluid line and the child marker, but not to these four.
  - Root cause (source-verified): ECharts 6 defaults to `darkMode: 'auto'` and derives dark-ness from **the chart container's own background colour**; `.chart` is transparent (the dark comes from the parent `.card`), so dark mode never activates. `node_modules/echarts/dist/echarts.js`: `darkMode: 'auto'` (l.18983), `isDarkMode(backgroundColor)` (l.7297/7400).
- **Suggested fix** (pick one, simplest first): give the chart containers their own background — `.chart { background: var(--card); }` — so auto-detection engages (re-check all colours after the switch); or set `darkMode: effectiveTheme() === 'dark'` explicitly in `setOption`; and/or pass explicit per-component colours (`xAxis.axisLabel.color`, `yAxis.axisLabel.color`, `legend.textStyle.color`) from `var(--fg)`. Also give chart 3's first four series explicit `PAL` colours so all charts share one palette. Re-verify ≥3:1 for graphics / ≥4.5:1 for the 12 px labels in dark mode.

### R2-2 [minor, cheap fix; axe impact "serious"] — Search results list is a keyboard-inaccessible scrollable region

- **Location**: `src/ui/main.ts` markup `#search-results` (`<ul aria-live>`), `src/ui/styles.css` `#search-results { overflow:auto }`.
- **Evidence**: axe 4.13.0, dialog open, `zelazo` → 12 hits (list scrollable, `scrollHeight > clientHeight`): violation `scrollable-region-focusable` [serious] — "Element should have focusable content / Element should be focusable" on `#search-results`. Not flagged when the result list is short/not scrollable, which is why round-1's run showed 0. Functional impact is limited (arrow keys scroll the list into view, all results reachable), but it is a genuine axe violation in a common state.
- **Suggested fix**: add `tabindex="0"` to `#search-results` (minimal; makes the list itself keyboard-scrollable) or adopt a `role="listbox"`/`option` pattern; re-run axe in the dialog state afterwards.

### R2-3 [minor] — "Kalprotaktyna" typo still renders (round-1 U-B4 fix not landed / regressed)

- **Location**: `content/reasons.json` line 70 (reasons group 2 "Jak sprawdzić" text).
- **Evidence**: content grep finds 1 occurrence; live PL DOM shows "Jak sprawdzić: **Kalprotaktyna**, morfologia, żelazo/ferrytyna, badania wchłaniania wg gastroenterologa…" (`#why-body`). Round-1 resolution claims "Kalprotektyna" was fixed; corrected spelling absent everywhere.
- **Suggested fix**: `Kalprotaktyna` → `Kalprotektyna` (EN mirror already reads "Faecal calprotectin").

### R2-4 [minor] — PL product cards: English/imperial portion units and English-only source labels remain (round-1 B2 partially fixed)

- **Location**: `src/data/products_foods.json` `portions[].desc` and USDA `source` strings; rendered by `buildProducts()` in PL mode.
- **Evidence** (live PL DOM): of 56 cards showing a "porcje domowe" line, **49 contain English/imperial units** — e.g. `porcje domowe: ≈ 2 tbsp (32 g) = 191 kcal · ≈ 1 cup (258 g) = 1543 kcal` (peanut butter), `≈ 1 cup, fluid (yields 2 cups whipped) (238 g)` (cream 30%), `1 oz` (pumpkin seeds). Source link labels render raw English: `źródło: Peanut butter, smooth style, with salt (Includes foods for USDA's Food Distribution Program) — USDA FDC`; `źródło: Honey — USDA FDC`. The round-1 fix reached the curated Nutricia products only (`porcje domowe: 1 płaska miarka (2,5 g) = 9,2 kcal`).
- **Suggested fix**: in `scripts/build_foods.py`, map USDA unit names (`cup`, `tbsp`, `tsp`, `oz`, `pat`, …) to PL units (szklanka/łyżka/łyżeczka) or show metric-only with grams; for source labels use a generic PL label ("USDA FDC — opis produktu") or mark the raw description `lang="en"` (consistent with source notes).

### R2-5 [minor] — `nav.main aria-label` stays "sekcje" in EN (round-1 F7 partially fixed)

- **Location**: `src/ui/main.ts` `renderShell()` — `<nav class="main" aria-label="sekcje">` hardcoded.
- **Evidence**: EN mode → `nav.main` `aria-label="sekcje"`; (theme toggle `aria-pressed` + localized label now fine: "Toggle dark/light mode", pressed=true).
- **Suggested fix**: use a content key (e.g. add `nav.aria` = `{pl: "sekcje", en: "sections"}`).

### R2-6 [minor] — PL calculator notes still use dot decimals (round-1 B3 partially fixed)

- **Location**: `src/calc/methods.ts` note "czynnik napięcia: ${tone}; czynnik aktywności: ${act}" (numeric interpolation without locale formatting).
- **Evidence** (live PL, collapsible note text): "czynnik napięcia: **0.9**; czynnik aktywności: **1.2**" while the neighbouring note in the same card reads "(0,9–1,1)". Cards/tables/tooltips elsewhere use commas as claimed.
- **Suggested fix**: format via `toFixed(1).replace(".", ",")` for PL (or route through the existing `pn()`/`loc()` helpers).

### R2-7 [minor] — Typographic quote mismatch in method p4 (`„WHS średnia"`)

- **Location**: `content/base.json` `method.p4` PL — `linia „WHS średnia\" w kalkulatorze…` (closing straight quote).
- **Evidence**: live method text: `„WHS średnia" w kalkulatorze i na wykresach` — opening „ but closing `"`.
- **Suggested fix**: replace with the closing `”` („WHS średnia”).

### R2-8 [minor] — D-2 card title "— 2" is cryptic (round-1 CS-7 "labelled scenario" is only in the note)

- **Location**: `src/ui/main.ts` line 300 — `<h3>${t("calc.method_d_t")} — 2 …</h3>` (hardcoded, both languages).
- **Evidence**: live PL card title "D. Doganianie wzrostu (catch-up) — **2**"; the word "scenariusz" appears only inside the collapsed note ("Wartość scenariuszowa — pojedyncza liczba, nie pasmo; cel = masa odpowiednia do długości.") and in the guardrail banner.
- **Suggested fix**: label the card in the title, e.g. "D-2 — wariant scenariuszowy (masa odpowiednia do długości)" / "D-2 — scenario variant (weight for length)", via a content key.

---

## C. New checks (as commissioned) — results

### C1. EN mode PL leftovers / PL mode EN leftovers (round-1-edited strings) — ⚠️ two small leftovers

- EN page PL-diacritic text nodes: 4 — one intentional gloss `Curd cheese (twaróg)` (acceptable), three bibliographic citations with Polish author surnames (correct as proper nouns). No PL UI strings leak in EN.
- PL mode: `nav.main` aria-label "sekcje" in EN (R2-5); English/imperial portion lines + USDA source labels in PL cards (R2-4); `catch-up` gloss in card titles ("D. Doganianie wzrostu (catch-up)") — acceptable as a gloss; source IDs (`efsa_energy`, …) are identifiers, fine.
- Search placeholder, hint (↑↓ / Enter / Esc), empty/no-result strings, theme toggle, honey warning, Protifar form line: localized in both directions ✅.

### C2. Print stylesheet (print-media emulation) — ✅ sane

- Hidden: `header.top`, `nav.main`, `.lang-toggle`, `.skip-link`, `#search-overlay`, `#charts`, `#products`, `#calc-form` (display:none).
- Printable: `#start`, `#table`, `#why`, `#flags`, `#rules`, `#sources`, `#method` (all `display:block`); body forced `#fff`/`#000`; cards get 1 px borders; external links get a "(URL)" suffix (verified `a[href^="http"]::after` = `" (https://doi.org/…)"`); `h2/h3 { break-after: avoid }`.

### C3. Keyboard walk of the calculator form — ✅ works

- Tab order from the first control: `in-sex → in-age → in-weight → in-length → in-tone → in-mobility → in-target → in-horizon → in-density → in-feeds → in-mlfeed → in-intake → btn-recalc →` the results' `<details>` → source links (sensible DOM order).
- Editing by keyboard: focus weight, Ctrl+A, type `7.5`, Tab (commit) → field stays `7.5` and the model re-reads; Enter on the focused "Przelicz" button recomputes. Note (by design, `change`-based): plain `input` events alone do not recompute — the value must be committed (blur/Enter or the button), which matches the visible "Przelicz" affordance.
- Live recompute sanity: C responds correctly to changes (C ≈ 547–548 kcal/24h for 18 mo hypotonic child at 6–10 kg with the default substituted length; B changes markedly with weight: 596@6 kg → 604@8 → 810@10; D = C when no catch-up; D-2 scenario + >167 kcal/kg guardrail appears at 3.4 kg / 60 cm — see A7).

### C4. PL grammar of new/edited UI strings — ✔ no new grammatical errors found

Reviewed the round-1-edited/added strings in live PL (honey warning, infant rules incl. "NIGDY nie zmieniaj proporcji mleka modyfikowanego…", allergen-introduction rule, "Ciche aspiracje (bez kaszlu)" flag, refeeding banner, `calc.infant_density_caution`, D-2 scenario + per-kg guardrails, WHS-position note, search strings, "od 12. mies.", tag labels, source-note tooltip). Grammar/agreement is correct and consistent with round-1 fixes (`Doganianie`, `apatyczne`, `awersja`, `Przy znacznym stopniu`, "Mleka aminokwasowe i rzadkie moduły"). Exceptions are the specific items in §B: R2-3 (typo), R2-7 (quote), R2-8 (cryptic label). Cosmetic observations, not counted as findings: "≈ -1,4 SD" uses a hyphen-minus for the minus sign; units mix "kcal/24h" (cards) with "kcal/dzień" (D-2 note) — round-1 A4 suggested unifying, still mixed.

---

## D. Observations / non-issues (checked, no action needed)

- `Curd cheese (twaróg)` EN name: informative PL gloss, acceptable.
- Source citations keep Polish diacritics in EN (author names) — correct.
- Skip-link: focus is not programmatically moved (`activeElement` = BODY, `#main` has no `tabindex`), but the browser's sequential focus starts at `#main` (next Tab = `SELECT#in-sex`), so the header is skipped as intended — functionally fine; adding `tabindex="-1"` to `#main` would still be a cheap improvement.
- axe dialog `color-contrast` incomplete nodes (#search-close, r5–r7): manual inspection suggests `--fg`-on-`--card` text; axe cannot evaluate over the dimmed backdrop.
- White legend-icon cores: ECharts 6 default legend rendering (coloured rings with white fill); icons match series colours and remain distinguishable in both themes.
- `🐴` tab-title prefix observed during harness sessions is browser-harness instrumentation, not site code (confirmed again: `dist/index.html` title is clean).

**Not confirmed / not reproduced** (explicitly, per audit discipline): one unattended session state showed card B as "—" with the "weight outside WHO range" note while the header still read weight 8 (and C ≈ 1097 kcal/24h). Every attempt to reproduce from a user path failed — fresh load and weight sweep 3→18 kg all behave correctly (out-of-range only where genuinely out of range, e.g. <3.3 kg). Likely a harness/session artifact; flagged only for developer awareness, not counted as a finding.

---

## E. Coverage note

**Inspected / exercised**: all of `dist/` on `localhost:8793` (index + bundle) in PL and EN, light and dark; Ctrl+K search (queries `sygnaly`, `zelazo`, `botulizm`, `aspiracje`, `mleko`, `infant`, `x`, `qqq`, EN `red flags`/`botulism`; arrows, Tab/Shift+Tab, Enter, Esc, Ctrl+K×2); search overlay axe runs (light/dark/dialog); calculator form keyboard walk + value-changes; calculator banners (infant density, D-2 guardrail, refeeding-relevant notes); product filtering and plural edge cases; sources section (`lang` attributes, tooltips, badges); print-media emulation; CDP device emulation 360/375/390 px; anchor-jump geometry desktop/375; focus-ring computed styles both themes; canvas pixel censuses for all three charts (light + dark) and contrast computation (WCAG formula); screenshot + visual check of the dark chart; source cross-checks of the involved code paths (`main.ts`, `styles.css`, `methods.ts`, `who.ts`, `products_foods.json`, `reasons.json`, `base.json`).

**Not covered / limitations**: no real screen reader (NVDA/VoiceOver) available — SR behaviour inferred from DOM/ARIA; only Chromium tested; reduced-motion and Firefox/Safari specifics not exercised; screen-reader/chart-canvas interpretation of the ECharts text colour (R2-1) judged by pixel + contrast measurement and a visual screenshot check, not by a human user; the visual screenshot was taken in a harness session (🐴 title prefix artifact noted above). axe was served from a second local port and never copied into `dist/`; nothing outside `review/` was modified.
