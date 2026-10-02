# Round 3 — Math / model confirmation audit (final round)

- **Role**: math/model auditor (GOAL.md §7.1, role 3), round 3, fresh context.
- **Date**: 2026-10-02 (UTC). Repo: `/opt/data/whs-growth-explorer` (filesystem snapshot; not under git).
- **Artifacts audited** (sha256, first 8): `src/data/grid.json` `dbd1802d`, `research/data/parameters.json` `5055159f`
  (byte-identical to `src/data/parameters.json`), `scripts/crosscheck.py` `91039022`, `src/data/whs_digitized.json`
  `82d7eca9` (unchanged vs round-2's audited hash), `research/data/whs_growth/antonius_digitized.csv` `9bce1471`,
  `src/calc/methods.ts` `b48daac3`, `src/calc/energy.ts` `8f7ef56e`, `research/qa/crosscheck-report.md` `1cfd1ca2`.
- **Method**: a from-scratch Python re-implementation (`verify_r3.py`) built **only** from raw/data copies — EFSA AR
  summaries + Appendix 13, PZH text, FAO raw htm, `parameters.json`, WHO LMS, the Antonius CSV and
  `whs_digitized.json`. **No import of `src/calc`; `scripts/crosscheck.py` was read and only *run* in sandbox
  copies** under `/home/kardysm/projects/whs-r3-audit/` (repo untouched). Live-path checks executed the **actual
  shipped TypeScript** via vitest in a sandbox copy (`livecheck/`), 10 scenarios with a full NaN/Inf scan. 14
  crosscheck sandbox runs (pristine + mutations). Work products: `verify_r3.py`, `cc_tests.py`,
  `residual_window.py`, `livecheck/livecheck.test.ts` + `verify_r3-out.txt`, `cc-tests-out.txt`,
  `livecheck-out.json`, `residual-window-out.txt` in the same directory.
- **Volume**: full sweep of **all 7,154 grid rows × 11 stored fields (77,420 comparisons)** + 5 assigned checks +
  14 crosscheck runs + 10 live-code scenarios + residual-window quantification.

**Verdict: critical: 0, major: 1** (+4 minor). All five assigned round-3 checks reproduce: the full grid
re-derives **exactly** (77,420/77,420 values float-identical to my independent recomputation, 0 deviations); the
three required crosscheck mutation classes now FAIL loudly. The one major is the **residual of R2-1**: the validity
guard suppresses only `BMR ≤ 0`; with `BMR > 0` but tiny, C is still displayed **without any alert at ages ≥ 6 mo**
when an implausibly short length is entered (e.g. girls 18 mo / 8 kg / 30 cm → **25.3 kcal/day**, no banner).

---

## 1. Assigned round-3 checks — results

### (1) C-suppression semantics (boys 18 mo / 8 kg / 30 cm → BMR < 0) — **PASS**

Coefficients re-read from `research/raw/efsa_energy_text.txt` (Appendix 13: boys 0–3 y `0.167 BM + 1517.4 H − 617.6`;
girls `16.25 BM + 1023.2 H − 413.5`) and `parameters.json` (`bmr_ree.schofield_1985_weight_height`):

- BMR(boys, 18 mo, 8 kg, 30 cm) = 0.167·8 + 1517.4·0.30 − 617.6 = **−161.044 kcal/day** (< 0 ✔); the unguarded
  Krick-type C would be −161.044 × 0.9 × 1.2 = **−173.93 kcal/day** — a negative energy requirement, i.e. nonsense;
  **suppression is mathematically right**.
- Zero crossing for the boys' <3 y equation at 8 kg: **40.61 cm**; entered lengths ≤ 40.6 cm give BMR ≤ 0.
- Current code (`methods.ts` `cValid = bmr > 0 && Number.isFinite(bmr)`) verified live: C = {null,null,null}, alert
  *“Model out of range for these inputs (BMR <= 0) — values withheld…”*, D = nulls + guardrail *“D withheld”*,
  `percentOfA/B` = null, all `mlForC/mlForD` = null, no NaN anywhere (sandbox vitest run).
- Girls comparison: at 30 cm/8 kg the girls' equation stays positive (BMR +23.46 → C = 25.3, *shown*; zero crossing
  ~27.7 cm at 8 kg; girls 2 kg/30 cm → BMR −74.04 → suppressed). See R3-1 for the residual window this exposes.

### (2) Month-0 alert condition (boys 0 mo, WHS mean length) — **PASS**

Grid A(boys, 0 mo) = **422.883228** kcal/d → 0.5·A = **211.4416**. Antonius CSV mean length at 0 mo = **42.384 cm**
(identical in `whs_digitized.json`). Recomputed C at that length, all grid weights 2–20 kg:

