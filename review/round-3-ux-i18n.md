# Round 3 — UX / i18n + accessibility confirmation audit (independent auditor, fresh context)

Auditor role: GOAL.md §7 round-3 confirmation (UX/i18n + a11y), final round. Round-1/2 logs and `review/round-2-resolution.md` were treated as *lead claims* and re-tested on the live build; nothing below is copied from those logs.

Date: 2026-10-02. Scope: production build served from `dist/` on `localhost:8793` (`python3 -m http.server 8793`), axe-core 4.13.0 injected from a separate server (`localhost:8794`, `node_modules/axe-core/axe.min.js` — never copied into `dist/`). Chromium via CDP (real mouse/keyboard events for interactive checks); build bundle `assets/index-jIC4ApPq.js` (2026-10-02 18:16). PL + EN, light + dark, 360/375/390 px emulation, print-media emulation. Nothing outside `review/` was modified.

**Summary: 0 critical · 0 major · 1 minor (+ 5 observations).**

Verdict line: **critical: 0, major: 0**

All round-2 fixes are confirmed on the live build. The single new minor is a small i18n gap in the product-section filter (letter `ł` not folded in diacritic-insensitive search, §C R3-1). Everything else that was commissioned reproduces exactly as expected — details below.

---

## A. Round-2 fixes re-verified (all live, this build)

### A1. axe-core — three states — ✅ 0 violations everywhere

Full-page `axe.run(document, {resultTypes:['violations','incomplete']})`:

| State | Violations | Incomplete | Passes |
|---|---|---|---|
| Light, dialog closed | **0** | 0 | 52 |
| Dark, dialog closed | **0** | 0 | 52 |
| Dialog open, light, PL, query `mleko` — 12 results, list scrollable (`scrollHeight` 914 > `clientHeight` 380) | **0** | 1 (`color-contrast`, 5 nodes: `#search-close`, `#search-r6 > b`, `#search-r6 > div`, `#search-r7 > b`, `#search-r7 > div`) | 54 |
| EN, dialog closed (bonus) | **0** | 0 | 52 |
| EN, dialog open, query `milk` — 12 results, scrollable | **0** | 1 (same 5 nodes) | 54 |

The round-2 `scrollable-region-focusable` violation on `#search-results` is gone (the `tabindex=0` fix landed). The one remaining incomplete is axe failing to compute contrast over the dimmed backdrop — manual WCAG check of those exact nodes: 16.6:1 (`#search-close` `#1a1a1a` on `#fafaf7`), 17.4:1 (row `<b>` `#1a1a1a` on `#fff`), 6.9:1 (row `.small` `#5a5a5a` on `#fff`) — all fine. Informational only, same status as round-2.

### A2. Dark-mode chart text — ✅ #e8e6e0, old dim colour gone (canvas pixel census, chart1+2+3)

Fresh load (DPR 1, canvases 1034×380, card `#1f2124`), after the theme toggle. Ink colour expected: `--fg` dark `#e8e6e0`; old bug ink `#54555a` = 2.17:1 vs card.

Text bands (axis tick labels ≈ y328–336; legend labels ≈ y358–375; "warm light ink" filter; dim = `#54555a`±10):

| Chart | Axis-label band top inks | Legend band top inks | dim px in bands |
|---|---|---|---|
| chart1 | `#e8e6e0`:72 + AA variants (`#e8e5e0`:41, `#e7e5e0`:32, `#e7e6e0`:29…) | `#e8e6e0`:104 + variants | 0 |
| chart2 | `#e8e6e0`:58 + variants | `#e8e6e0`:545 + variants (`#e7e6e0`:236, `#e8e5e0`:233…) | 3 (AA coincidences, not text) |
| chart3 | `#e8e6e0`:72 + variants | `#e8e6e0`:248 + variants | 0 |

Whole-canvas census (α≥100): fg-family (`#e8e6e0` ±6) = **2501 / 3828 / 3143 px** (ch1/ch2/ch3); old dim ±6 = **0 / 2 / 0**; ±12 = **0 / 10 / 0** — i.e. no `#54555a` text anywhere. Light-mode control: chart1 axis labels render `#1a1a1a` (254 px exact, dim 0). Contrast: `#e8e6e0` vs `#1f2124` = **12.93:1** (the old `#54555a` would be 2.17:1).

