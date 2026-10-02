# Round 4 — UX / i18n FINAL confirmation audit (independent auditor, fresh context)

Auditor role: GOAL.md §7 round-4 final confirmation (UX/i18n + a11y). Rounds 1–3 logs (`review/round-1..3-*.md`, `round-3-resolution.md`) were treated as *lead claims only* and re-tested from scratch on the live build. Nothing below is copied from those logs.

Date: 2026-10-02. Build audited: `dist/` served on `localhost:8793` (`python3 -m http.server 8793`), bundle **`index-CxHa7yaY.js`** + `index-DOwiZRte.css` (2026-10-02 18:40) — i.e. the post-round-3-fix build, one bundle newer than the one round 3 audited (`index-jIC4ApPq.js`). axe-core **4.13.0** injected from a **separate** server (`localhost:8794`, serving `node_modules/axe-core/`; never copied into `dist/` — `dist/` contains only `index.html` + `assets/`, verified). Chromium via CDP, real mouse/keyboard events for interactive checks; PL + EN, light + dark, 360 px device emulation, canvas pixel census. Nothing outside `review/` was modified.

**Summary: 0 critical · 0 major · 1 minor (R4-1, EN-only hint parity gap) + 3 observations.**

Verdict line: **critical: 0, major: 0**

All seven commissioned checks pass on the live build except one facet of check 2: the **EN** chart-1 hint does not carry the entered-length/WHS-mean sentence (the PL one does, and the behaviour itself is correct and consistent everywhere — see §B R4-1). Everything else reproduces exactly as commissioned.

---

## A. Commissioned checks — verification table

