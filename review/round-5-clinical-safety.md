# Round 5 — Clinical-safety FINAL confirmation review (paediatric gastroenterology + clinical dietetics)

**Role:** independent clinical-safety auditor, round 5 — FINAL confirmation, per GOAL.md §7.1 role 2 / §9 (final round must return 0 critical + 0 major).
**Date:** 2026-10-02. **Repo:** `/opt/data/whs-growth-explorer` (not under git).
**Build audited:** `dist/` served at `http://localhost:8793` (`cd dist && python3 -m http.server 8793`); bundle `assets/index-Hb4XBE1Q.js` sha256 `7ed4a20b0d23a960938b2bbe409a6a4729715bdb48c6cd41145a3a1d4a7ade4f` (1,456,020 B) — served bytes re-hashed over HTTP and equal to disk; `dist/index.html` sha256 `a6dad42b627284c82ae413c470a3829c5db38234905e1e8d4d1546713e8a9e9d`; built 2026-10-02 19:06:44 UTC. Freshness vs sources: all UI-relevant inputs (`src/ui/main.ts` 19:06:10, `src/calc/methods.ts` 18:39, `content/base.json` 19:06:41) are older than the build; `src/data/reference_lines.json` (mtime 19:10:33) is byte-identical to the 18:43 checkpoint (sha `45b4da…`), and `src/data/grid.json` differs from the checkpoint only in `meta.generated` (timestamp → pinned date; 7,154/7,154 rows byte-identical, sha `eff3b4c8…` = the pinned hash recorded in `research/qa/crosscheck-report.md`) and is not referenced by the UI code (unused import; its content is absent from the bundle) — so the live bundle reflects the current sources for every UI-relevant datum.
**Method:** live site in headless Chromium (isolated browser session); inputs driven through the page's own `change` handlers (same events a user produces); visibility verified with `innerText` + `getClientRects()` + computed style; regex checks against full `textContent` (catches collapsed `<details>` content too); every claim re-verified on the live build (rounds 1–4 logs used as leads only, never as evidence). PL default with EN spot-checks of all three states. An initial shared browser session drifted to a sibling server serving the identical bundle; all final checks were re-run on the isolated session against the hash-verified 8793 build.
**Out of scope (other roles):** numeric re-derivation (math), source-vs-claim accuracy (citation), PL/EN language quality and accessibility (UX/i18n).

**Severity summary: 0 critical, 0 major, 0 minor. No new findings.**

---

## Verification table (round-5 checklist)

| # | Check | Result | Evidence (live `dist/`, PL unless noted) |
|---|---|---|---|
| 1a | SUPPRESSED (boys 18 mo / 8 kg / length 30): C card band shows '—' | **PASS** | C card band `—`; alert visible: *"Model poza zakresem dla podanych danych (BMR ≤ 0) — nie podajemy wartości…"*; notes render as a **visible** `<ul>` (no `<details>` in the card, `display: block`, rects = 1). |
| 1b | SUPPRESSED: no `kcal/cm: <num> → <num>` bullet on the C card (anywhere in DOM, incl. collapsed content) | **PASS** | Regex `/kcal\/cm:\s*\d[\d.,]*\s*(→\|->)\s*\d/` on the C card's full `textContent`: **no match**; across **all** `#results` list items: **0** numeric kcal/cm bullets. Only the Culley literature-range note remains (constants 6–15, 11,1, 13,9 — no child-specific value; verified in full text). The card contains no `kcal/24h` and no `kcal/kg` string at all. |
| 1c | SUPPRESSED: no percentOfA/B numbers | **PASS** | C card shows `% A: —%, % B: —%` (no digits). |
| 1d | SUPPRESSED: table row shows '—' for C/D and '—' in the ml column | **PASS** | Row `8,00`: `8,00 \| 903 \| 604 \| — \| — \| 800 \| —`. Across all **73** rows: C column unique values `['—']`, D column `['—']`, ml column `['—']`. E card C/D columns all `—`. EN identical (`8.00 \| 903 \| 604 \| — \| — \| 800 \| —`). |
| 2a | NORMAL (boys 18/8/74): kcal/cm bullet IS present/rendered | **PASS** | Bullet `kcal/cm: 11,1 → 821 kcal/24h` present in the C card's notes, rendered visible when the card's "Jak to policzono" `<details>` is expanded (rects = 1; details collapsed by default, as for all cards). EN: `kcal/cm: 11.1 -> 821 kcal/24h`. |
| 2b | NORMAL: no alert banner | **PASS** | C card banners: none; no refeeding banner. (The D card keeps its standard, unrelated "target ≤ current" guardrail banner — present by design, not a C-alert.) |
| 3a | FLAGGED (girls 18/8/30): C alert visible | **PASS** | *"Wartość C (25 kcal/24h ≈ 3 kcal/kg) leży poza wiarygodnym zakresem dla tych danych — sprawdź długość i masę ciała. NIE używaj C jako celu żywienia bez konsultacji; oprzyj się na A/B i ocenie klinicznej."* — visible `p.banner.warn`; C band `25 – 25 – 31 kcal/24h`; kcal/cm bullet correctly hidden (0 numeric bullets). |
| 3b | FLAGGED: same caution repeated as banners on D card, E card, and above the table | **PASS** | Four instances, all visible (`getClientRects` > 0) and **text-identical** (verified programmatically): C card, D card, E card, and `#table-body > p.banner.warn.small` above the table. EN: same four, text-identical. E table `0,67→38 \| 1,0→25 \| 1,5→17`; table row `8,00 \| 829 \| 604 \| 25 \| 25 \| 800 \| 25`. |
| 4a | No regression: age 0 / 3 kg / no length → C alert | **PASS** | C `28 – 28 – 34` + visible alert *"(28 kcal/24h ≈ 9 kcal/kg)"*; carry-over caution also on D and E; E infant caution visible. |
| 4b | No regression: refeeding banner at 18 mo / 4 kg / no length | **PASS** | Visible `banner crit`: *"UWAGA: masa ciała względem długości (lub względem wieku, gdy brak długości) jest bardzo niska (poniżej −3 SD / ostre wyniszczenie)…"*; D `651 – 683 – 831` + D-1 `~171 kcal/kg` banner. |
| 4c | No regression: D-1 banner at 18 mo / 4 kg / 80 cm | **PASS** | D `792 – 824 – 1003` + D-1 banner *"Metoda D-1: ~206 kcal/kg…"* on the D card only; D-2 `1261 – 1261 – 1261` + D-2 scenario banner *"~315 kcal/kg…"* on the D-2 card only (no cross-contamination of banners). |
| 4d | No regression: E infant caution at 3 mo | **PASS** | E card visible banner *"NIEMOWLĘ: nie zagęszczaj mleka modyfikowanego ponad instrukcję producenta i nie dodawaj modułów energetycznych/białkowych bez nadzoru klinicznego…"* (boys 3 mo / 5 kg / 60 cm). |
| 4e | No regression: blueberry choking warning | **PASS** | `#prod-food-blueberry`: visible `banner crit` *"Ryzyko zadławienia: owoce okrągłe — przekrój na połówki lub rozgnieć."* + badge *"ryzyko zadławienia"*. |
| 4f | No regression: honey warning | **PASS** | `#prod-food-honey`: visible `banner crit` *"NIE dla dzieci poniżej 12. miesiąca życia — ryzyko botulizmu niemowlęcego (zarodniki Clostridium botulinum)."* + badge *"od 12. mies."*. |
| 5 | Whole calc DOM scan for `NaN` / `undefined` / `Infinity` in the three states | **PASS** | 0 hits (text **and** HTML) across `start-body`, `calc-body`, `charts-body`, `table-body`, `results`, `why-body`, `flags-body`, `rules-body`, `products-body`, `sources-body`, `method-body`, plus `#app` innerHTML and body `innerText`, in SUPPRESSED, NORMAL and FLAGGED (PL), and in the EN variants of all three states. |