Chart-3 series palette (dark): PAL colours present (`#8ab4e0` 3202 px, `#f0c674` 2212, `#e58aa8` 1553, `#8fc5da` 2068, fluid `#bbbbbb` 6209); ECharts default palette `#5070dd`/`#b6d634`/`#505372`/`#ff994d` = **0 px** — round-2 fix confirmed.

Method notes: pixel counts scale with the canvas backing store — a session that went through CDP device emulation leaves the charts at 2× backing (ECharts keeps init-time DPR; standard behaviour), where the same census reads 9426/13776/11593 fg-family px. Both scales show the same result (light text, dim absent). Numbers above are the clean 1× state.

### A3. Search (Ctrl+K) — ✅ all pass (real mouse + keyboard events)

| Check | Verdict | Evidence |
|---|---|---|
| `sygnaly` → flags section | ✅ | 3 hits, first `data-a="flags"` = "Sygnały alarmowe" |
| `zelazo` → products | ✅ | 12 hits, 12/12 `prod-*` (Szpinak, Ciecierzyca…) |
| Tab trap (scrollable 12-result list open) | ✅ | real Tab ×4 / Shift+Tab ×3: cycles `search-input` ⇄ `search-close`, both directions; focus never leaves the dialog |
| Esc focus-restore | ✅ | after real Esc: overlay hidden, `document.activeElement = #search-open` |
| Ctrl+K while open does not reset | ✅ | value `zelazo` preserved, overlay stays open, focus stays in input, 12 results intact |
| Enter → destination (bonus) | ✅ | overlay closes; `prod-food-spinach` focused (`tabindex=-1`) + `.hl-flash` |

### A4. PL products — ✅ all pass

- **Portion lines:** 63 cards, 56 "porcje domowe" lines. All **51 USDA lines wrap the English description in `<span lang="en">`** — e.g. lard `porcje domowe: ≈ <span lang="en">1 tbsp</span> (12,8 g) = 115 kcal · ≈ <span lang="en">1 cup</span> (205 g) = 1849 kcal`. The 5 lines without a span are the Polish FSMP measures (Resource Junior, Fantomalt, Protifar, Infatrini, Infatrini powder) — correct, nothing English left unwrapped.
- **Source labels:** 53/53 food cards render the generic PL text "źródło: USDA FDC — karta produktu (opis oryginalny w j. angielskim)" (no raw English descriptions).
- **Warnings visible:** honey — botulism banner ("NIE dla dzieci poniżej 12. miesiąca życia…") + "od 12. mies." badge; raisins + dates — choking banner ("Ryzyko zadławienia: suszone owoce…") + "ryzyko zadławienia" badge.
- **Pluralization:** 17 live PL cases validated against the Polish rule — 63→"pozycje", 2/3/4→"pozycje", 5/6/7/10/12/14/26→"pozycji", 1→"pozycja", 0→"pozycji" (categories + searches, incl. `żelazo`→26, `masło`→3, `owoce`→12, `mleko`→14). EN: "1 item" / "26 items". No mismatches.

### A5. Mobile 360/375 — ✅ no overflow, header 95 px

| Viewport | `scrollWidth == innerWidth` | header height |
|---|---|---|
| 360 | 360 == 360 | **95 px** |
| 375 | 375 == 375 | **95 px** |
| 390 | 390 == 390 | **95 px** |

Cold load at 360 (fresh page under emulation): no page overflow; charts initialise at 307 CSS px; the only elements extending past the viewport are the nav links inside the horizontally scrollable `nav.main` (by design).

### A6. Print emulation — ✅ sane

Hidden: `header.top`, `nav.main`, `.lang-toggle`, `.skip-link`, `#search-overlay`, `#charts`, `#products`, `#calc-form`. Visible: `#start`, `#table`, `#why`, `#flags`, `#rules`, `#sources`, `#method` (all `display:block`). Body forced `#fff`/`#000`; external links get " (https://…)" `::after`; cards 1 px border; badges `#333`.

### A7. New PL strings — ✅ present and grammatically sound