| # | Check | Verdict | Live evidence (this build) |
|---|---|---|---|
| 1 | Product filter folds `ł`: `maslo` → 3, `losos` → 1 | ✅ | `#p-search` filter: `masło` → **3** and `maslo` → **3** (ids `prod-food-ghee`, `prod-food-butter`, `prod-food-peanut-butter`); `łosoś` → **1** and `losos` → **1** (`prod-food-salmon`); `żelazo`/`zelazo` → 26. Count text "3 pozycje"/"1 pozycja"/"26 pozycji" + visible card count agree. |
| 2 | chart-1 + table hints state the entered-length/WHS-mean rule (PL+EN), matches behaviour | ⚠️ PL ✅ / EN chart-1 ✗ | Hints: PL chart-1 **states rule + <6 mo caveat**; PL table hint **states rule**; EN table hint **states rule + <6 mo caveat**; **EN chart-1 hint states neither** → finding R4-1 (§B). Behaviour (verified independently): boys 18 mo / 8 kg — length **74** → C **547**; length **65** → C **400**; no length → C **504** (WHS mean) — **card = table = chart tooltip exactly in all three states** (tooltips read with real CDP mouse hover; chart band edges also exact at grid points: cleared, 4/8/12/16 kg → card C "504–504–616" / "504–504–617" / "505–505–617" / "506–506–618" = tooltip C−/C/C+). C-card details state the rule in both languages ("…ta sama zasada obowiązuje w tabeli i na wykresie" / "…the same assumption applies to the table and chart"); form length hint states it in both languages. |
| 3 | axe in 3 states (light / dark / dialog `mleko` 12 results) | ✅ | Full-page `axe.run(document, {resultTypes:['violations','incomplete','passes']})`, default ruleset, after full render, 1280×720: **light** (PL, dialog closed) **0 violations / 0 incomplete / 52 passes**; **dark** (`data-theme=dark`, dialog closed) **0 / 0 / 52**; **dialog** (light, `mleko` → 12 results, list scrollable 914 > 380) **0 violations / 1 incomplete (5 nodes) / 54 passes**. Bonus: EN closed 0 / 0 / 52. The incomplete is `color-contrast` on `#search-close`, `#search-r6 > b`, `#search-r6 > div`, `#search-r7 > b`, `#search-r7 > div` (backdrop compositing artifact); manual WCAG computation on the same nodes: **16.64 / 17.4 / 6.9 / 17.4 / 6.9 : 1** — all ≥ 4.5:1, informational only. |
| 4 | Round-3 PL strings grammatical + render in both languages | ✅ | (a) **kcal/kg alert** — PL: "Wartość C (25 kcal/24h ≈ 3 kcal/kg) leży poza wiarygodnym zakresem dla tych danych — sprawdź długość i masę ciała. NIE używaj C jako celu żywienia bez konsultacji; oprzyj się na A/B i ocenie klinicznej." (girls 18 mo/8 kg/30 cm) and "(595 kcal/24h ≈ 297 kcal/kg)" (boys 48 mo/2 kg); EN: "(595 kcal/day ≈ 297 kcal/kg)" and "(490 kcal/day ≈ 245 kcal/kg)" — grammar correct in both. (b) **D-2 title** — PL "D. Doganianie wzrostu — wariant 2 (scenariusz: masa odpowiednia do długości)"; EN "D. Catch-up — variant 2 (scenario: weight for length)". (c) **carbs item** — PL "…obserwuj tolerancję (wzdęcia, luźne stolce) — zalecenie praktyczne; czasem lepsza jest gęstość z tłuszczu."; EN "…watch tolerance (gas, loose stools) — practical guidance; density from fat may be better tolerated." (d) **intervals** — PL "(długość — praktyka)" (`why-intake-i1`), "(typowy okres obserwacji — praktyka)" (`flag-week-i5`), "3–7 dni (praktyka)" (`rule-monitoring-i0`); EN "(length — practice)", "(typical observation window — practice)", "3–7 day intake diary (practice)". All four groups found rendered in PL **and** EN; no grammatical errors. |
| 5 | Null-band card notes visible (B out of WHO range, no details needed) | ✅ | B card at age 18 mo, weight **2 kg** and **20 kg**: value "—" plus a **visible** note "Wprowadzona masa poza zakresem siatek WHO 0–60 mies. (masa do wieku)." (`offsetParent` non-null, not inside `<details>`); EN "Entered weight outside the WHO 0-60 mo weight-for-age range." Bonus: D-2 null-band note "wymaga masy w zakresie WHO oraz podanej długości" also visible without opening details. |
| 6 | No regression: search, Esc, mobile 360, honey | ✅ | `sygnaly` → 3 hits, first `data-a="flags"` ("Sygnały alarmowe"); `zelazo` → 12 hits, **12/12 `prod-*`** targets. **Esc focus-restore**: with a real mouse click on `#search-open` (opener focused), Esc closes the overlay and focus returns to `#search-open` (focus log: `focusout search-input` → `focusin search-open`). Mobile 360 (CDP emulation, cold reload): `document.documentElement.scrollWidth` = 360 = `innerWidth`, 0 elements overflowing outside the intentionally scrollable `nav.main` (1081/341), **header 95 px**, chart-1 canvas 307 px. **Honey warning** visible at 360 and desktop, PL + EN: "NIE dla dzieci poniżej 12. miesiąca życia — ryzyko botulizmu niemowlęcego…" + badge "od 12. mies." / "NOT for children under 12 months — infant botulism risk…". JS error listeners across lang×2, theme×2, search open/type/Esc, recalc: **[]** (clean). |
| 7 | Dark chart text still light (canvas pixel census, chart1) | ✅ | Fresh 1× load (canvas 1034×380, `canvas.width` = CSS width), dark theme, chart-1: fg `#e8e6e0` family (±6) = **2500 px**; old dim `#54555a` ±6 = **0 px**, ±12 = **0 px**. Axis band (y320–345): fg 1305, dark leftovers 0; legend band (y348–380): fg 267, dark leftovers 0. Light control: `#1a1a1a` ±6 = 2399 px. Contrast `#e8e6e0` vs card `#1f2124` = **12.93:1** (old dim colour would be 2.17:1). |

---

## B. New findings

### R4-1 [minor] — EN chart-1 hint missing the entered-length/WHS-mean sentence (PL/EN hint parity gap left by the round-3 hint fix)