| w (kg) | 2 | 5 | 8 | 12 | 16 | 20 |
|---|---|---|---|---|---|---|
| C (kcal/d) | 27.94 | 28.48 | 29.02 | 29.74 | 30.46 | 31.19 |
| C/(0.5·A) | 0.132 | 0.135 | 0.137 | 0.141 | 0.144 | **0.147** |

Max ratio 0.1475 < 1 ⇒ **C < 0.5·A at every month-0 weight** (both alert arms also hold: C/kg 13.97→1.56 < 40).
Live (sandbox): boys 0 mo / 3 kg → C 28.1 [28.1–34.4] + the visible alert banner; grid C at 0 mo recomputes exactly
(27.938321 / 28.479401 / 31.184801). The condition as coded (`ageMonths < 6 && (C < 0.5·A || C/kg < 40)`) fires.

### (3) whsZ same-side half-gap — **PASS**

From `src/data/whs_digitized.json`, boys 18 mo weight lines: mean **6.635**, +1SD **7.456**, +2SD 8.261, −1SD 5.808.

- z(8 kg) = (8 − 6.635) / (7.456 − 6.635) = 1.365 / 0.821 = **+1.6626 → ≈ +1.66** (as expected; live value
  1.6626065773447005; the old lower-gap formula would have given +1.6505).
- Girls asymmetry cases (same-side vs old lower-gap):
  - girls 0 mo **length** (gaps 3.968 vs 2.598, ratio 1.53): a value on the +1SD line → same-side **+1.0000** vs old
    **+1.5273** (live code: exactly +1.0; −1SD-line point → −1.0);
  - girls 0 mo **weight** (gaps 0.393 vs 0.608): +1SD-line point → **+1.0** vs old **+0.6464**;
  - girls 18 mo **length** (ratio 1.155): +1SD-line point → **+1.0** vs old +1.1551.
- `zOf()` in `methods.ts` (same-side half-gap: `v ≥ mean → +1SD gap, else −1SD gap`) and the live outputs confirm
  the fix; regression test asserts ≈ +1.66.

### (4) crosscheck.py full-sweep version — mutation classes — **PASS (3 required classes), 3 residual silent classes**

Read in full (279 lines; full-grid sweep, all 11 fields, null-mismatch = FAIL, compared-count assertion, sha256
pinned). Sandbox (`cc-sandbox/`, copies not symlinks; pristine restored between runs):

| # | mutation | verdict | evidence |
|---|---|---|---|
| 0 | pristine (shipped grid) | PASS | 77,420 values, 0 null mismatches, worst 0.000000% |
| 1 | **(a)** unsampled row boys 44 mo/10.25 kg, C/Clo/Chi ×3 | **FAIL** | worst 66.666667% (grid 2349.4267 vs rec 783.1422), 3 failure rows |
| 2 | arbitrary row girls 31 mo/6.75 kg, A-band ×1.02 | **FAIL** | worst 1.960784%, 3 failure rows |
| 3 | **(b)** whole column boys 23 mo, C ×2 (73 rows) | **FAIL** | worst 50.000000%, 50 failure rows shown (report cap) |
| 4 | whole field column, Dlo ×1.1 (all 7,154 rows) | **FAIL** | worst 9.090909%, 50 failure rows shown |
| 5 | **(c)** null-flip C → null (boys 18 mo/3 kg) | **FAIL** | null-mismatch = 1, compared 77,419 |
| 6 | null-flip B null → 5.0 (boys 0 mo/20 kg) | **FAIL** | null-mismatch = 1, compared 77,420 |
| 7 | C → **NaN** | **PASS (silent)** | report identical to pristine — non-finite values are not checked |
| 8 | C → **+Infinity** | **PASS (silent)** | same |
| 9 | C ×1.001 (0.0999%) | PASS | within the 0.5% tolerance, by design |
| 10 | row deleted (7,153 rows) / row duplicated (7,155) | **PASS (silent)** | count assertion is self-referential (`len(rows)×10`) |
| 11 | reorder two rows | PASS | harmless |
| 12 | restored pristine | PASS | same as #0 |

**All three classes the round-2 audit proved silent are now caught loudly.** Residual silent classes (new, minor
R3-3): non-finite values (NaN/±Inf), row add/delete, and sub-tolerance edits (by design).

### (5) Shipped report hash + acceptance line — **hash MISMATCH (proven timestamp-only); acceptance internally consistent**

- Shipped `crosscheck-report.md` pins `grid.json sha256: 9f2b3e7a…`; the current `grid.json` is `dbd1802d…` ⇒
  **does not match**.