Live PL render verified for: D-2 title "D. Doganianie wzrostu — wariant 2 (scenariusz: masa odpowiednia do długości)"; table hint ("Wiersze: masy 2–20 kg; … bez wpisanej długości kolumny C/D liczone są ze średniej długości WHS dla wieku. Kliknij nagłówek, aby sortować; kliknij wiersz, aby ustawić masę."); length hint ("Wpisz zmierzoną długość, jeśli ją znasz — bez niej liczby C/D zakładają średnią długość WHS dla wieku, a przesiew ryzyka działa wg masy do wieku."); infant + density cautions; E notes ("płyny podtrzymujące (Holliday–Segar): 340 ml/24h", "Przy 0,67 kcal/ml objętość przekracza płyny podtrzymujące — rozważ wyższą gęstość (pod nadzorem klinicznym)."). Grammar correct; two cosmetic wording notes only (§C, observations). Also re-spot-checked round-2 string fixes: `Kalprotektyna` (typo gone), `„WHS średnia”` (proper closing quote), PL decimals "czynnik napięcia: 0,9; czynnik aktywności: 1,2".

---

## B. New checks (commissioned this round)

### B1. EN mode scan — ✅ clean

- axe EN: dialog closed 0/0 (52 passes); dialog open `milk` (12 results, scrollable) 0 violations / 1 informational incomplete (same 5 nodes as PL) — see A1.
- All calculator alerts fire with EN text: C out-of-plausible-range alert (age 0/3), INFANT caution, refeeding CAUTION banner, D-2 guardrail ("Method D-2 (scenario): ~222 kcal/kg…"), D-1 ceiling ("Method D-1: ~171 kcal/kg…"), density caution.
- New strings in EN: table hint, length hint, D-2 title "D. Catch-up — variant 2 (scenario: weight for length)", E notes ("maintenance fluid (Holliday-Segar): 800 ml/24h", "At 0.67 kcal/ml…").
- Search EN: `red flags` → `flags` first; `botulism` → `rule-infant-i1` + `prod-food-honey`; `nav.main` aria-label = "sections" (R2-5 fix confirmed); search/theme button labels EN.
- Products EN: portion lines English (no `lang` wrapper needed), 53/53 source labels = "<USDA desc> — USDA FDC", counts "1 item"/"26 items".
- PL leftovers in EN visible text: 4 nodes only — 1 intentional gloss "Curd cheese (twaróg)" + 3 bibliography entries with Polish author names/titles (proper nouns, correct). No PL UI leaks.

### B2. Keyboard walk of the new alerts — ✅ reachable/readable by AT, sensible DOM order

- DOM order: the refeeding banner is the **first element of the results block** (`#results`), before all result cards; card alerts render **after the band value** inside their card (child index 3 in C/D/D-2); the E-card caution sits above the density table (index 1). Nothing is hidden from AT (no `aria-hidden` ancestors; all banners have `offsetParent`).
- CDP accessibility tree: each new alert is exposed as a non-ignored `StaticText` node with the full text ("UWAGA: masa ciała względem długości…", "Metoda D-2 (scenariusz)…", "Wartość C (28 kcal/24h) poniżej wiarygodnego zakresu…", "NIEMOWLĘ: nie zagęszczaj…", density caution).
- A 20-stop Tab walk (from "Przelicz" through all result cards) shows the alerts do not trap or block focus; focus moves through the details summaries and source links with the correct rings (see B3).
- Note (observation, §C): results/alerts have no `aria-live`, so a screen-reader user who just presses "Przelicz" is not auto-announced the new values/banners; they are read in DOM order on navigation.

### B3. Focus ring on the D-2 scenario line — ✅ verified (with one clarification)

- The scenario sentence ("Wartość scenariuszowa — pojedyncza liczba, nie pasmo; cel = masa odpowiednia do długości.") renders **visible** on the D-2 card, in DOM order before the guardrail banner and the value; it is exposed to AT as `StaticText`. It is **plain text — not focusable**, so it carries no focus ring of its own (static text does not need one).
- The D-2 card's only focusable element — the "Jak to policzono" `<summary>` — is reached at Tab #20 with `:focus-visible` and the standard 3 px theme ring: light `rgb(31,93,122)` (`#1f5d7a`), dark `rgb(143,197,218)` (`#8fc5da`). Contrast: 6.91/7.23:1 (light), 8.58/9.45:1 (dark) — fine. No problem found; if a ring directly on the sentence was expected, the sentence is intentionally static text.