- **Location:** `content/base.json` → `charts.chart1_hint` (line 127); rendered in `#charts` above chart 1.
- **PL (rendered + source, correct):** "…C — zapotrzebowanie podstawowe z hipotonią (pasmo; **użyta jest wpisana długość, a bez niej — średnia długość WHS dla wieku; dla wieku <6 mies. C może leżeć poza wiarygodnym zakresem — patrz karta C**); D — z doganianiem (pasmo). Kliknij punkt…"
- **EN (rendered + source, incomplete):** "A — healthy child of the same age; B — healthy child of the same weight; C — hypotonic maintenance (band); D — with catch-up (band). Click a point to set calculator weight." — the length rule and the <6 mo caveat are absent. The EN string was evidently not updated when the PL one was.
- **Related asymmetry (same string family):** the <6 mo caveat is present in the PL chart-1 hint and the EN table hint, but absent from the EN chart-1 hint and the **PL table hint** (the PL table hint otherwise states the rule correctly).
- **Impact:** an EN reader does not learn from the chart-1 legend that C uses the entered length (WHS mean when none). No functional or numeric impact — behaviour is correct, and the rule is stated in EN in two other places (EN table hint; EN C-card "How it was computed": "Length not provided — WHS mean length for age used (digitized, Antonius 2008); the same assumption applies to the table and chart."). No misleading text — the EN hint is merely less specific than the PL one.
- **Suggested fix (string-only):** translate the PL clause into the EN `chart1_hint` ("uses the entered length; without it, the WHS mean length for age; for ages <6 mo C may sit below a plausible range — see card C"); optionally add the <6 mo clause to the PL table hint for symmetry.
- **Severity rationale:** no incorrect or inconsistent numbers, no safety/misleading content, information available in EN elsewhere → **minor** (consistent with how comparable i18n gaps were graded in rounds 2–3).

---

## C. Observations (not counted as findings)

1. The dialog-state axe `color-contrast` incomplete (5 nodes) is a dimmed-backdrop compositing artifact; manual contrast 16.6–17.4:1 and 6.9:1 — fine (informational).
2. Chart legend markers render as white-centred circles with series-coloured rings — verified **identical in both themes** (white pixel bbox x326–687 / y363–371 in light and dark), i.e. a structural icon design, not theme-dependent text. All axis/legend glyph pixels are `#e8e6e0` in dark and `#1a1a1a` in light (0 dark-ink leftovers in dark bands).
3. Chart tooltip vs card agreement is exact at grid points; a ±1-unit reading appears only when hovering mid-pixel *between* grid points (nearest-point snapping) — not a data mismatch.
4. PL uses "kcal/24h", EN uses "kcal/day" — consistent within each language; pre-existing cosmetic unit-label divergence documented in earlier rounds.

---

## D. Coverage note

**Inspected / exercised on this build:** `dist/` via `localhost:8793` (bundle `index-CxHa7yaY.js`), axe-core 4.13.0 from `localhost:8794`; axe full-page in light, dark, dialog (`mleko`, 12 scrollable results) + EN closed bonus, incl. per-node manual contrast computation; product filter (`masło/maslo/łosoś/losos/żelazo/zelazo`) with visible-card counts; chart-1 + table + form hints (PL/EN) and the entered-length rule verified across cards/table/chart at three length states incl. band edges via real hover tooltips (CDP mouse events) and click-to-set-weight; calculator alert states (girls 18/8/30; boys 48/2/74; EN girls) with kcal/kg wording; D-2 title/scenario/null note; carbs item; interval markers; null-band B notes at 2 kg and 20 kg (PL+EN) + D-2 null note; search `sygnaly`/`zelazo` with target ids; Esc focus-restore with real-click opener (focus-event log); Ctrl+K dialog open/close; 360 px emulation (cold load, overflow scan, header height, chart width); honey + blueberry warnings (PL/EN, mobile + desktop); canvas pixel census chart-1 (dark + light control, band histograms, dim-colour absence); JS error capture across language/theme/search/recalc interactions.

**Not covered / limitations:** no real screen-reader hardware (AX/DOM only — same limitation as rounds 1–3); Chromium only; reduced-motion and Firefox/Safari specifics not re-exercised; axe `incomplete` items are informational by design; the canvas census is DPR-1 (a session that runs device emulation first leaves charts at 2× backing — ECharts keeps init-time DPR, standard behaviour, not a site defect).

**Housekeeping:** audit servers were session-scoped — `python3 -m http.server 8793` in `dist/` and axe-core 4.13.0 served separately on 8794 from `node_modules/axe-core/` (never copied into `dist/`; `dist/` contains only `index.html` + `assets/`). Both were stopped after the audit; restart the same way to re-verify. Nothing outside `review/` was modified; no console/JS errors observed during the whole session.

---

Final verdict: **critical: 0, major: 0** (1 minor open: R4-1 — EN chart-1 hint text only; all commissioned UX/i18n items otherwise confirmed on the live build).
