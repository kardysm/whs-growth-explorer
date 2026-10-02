# Round-3 audit — resolution log (2026-10-02)

Method: four NEW independent auditors (fresh context; all prior logs as leads only). Raw findings: `review/round-3-citation.md`, `review/round-3-clinical-safety.md`, `review/round-3-math.md`, `review/round-3-ux-i18n.md`.

**Round-3 verdicts as filed: citation 0C/0M (+3 minors); clinical 0C/1M (+5 minors); math 0C/1M (+4 minors); UX 0C/0M (+1 minor).** The two majors were the same family (residual C-validity coverage + a card/table length-assumption inconsistency). Both were fixed in this round; all cheap minors fixed; the rest documented. **With these fixes applied, no critical or major finding remains open across rounds 1–3; the §7 loop is closed after 3 rounds (policy: stop at 0C+0M or after 3 rounds).**

## A. Major fixes (round 3)

| ID | Finding | Resolution | Evidence |
|---|---|---|---|
| R3-1 (clinical) / R3-1 (math) | (a) Charts/table always used the WHS-mean length even when a length was entered (cards vs table mismatch up to ~26%; suppressed state still numeric in table/charts); hint wording implied otherwise. (b) Near-zero C still displayed **without alert** for ages ≥6 mo at implausible entered lengths (girls 18 mo/8 kg/30 cm → 25 kcal/d) | (a) `drawCharts()` and `renderTable()` now compute **live with the entered length** (WHS-mean only when none entered) — cards, charts and table agree in every state; hints updated to state exactly that; suppressed state now shows “—” in the table too. (b) The plausibility guard is now **age-agnostic and two-sided**: alert when C < 0.5·A, or C/kg < 40, or C/kg > 250; generic wording (no boys-specific rationale); includes the kcal/kg value | live: length 65 → card C 400 = table C 400; length 30 → table C/D “—”; girls 18/8/30 cm → alert “25 kcal/24h ≈ 3 kcal/kg …”; 48 mo/2 kg → alert; tests 45→47 (girls-30cm + high-per-kg cases) |
| R3-2..R3-6 (clinical/math minors) | girls alert cited boys’ equation; blueberry card missing warning/tag; D-2 card showed protein while its band was “—”; B-card explanation only in collapsed details; plausibility guard age-bounded; table/chart collapsed C unannotated | Generic alert text (above); `build_foods.py` key fixed (`blueberry` — 10 choking items now); D-2 protein line hidden when method2 is null; null-band cards now render their notes **visibly** (not only in `<details>`); chart-1 + table hints now note the <6 mo C caveat | live: blueberry warning+tag; D-2 “—” with no protein line; checks above |
| R3-F1..F3 (citation minors) | carbs claim (“gas/stool water/quick energy”) not in its source; “3–4 weeks”/“3–7 day diary” intervals not in sources; diarrhoea items’ parenthetical contradicted their new `faltering_2026` citation | Carbs item → grade D + “practical guidance” wording; intervals marked “(practice)”; parentheticals reworded to “not a statement from the romano2017 neurological-impairment guideline” | content lint 0/0; items re-read |
| R3-1 (UX minor) | product filter didn’t fold `ł` (“maslo” → 0) | `strip()` now folds ł→l | live: “maslo” → “3 pozycje” |
| Hash pin (math minor) | crosscheck report pinned a stale grid hash (timestamp-only change) | Cross-check re-run **last**, after all generators: pins `a58d17f8…` of the shipped grid; non-finite guard added (NaN/±Inf now FAIL); min-row-count assertion | `research/qa/crosscheck-report.md` (77,420 values, 0 null mismatches, 0.000000%) |

## B. Remaining minors (documented, non-blocking)

- Crosscheck residual silent classes (from the math auditor’s sandbox demos): row deletion/duplication and sub-tolerance edits still pass; NaN/non-finite now fail; unsampled-row/whole-column/null-flip classes fail loudly. Recorded as accepted residual risk.
- Full in-chart keyboard navigation beyond the table fallbacks; dedicated allergen filter; real screen-reader hardware test (unchanged across rounds).
- “kcal/24h vs kcal/dzień” and minus-glyph cosmetic unification.
- ECharts residual engine aria text (per-chart localized description provided and primary).

## C. Round-2 verification (round-3 auditors’ re-checks)

All round-2 critical/major fixes CONFIRMED on the live build: C alert + suppression (cards, E table, and now table/charts), girls case, densification cautions (both), charts/table refresh, choking items (9/10 — the missing blueberry now fixed), refeeding WFA fallback, D-1/D-2 separation + scenario line, dark-chart text (pixel census: #e8e6e0 family; old dim colour 0 px), search suite, PL product wrapping/labels, mobile 95 px, axe 0/0/(0+1). Round-2 claims also re-verified in the sandbox for the crosscheck mutation classes (now loud for the main classes) and whsZ (+1.66 / girls +1.00 at +1SD line).

## D. Final regression evidence (after round-3 fixes)

- vitest **47/47**; tsc clean; build clean; content lint **0 errors / 0 warnings** (47/47 cited); links **47/47, 0 investigate**.
- Cross-check: full grid, **77,420 values**, 0 failures, 0 null mismatches, worst 0.000000%, hash `a58d17f8…` pinned, PASS.
- axe: light **0/0**, dark **0/0**, dialog (12-result scrollable list) **0 violations / 1 informational incomplete**.
- Live browser: card↔table agreement with entered length; suppressed state “—” everywhere; girls/high-per-kg alerts; blueberry card; ł filter; D-2 protein gating.