- Proof of cause: replacing `"generated":"2026-10-02T18:16:02.923Z"` with `"generated":"2026-10-02T17:37:39.876Z"`
  in the shipped file reproduces sha256 `9f2b3e7a…` **exactly** (8 differing characters total). All 7,154 rows ×
  11 fields are value-identical between the report-pinned build and the shipped file. Timeline: report generated
  18:10:16 → `whs_digitized.json` 18:10:31 → `methods.ts` 18:11:04 → grid rebuilt 18:16:02 (meta timestamp only;
  values unchanged) → report never re-run.
- Fresh crosscheck run against the **shipped** grid reproduces the report **verbatim except the hash line**
  (diff = hash only); verdict PASS, 77,420 values, 0 null mismatches, worst 0.000000%.
- Acceptance line internally consistent: 77,420 = 7,154×11 − 1,274; expected ≥ 71,540 = 7,154×10; 0 failures > 0.5%
  + 0 null mismatches + count ok ⇒ PASS. ⇒ R3-2 (minor): the pin is stale; re-run required.

---

## 2. New findings

### R3-1 — [major] Residual of R2-1: near-zero C is still displayable **without any alert at ages ≥ 6 mo** (short entered lengths); the implemented guard covers only `BMR ≤ 0` and `< 6 mo`

**Location**: `src/calc/methods.ts` C block (l. 130–137): `cValid = bmr > 0`; the plausibility alert is gated
`ageMonths < 6 && (cCentral < 0.5·A || cCentral/weightKg < 40)`. Inputs allow length 30–120 cm, age 0–48 mo,
weight 1–25 kg (`src/ui/main.ts` l. 185–189).

**Evidence** (live sandbox runs of the shipped code; no alert in any of these):

| input | C band (kcal/d) | %A | banner? |
|---|---|---|---|
| girls 18 mo / 8 kg / **30 cm** (UI minimum) | **25.3 – 25.3 – 31.0** | 3.1% | **none** |
| boys 18 mo / 8 kg / 41 cm | **6.3 – 6.3 – 7.7** | 0.7% | none |
| boys 18 mo / 8 kg / 45 cm | 71.9 – 71.9 – 87.9 | 8.0% | none |
| boys 6 mo / 18.5 kg / 40.5 cm | **0.04** | 0.007% | none |
| boys 18 mo / 8 kg / 30 cm | suppressed ✔ (BMR −161) | — | alert ✔ |

