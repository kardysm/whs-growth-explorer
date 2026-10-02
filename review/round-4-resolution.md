# Round-4 audit — resolution log (2026-10-02)

Method: three focused independent auditors (fresh context; final confirmation of round-3 fixes per GOAL §9). Raw findings: `review/round-4-clinical-safety.md`, `review/round-4-math.md`, `review/round-4-ux-i18n.md`.

**Verdicts as filed: clinical 0C/1M (+2 minors); math 0C/0M (+1 carried minor); UX 0C/0M (+1 minor).**

## Fixes applied

| ID | Finding | Resolution | Evidence |
|---|---|---|---|
| R4-1 (major, clinical) | In the suppressed state the C card still displayed the Culley sub-method number (`kcal/cm: 11,1 → 333 kcal/24h`), contradicting the card's own “values withheld” | The kcal/cm bullet is now gated by the C validity/plausibility state: it renders only when C has no alert; in the suppressed state it is hidden (the literature-range note remains, with no child-specific number) | live: 30 cm → no `kcal/cm: … → …` pattern on the card; 74 cm (normal) → bullet visible (`kcal/cm: 11,1 → 821 …`), no banner; suppressed alert text intact |
| R4-2 (minor) | Table `ml @density` column (and tooltip/CSV) showed `0` where C was suppressed (`Number(null) === 0`) | Guard added: `null` C → “—” in the table cell, empty field in CSV; tooltip path already skips non-finite C | live: 30 cm → ml column “—” for all rows |
| R4-3 (minor) | Flagged-but-not-suppressed C values (e.g. girls 18 mo/8 kg/30 cm → 25 kcal) propagated to D/E/table with no carry-over caution | Carry-over caution: the C alert is repeated as a visible banner on the D card and the E card and above the table (whenever the alert fires without suppression) | live: girls 30 cm → banners on C, D, E cards + table note; boys 18/8/65 cm likewise |
| R4-1 (minor, UX) | EN chart-1 hint lacked the entered-length/WHS-mean clause; PL table hint lacked the <6 mo caveat | Both strings aligned with the PL/EN counterparts | live: EN chart-1 hint contains “the entered length is used”; PL table hint contains the <6 mo caveat |
| Carried (math) | Crosscheck row-deletion/duplication still pass silently (NaN/±Inf now fail); documented as accepted residual risk | No change; already listed under known limitations | round-4 math report §3 |

## Regression evidence after fixes

- vitest **47/47**; tsc clean; build clean; content lint **0 errors / 0 warnings** (47/47 cited); links **47/47, 0 investigate**.
- Cross-check re-run last: full grid, **77,420 values**, 0 null mismatches, worst 0.000000%, **PASS**, grid hash pinned `eff3b4c8a2eb87f3…`; the grid `generated` field is now pinned to the project date so the hash is stable across future runs (sha verified equal after the final vitest run).
- Live browser: suppressed state — no numeric leak (bullet hidden, table “—”, ml column “—”); flagged state — carry-over banners on C/D/E + table note; normal state — bullet visible, no banners; hints correct in both languages.
- Round-4 math confirmations already on record: guard-semantics sweep 35,770/35,770 identical; whsZ +1.66 / +1.00; live-table ≤0.093% deviation; crosscheck report hash matches the shipped grid.