---

## New findings

**None.** No critical, major or minor findings were identified in this round. All round-4 fixes (R4-1 major, R4-2/R4-3 minors) are confirmed on the live build, and the regression sweep is clean.

---

## Observations (verified, not counted as findings)

- **Informational numbers remaining in the suppressed C card** are the same set previously adjudicated as informational in round 4: method constants (tone/activity 0,9 / 1,2; band 0,9–1,1; Schofield coefficient 0,167), the Culley literature-range text (6–15; 11,1; 13,9 kcal/cm), and the WHS chart position of the entered weight (`≈ 1,7 SD`). None is a C-derived energy value; the checklist's three explicit criteria (no kcal/cm numeric bullet, no percentOfA/B numbers, band '—') all pass.
- **NORMAL-state bullet placement:** the `kcal/cm` bullet lives in the card's collapsed "Jak to policzono" `<details>` (the standard pattern for cards with a valid band); it is rendered visible on expansion. This is the pre-existing presentation for valid states, not a suppression.
- **Build-freshness nuance:** `src/data/grid.json` and `src/data/reference_lines.json` carry mtimes (19:10:33) newer than the build (19:06:44), but neither is functionally stale: reference_lines content is byte-identical to the 18:43 checkpoint, and grid.json changed only in its `generated` metadata field (rows identical; pinned sha matches the crosscheck report) and is not referenced by the UI (absent from the bundle). The audited UI is consistent with current sources.
- **Process note:** the first (shared) browser session drifted mid-audit to a sibling HTTP server serving the identical bundle; every final check was re-executed on an isolated session against the hash-verified 8793 server. No audit statement relies on the drifted session.

---

## Coverage note

**Exercised on the live built site (`dist/`, served on 8793, bundle hash verified):** all five round-5 checklist areas. States: SUPPRESSED (boys 18/8/30), NORMAL (boys 18/8/74, incl. boot state), FLAGGED (girls 18/8/30); regression states boys 0/3/no-length, 18/4/no-length, 18/4/80, 3/5/60; both languages (PL full, EN spot-check of all three states). Surfaces read: all six result cards (bands, banners, notes, `textContent` incl. collapsed details), the E volume table, all 73 table rows (C/D/ml columns aggregated), the table-top banner, the refeeding banner, and the products section (blueberry + honey cards). Visibility checks used rendered geometry (`getClientRects`, computed style), not just DOM presence. The NaN/undefined/Infinity scan ran over all 11 content sections + app HTML in the three states.

**Not assessed (other roles):** quantitative re-derivation of A–F and the grid (math auditor), source-vs-claim accuracy (citation auditor), Polish/English language quality and accessibility (UX/i18n), real screen-reader hardware.

**Environment:** headless Chromium via the browser harness (isolated session); HTTP server `python3 -m http.server 8793` on `dist/`.

---

## Verdict

critical: 0, major: 0