- Window (using the project's own `<6 mo` criteria, unflagged): boys 18 mo/8 kg → entered length **41–68 cm**;
  girls 18 mo/8 kg → **30–65 cm**; boys 6 mo/5 kg → 41–58.5 cm; girls 6 mo/5 kg → 32.5–57 cm. 76.3% of all
  (sex × age 6–48 × weight 2–20) combos have ≥ 1 such reachable length in [30, 120] cm. For ages ≥ 36 mo the
  weight-heavy Schofield equations keep C large — the window is a <3 y-equation phenomenon.
- Context: R2-1's accepted fix list included “clamp/flag **negative or near-zero** outputs” and “at minimum a
  prominent caveat for age < 3 mo / **length < 45 cm**”; the shipped guard implements the negative case (any age)
  and the <6 mo alert, but not near-zero for ≥6 mo nor the length < 45 cm caveat. README limitation #7 documents
  the < 6 mo scope, so this is a *partially* documented residual.
- **Suggested fix** (small): extend the existing plausibility alert (or a floor, e.g. suppress C/D below some
  kcal/kg or fraction of A) to apply whenever a length was **entered**, at any age; add a regression test
  (girls 18 mo/8 kg/30 cm → banner or suppression); update README #7. Mitigating factors: requires an implausible
  entered length (data-entry error), the default (no-length) path is unaffected, no NaN anywhere, and D/E/% all
  propagate consistently (nulls stay null).

### R3-2 — [minor] Shipped `crosscheck-report.md` hash does not match the shipped grid (stale pin; timestamp-only rebuild)

See check (5). No numeric impact (values proven identical; fresh run reproduces the report except the hash).
**Fix**: re-run `.venv/bin/python scripts/crosscheck.py` once (re-pins `dbd1802d…`); add a note to the README
data-regeneration section: re-run the crosscheck after **any** grid rebuild — even a metadata-only rebuild changes
the file hash.

### R3-3 — [minor] crosscheck.py residual silent-pass classes: non-finite values, row count changes

NaN/±Infinity injected into grid values pass silently (`abs(g−rr)/max(abs(g),1e-9)` → NaN → never > threshold);
row deletion/duplication passes silently (the count assertion is relative to the mutated file itself). **Fix**:
assert `math.isfinite` on every compared pair; assert the expected row count (2 sexes × 49 ages × 73 weights =
7,154) and the expected compared-value count (77,420) from the `parameters.json` scope instead of `len(rows)`.

### R3-4 — [minor] The <6 mo plausibility alert text mis-describes the girls' equation

The banner says “*…the boys' Schofield <3 y equation rests almost only on length here*” — but it also fires for
girls (e.g. girls 0 mo), whose equation is weight-dominated (16.25·W vs 1023.2·H). PL text has the same issue.
**Fix**: make the clause sex-aware or drop it (the actionable part — “do NOT use C as a feeding target” — is valid
for both).

### R3-5 — [minor] Table/chart still show the collapsed C values for months 0–2 with no in-context warning

The grid is intentionally unchanged (e.g. boys 0 mo/2 kg C = 27.94 kcal/d, girls 0 mo/2 kg = 87.26); the alert
exists only on the calculator card, and `table.hint`/`chart1_hint`/methodology p2 mention only the WHS-length
default (“entering a measured length materially changes C”), not that these values are below a plausible range.
**Fix**: table footnote or cell flag for rows satisfying the `<6 mo` plausibility criteria, or an explicit
Known-limitations entry.

---

## 3. Light new checks — live-only paths (all clean)

Ran the shipped `computeAll()` (vitest, sandbox copy) on 10 scenarios and scanned **every numeric field** of each
result for NaN/±Infinity — **none found** in any scenario:

- `percentOfA` / `percentOfB` when C is suppressed → **null** (not NaN): boys 18 mo/8 kg/30 cm and the same case
  with a measured intake entered.
- E `mlForC` / `mlForD` when C is null → **null** for every density (0.67 / 1.0 / 1.5); volume flags skipped;
  F = null (guarded).
- D-2 (`method2`) when C is null → **null** + note (“needs weight within WHO range and length provided”). Structurally,
  any length that yields `BMR ≤ 0` (≤ ~40.7 cm boys, ≤ ~38.8 cm girls) is below the WHO weight-for-length table
  range (≥ 45 cm), so D-2 cannot produce a numeric value in a C-null call; when the length is in range, D-2 is
  finite (e.g. boys 18 mo/4 kg/80 cm → 1261 kcal, 315.3 kcal/kg, D-2 guardrail fires; matches round-2 check 6).
- Suppressed case fully consistent: C/D nulls + alerts; `bandStr(null)` renders “—”; no `toFixed` on null anywhere
  in the C/E/D-2 render paths (`src/ui/main.ts` l. 84–86, 301, 318).

## 4. Coverage note

- **Checked**: all five assigned checks; raw-source grounding of every constant used (EFSA children AR/PAL1.4 parsed
  from the raw text — 2 complete copies agree, a third is truncated in the fetched file; EFSA infants 7–11; PZH
  month-6; Schofield App. 13; FAO spot set; NASEM coefficients present in `parameters.json`); WHO LMS research vs
  `src/data` copies byte-identical; WHS JSON vs CSV mean lines (68 points, 0 mismatches); **full-grid sweep of
  7,154 rows × 11 fields = 77,420 exact float-identical values, 0 deviations, 0 null mismatches, 0 non-finite**;
  residual scans (no C ≤ 0; 149 rows C < 100 kcal/d — months 0–1 only: boys 73+73, girls 3); 14 crosscheck sandbox runs; 10 live-code
  scenarios + NaN scan; report/hash forensics (timestamp-only difference proven); dist build ordering (built
  18:16:03, after the 18:16:02 grid; bundle contains the current values).
- **Not checked**: re-digitization accuracy of the Antonius/Calhoun charts (CSV taken as given); execution of the
  built bundle in a browser (live code run via vitest, not the DOM); clinical appropriateness of the method
  choices (separate reviewer role); the residual-window quantification uses my own recomputation of the shipped
  formulas (verified exact against the grid), not a clinical judgment of “plausible”.
- **Reproduce**: `/opt/data/whs-growth-explorer/.venv/bin/python /home/kardysm/projects/whs-r3-audit/verify_r3.py`
  (checks 1–5 + full sweep), `cc_tests.py` (crosscheck mutations), `residual_window.py`, and
  `cd /home/kardysm/projects/whs-r3-audit/livecheck && ./node_modules/.bin/vitest run livecheck.test.ts`.
  Outputs: `verify_r3-out.txt`, `cc-tests-out.txt`, `residual-window-out.txt`, `livecheck-out.json` in the same
  directory. The repo was not modified outside `review/`.