---

## C. New findings

### R3-1 [minor] — Product-section filter does not fold `ł` (diacritic-insensitive search incomplete for ł-words)

- **Location:** `strip()` in `src/ui/main.ts` (product filter; `s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")` — `ł`/`Ł` are non-decomposable and survive).
- **Evidence (live, PL, category = wszystkie):** `masło` → 3 results; `maslo` → **0**. `łosoś` → 1; `losos` → **0**. Other letters fold fine (`żelazo` → 26 without diacritics). The global Ctrl+K search is *not* affected (Fuse: `maslo` → 6 hits incl. `prod-food-butter`).
- **Impact:** a caregiver typing without diacritics (common) gets a silent empty list for ł-words in the products section only.
- **Suggested fix:** add `ł→l` (and `Ł→L`) mapping to the product filter's `strip()` (or share the global search's normalisation).

### Observations (not counted as findings)

1. `#search-results` now has `tabindex=0` (round-2 axe fix) but the dialog's Tab trap only considers `input, button`, so the list is never reachable by Tab (trap cycles `search-input` ⇄ `search-close`). The axe rule is satisfied and arrow-key selection still scrolls every result into view (`scrollIntoView`), so there is no user-visible impact; optionally add the `ul` to the trap's focusable set for consistency.
2. Dark-mode gridlines are ECharts' default light-theme `splitLine` colour `#dbdee4` (11.97:1 vs the card) — brighter than the site's own `--line`/`--muted` tokens. Cosmetic only (no contrast failure); could be dimmed for a calmer dark chart.
3. Calculator results/alerts have no `aria-live` region — new values and banners after "Przelicz" are not auto-announced (borderline WCAG 4.1.3 "status messages"; pre-existing, noted for awareness only).
4. Cosmetic PL wording: "nie zagęszczaj mleka modyfikowanego **ponad instrukcję** producenta" (more natural: "wbrew instrukcji producenta") and "liczby C/D zakładają…" shorthand in the length hint — understandable, accepted in earlier rounds.
5. The dialog-state axe `color-contrast` incomplete (5 nodes) is a backdrop-compositing artifact; manual contrast 16.6–17.4:1 and 6.9:1 — fine (informational).

---

## D. Coverage note

**Inspected / exercised:** `dist/` on `localhost:8793` (bundle `index-jIC4ApPq.js`), axe-core 4.13.0 from `localhost:8794`; full-page axe runs in light, dark, dialog-open (PL `mleko` 12 scrollable results), and EN closed + dialog (`milk`); canvas pixel censuses of all three charts (dark, fresh 1× and post-emulation 2×; light control) incl. per-band ink histograms and series-palette counts; contrast computations (WCAG formula) for chart text, focus rings, dialog nodes; search suite with real key events (`sygnaly`, `zelazo`, `masło`/`maslo`, Tab/Shift+Tab ×7, Esc, Ctrl+K, Enter); PL products (all 63 cards, 56 portion lines, 53 source labels, honey/raisins/dates warnings, 17 plural cases); EN products, search, leftovers; calculator alert states (age 0 C-alert, age 3 infant, D-2 guardrail 3.4 kg/60 cm, D-1 ceiling, refeeding without length, density caution) incl. DOM order and CDP accessibility-tree exposure; 20-stop keyboard walk with focus-ring measurements (light + dark); CDP device emulation 360/375/390 (incl. cold load at 360); print-media emulation; anchor/scroll behaviour incidental checks.

**Not covered / limitations:** no real screen-reader hardware (AX tree + DOM/ARIA only — same limitation as rounds 1–2); Chromium only; the canvas census depends on backing-store scale (numbers quoted for a clean 1× load; emulation sessions leave a 2× backing store — ECharts keeps init-time DPR, standard behaviour, not a site defect); reduced-motion and Firefox/Safari specifics not re-exercised; axe `incomplete` items are informational by design. Servers left running on 8793 (dist) and 8794 (axe); nothing outside `review/` was modified.
