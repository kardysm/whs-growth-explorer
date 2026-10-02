# Round 4 — Math/model FINAL confirmation audit

- **Role**: math/model auditor (GOAL.md §7.1, role 3), round 4 — final confirmation, fresh context.
- **Date**: 2026-10-02 (UTC). Repo: `/opt/data/whs-growth-explorer` (filesystem snapshot; not under git).
- **Artifacts audited** (sha256): `src/data/grid.json` `a58d17f8…` (full: `a58d17f86735851d75ffe6938298171f7515f29982c301de67a0a950526c0fdf`),
  `src/calc/methods.ts` `7b314a55…`, `src/data/whs_digitized.json` `82d7eca9…` (unchanged vs round 3), `research/data/parameters.json`
  `5055159f…` (byte-identical to `src/data/parameters.json`), `scripts/crosscheck.py` `cb21d592…`, `research/qa/crosscheck-report.md`
  `eca8065e…`, `research/data/whs_growth/antonius_digitized.csv` `9bce1471…`, `dist/assets/index-CxHa7yaY.js`
  `10ed425e…` (built 18:40:54, after the 18:40:45 grid; contains the age-agnostic guard text).
- **Method**: a from-scratch Python re-implementation (`verify_r4.py`) built only from raw/sourced data — Antonius CSV, WHO LMS
  files, `parameters.json`, EFSA/FAO/NASEM constants re-typed from the sourced tables — **no import of `src/calc`**. The shipped
  behaviour was used as the comparison *target*: the actual current `computeAll()` was run on **all 35,770 sweep cases** in a
  sandbox copy (`livecheck/`, vitest, `src/` copied fresh — hash-verified), plus 7 sandbox runs of `scripts/crosscheck.py`, plus
  live DOM reads of the built site served from `dist/` on :8793 (asset hash-verified against the repo). All work products under
  `/home/kardysm/projects/whs-r4-audit/`; the repo was not modified outside `review/`.
- **Volume**: 35,770-case guard sweep ×2 independent implementations + 42,924-value grid grounding + 98 WHS mean-length checks +
  7 crosscheck sandbox runs + 3 shipped-code vitest runs + live DOM reads (3 required pairs + 2 probes, 7 columns each).

**Verdict: critical: 0, major: 0** (+1 carried, already-documented minor — crosscheck row delete/duplicate silent pass).
All five assigned checks reproduce; **zero misclassifications** in the full guard sweep.

---

## 1. Verification table (assigned checks)

| # | Check | Result | Headline evidence |
|---|---|---|---|
| 1 | Guard semantics — 35,770-case sweep, C reconstructed from Antonius CSV mean length + Schofield | **PASS** | Classification identical in 35,770/35,770 cases (my Python vs shipped TS); C and A **bit-identical** (max abs diff 0.0); misclassification list **empty**; closest boundary pair separated by ~0.007 kcal/kg |
| 2 | whsZ unchanged — boys 18 mo/8 kg = +1.66; girls 0 mo length at +1SD = +1.00 | **PASS** | Shipped code returns `1.6626065773447005` and `1` exactly; my recomputation identical |
| 3 | crosscheck guards — (a) NaN (b) ±Inf (c) row deletion (d) duplicate row | **PASS for a/b (now FAIL loudly); c/d still silent** | NaN/+Inf/−Inf → `FAIL` + `NON-FINITE` rows; 1-row delete and 1-row duplicate → silent PASS (count assertion self-referential; min-row guard trips only <7,000 rows). Carried minor (documented) |
| 4 | Report hash == sha256(grid.json) + acceptance line | **PASS** | Pin `a58d17f8…` == computed sha256; acceptance `PASS`, internally consistent; pristine sandbox re-run reproduces the shipped report **byte-for-byte** |
| 5 | Live table vs model — 3 (age,weight) pairs, tolerance 0.5% | **PASS** | Max relative difference **0.093%** (displayed integers vs my full-precision values); extra probes corroborate the entered-length path and the live alert |

---

## 2. Check (1) — guard semantics (the sweep)

**Conditions read from `methods.ts` (hash `7b314a55…`, lines 130–139), matching the task statement exactly:**

- suppression: `cValid = bmr > 0 && Number.isFinite(bmr)`; if false → C = nulls + alert *“Model out of range (BMR <= 0)”*;
- else plausibility alert fires iff `cCentral < 0.5·A.central` **or** `cCentral / weightKg < 40` **or** `cCentral / weightKg > 250`
  (strict inequalities; `A.central` non-null for all ages 0–48, so the `?? Infinity` arm is unreachable in scope).

**Sweep**: 2 sexes × 49 ages (0–48) × 73 weights (2–20, step 0.25) × 5 length kinds {none (WHS mean from the Antonius CSV,
linearly interpolated between the 3-month points), mean−10%, mean+10%, 60, 80} = **35,770 cases**. Tone/activity at the grid
defaults (hypotonic 0.9 / dependent 1.2, per `grid.json` meta).

**Results**

| quantity | count | notes |
|---|---|---|
| total cases | 35,770 | |
| suppressed (BMR ≤ 0) | **73** | exactly boys 0 mo, length 38.1456 cm (mean−10%), all 73 weights: BMR = 0.167·w − 38.77 < 0 (8 kg → −37.44). Every suppressed case has implied C ≤ 0 < 0.5·A ⇒ suppression never hides a plausible value |
| plausibility alert | **15,559** (43.5%) | trigger combinations: `lt40` only 6,460; `halfA` only 4,365; `halfA+lt40` 4,237; `gt250` only 394; `halfA+gt250` 103 |
| no alert | 20,138 | C ≥ 0.5·A **and** 40 ≤ C/kg ≤ 250 in every one |
| fires by length kind | none 2,914 · m10 5,047 · p10 1,684 · c60 4,959 · c80 955 | fixed 60/80 cm are implausible for many ages by design of the sweep |

**Exactness / misclassification scan — result: EMPTY (0 cases).**

1. Applying the stated predicate to the **shipped** full-precision C and A values reproduces the shipped alert kind in
   **35,697/35,697** non-suppressed cases (0 mismatches); including the 73 suppressed → 35,770/35,770.
2. My independent implementation produces **bit-identical** C and A (max absolute difference 0.0 over all 35,770 cases) and
   identical classifications; the WHS mean lengths used agree bit-exactly with the shipped `whs.get` (98/98 values).
3. Grounding: for the length=none rows my model reproduces the shipped grid **exactly** — 42,924/42,924 values
   (A, Alo, Ahi, C, Clo, Chi across all 7,154 rows), max abs diff 0.0.
4. Boundary robustness: closest firing case — boys 8 mo / 8.75 kg / mean → C/kg = **39.998574** (fires 0.0014 below the 40
   floor); closest non-firing case — girls 21 mo / 11.75 kg / mean−10% → C/kg = **40.005931** (0.0059 above). The two
   implementations are bit-identical, so no floating-point flip exists anywhere in the sweep.

**“Never for plausible inputs”** — verified in the only self-consistent sense: the guard never fires when C is inside the
plausible range (C ≥ 0.5·A **and** 40 ≤ C/kg ≤ 250), and never fails to fire when C is outside it. Note for transparency:
the sweep *does* contain fires for plausible-looking **inputs** (WHS-typical length/weight), because the C value itself sits
below the plausibility floor there — these are the intended R2-1/R3-1 alerts, i.e. true positives under the stated semantics,
not misclassifications. The set is fully enumerable:

- mean length, weight z ∈ [−2,2]: **297 fires** — months 0–5: 118 (mid-range weights; `halfA` + mostly `lt40`); months 6–48:
  179 (**all via `lt40` only**; boys 167 / girls 12). Representative cases:
  boys 6 mo/8.0 kg/mean → C 304.37 (38.05 kcal/kg) · boys 18 mo/13.0 kg/mean → C 505.37 (38.87 kcal/kg) ·
  girls 2 mo/5.0 kg/mean → C 200.02 vs 0.5·A = 276.55 (`halfA`; C/kg 40.003) · boys 0 mo/2.0 kg/mean → C 27.94 (13.97 kcal/kg,
  both arms) · girls 6 mo/8.75 kg/mean → C 343.74 (39.28 kcal/kg).
- mean−10% length, z ∈ [−2,2]: fires at every age 0–48 (7–28 cases per age), all values below the floor or BMR ≤ 0.
- Live corroboration: girls 18 mo / 8 kg / **30 cm** → table C = **25**, alert *“Wartość C (25 kcal/24h ≈ 3 kcal/kg) leży poza
  wiarygodnym zakresem…”* — the R3-1 fix firing on the live build (my model: 25.3368; display 25).

## 3. Check (2) — whsZ unchanged

From `whs_digitized.json` (boys 18 mo weight lines: mean 6.635, +1SD 7.456, −1SD 5.808, +2SD 8.261), same-side half-gap formula
read from `zOf()` in `methods.ts`:

| case | my recomputation | shipped `computeAll()` | old lower-gap formula |
|---|---|---|---|
| boys 18 mo / 8 kg (weight) | **+1.6626065773447005** | `1.6626065773447005` | +1.6505 |
| girls 0 mo length 49.101 (+1SD line) | **+1.0** (exact) | `1` | +1.5273 |
| girls 0 mo length 42.535 (−1SD line) | **−1.0** (exact) | `−1` | — |
| girls 0 mo weight at +1SD line (2.699) | +1.0 | `1` | +0.6464 |
| girls 18 mo length at +1SD line (73.399) | +1.0 | `1` | +1.1551 |

Live note on the build: boys 18 mo/8 kg shows “Pozycja masy na siatce WHS: ≈ 1,7 SD”. (`whsZ.length` is computed but not
rendered in the UI — same as rounds 1–3; no claim depends on its display.) **PASS.**

## 4. Check (3) — crosscheck guards (sandbox copies of `scripts/crosscheck.py` `cb21d592…` + data; repo untouched)

| # | mutation | acceptance line | detail |
|---|---|---|---|
| 0 | pristine | **PASS** | sandbox report **bytewise identical** to the shipped `crosscheck-report.md` (sha256 `eca8065e…`), 77,420 values, 0.000000% |
| a | `"C":NaN` (boys 0 mo/2 kg) | **FAIL** | 1 `NON-FINITE` row: `grid=nan rec=27.93832127999992` — now caught (was silent in round 3) |
| b | `"C":Infinity` | **FAIL** | 1 `NON-FINITE` row |
| b2 | `"C":-Infinity` | **FAIL** | 1 `NON-FINITE` row |
| c | 1 row deleted (7,153 rows) | **PASS (silent)** | count assertion still self-referential (`expected_min = len(rows)·10`); min-row guard `len(rows) ≥ 7000` not tripped; “Values compared: 77410” |
| c2 | 155 rows deleted (6,999) | **FAIL** | min-row assertion trips (< 7,000) — large deletions are caught |
| d | 1 row duplicated (7,155) | **PASS (silent)** | duplicate compares equal; count self-referential; “Values compared: 77430” |

**Summary: (a) NaN and (b) ±Inf now FAIL loudly; (c) single-row deletion and (d) single-row duplication still pass silently.**
The residual c/d class is the known, already-documented minor (D-020; `review/round-3-resolution.md` §B — accepted residual
risk), verified unchanged this round. Mitigation on record: any mutation changes the grid file hash, and the shipped report
pins the expected hash, so an external hash check catches it.

## 5. Check (4) — report hash + acceptance line

- `sha256(src/data/grid.json)` = `a58d17f86735851d75ffe6938298171f7515f29982c301de67a0a950526c0fdf`.
- `research/qa/crosscheck-report.md` pins the **same full hash** ⇒ **MATCH** (round-3 stale-pin R3-2 resolved).
- Acceptance line: `Acceptance (0 failures > 0.5%, 0 null mismatches, count >= expected): PASS` — internally consistent:
  77,420 compared = 7,154×11 − 1,274 (B null rows); expected ≥ 71,540; 0 failures > 0.5%; 0 null mismatches; count ok.
- Strongest form: a fresh sandbox run against the shipped grid reproduces the report **byte-for-byte** (same sha256).

## 6. Check (5) — live table vs model (served `dist/` on :8793; DOM read)

Served asset `index-CxHa7yaY.js` sha256-verified against the repo build. Table rows read from the live DOM; model values
from my independent recomputation (full precision); displayed values are integers (`maximumFractionDigits: 0`).

| pair (sex/age/weight/length) | column | live DOM | my model | rel diff |
|---|---|---|---|---|
| boys 18 mo / 8 kg / no length | A · B · C · D · fluid · ml@1.0 | 903 · 604 · 504 · 504 · 800 · 504 | 902.5 · 604.0909 · 504.4668 · 504.4668 · 800 · 504.4668 | 0.055% · 0.015% · **0.093%** · 0.093% · 0% · 0.093% |
| girls 6 mo / 5 kg / no length | A · B · C · D · fluid · ml@1.0 | 549 · 544 · 278 · 278 · 500 · 278 | 549 · 544.0329 · 277.9254 · 277.9254 · 500 · 277.9254 | 0% · 0.006% · 0.027% · 0.027% · 0% · 0.027% |
| boys 36 mo / 12 kg / length 80 | A · B · C · D · fluid · ml@1.0 | 1174 · 1012 · 815 · 815 · 1100 · 815 | 1174 · 1012.1635 · 814.6872 · 814.6872 · 1100 · 814.6872 | 0% · 0.016% · 0.038% · 0.038% · 0% · 0.038% |

**Max relative difference 0.093% ≪ 0.5% ⇒ PASS.** Notes: the 902.5→“903” display is Intl half-expand rounding (Python's
banker's rounding gives 902) — the underlying value is identical; no C plausibility banner appeared for any of the three pairs,
matching the model (none of the three predicates holds). Extra probes: boys 36/12 at length **60** → C 787 vs model 786.5424
(entered-length path confirmed); girls 18/8 at length 30 → C 25 + the R3-1 alert (see §2). Display-resolution caveat: integer
display on very small values (e.g. 25 kcal) can exceed 0.5% from rounding alone — a display limitation, not a model
discrepancy; the three chosen pairs avoid it.

---

## 7. New findings

**None at critical or major severity.** The one residual class touched by this round is a carried, already-documented minor:

- **[minor — carried, unchanged]** `crosscheck.py` single-row deletion and single-row duplication still pass silently
  (self-referential count assertion; min-row guard only trips below 7,000 rows). Verified again this round; documented in
  D-020 and `review/round-3-resolution.md` §B as accepted residual risk. Not re-filed as new.

Observations (not findings, for the record): (i) the `A.central ?? Infinity` arm of the guard is unreachable for ages 0–48
(A is never null there); (ii) `whsZ.length` is computed but not surfaced in the UI (only the weight position is rendered);
(iii) the guard fires for WHS-typical inputs where C is genuinely below the plausibility floor — intended R2-1/R3-1 behaviour
(§2 lists every such family).

## 8. Coverage note

- **Checked**: all five assigned checks; the full 35,770-case sweep in two independent implementations (mine + the shipped TS
  run on a hash-verified sandbox copy); bit-exact C/A equality; 42,924-value grid grounding; 98 WHS mean-length values;
  suppression set exhaustively (73 cases, all boys 0 mo mean−10%); boundary margins on all three predicates; trigger
  combinations; plausible-subset enumeration; whsZ on the shipped code path; 7 crosscheck sandbox runs (pristine + 6
  mutations) with bytewise report reproduction; hash/acceptance forensics; live DOM reads from the served build (asset
  sha256-verified), including the entered-length path and one live guard alert.
- **Not checked**: re-digitization accuracy of the Antonius/Calhoun charts (CSV taken as given); clinical appropriateness of
  the 0.5·A / 40 / 250 thresholds (design choice); tone/mobility combinations beyond the grid defaults (hypotonic/dependent) —
  the guard scales with `cCentral`, so other tone/activity choices shift C and can move threshold cases by design; lengths
  outside the specified sweep set (30–59, 61–79, 81–120 cm) — two live probes at 60/30 cm were consistent; ages outside 0–48 /
  weights outside 2–20 (UI caps age at 48; weight 1–25); DOM behaviour beyond the table/card notes.
- **Reproduce**: `cd /home/kardysm/projects/whs-r4-audit && /opt/data/whs-growth-explorer/.venv/bin/python verify_r4.py`
  (sweep + grounding + whsZ + check 4), `compare_r4.py` (Python↔shipped-TS comparison), `cc_mutations_r4.py` (crosscheck
  sandbox mutations), `pair_values.py` (live-pair model values); shipped-code runs:
  `cd livecheck && ./node_modules/.bin/vitest run r4sweep.test.ts r4whsz.test.ts r4whsz2.test.ts`; live: serve `dist/` on :8793 and read the
  table DOM. Outputs: `r4_sweep_cases.csv`, `r4_sweep_summary.json`, `r4_check2_whsz.json`, `r4_grid_ground.json`,
  `r4_check4.json`, `r4_js_compare.json`, `r4_cc_mutations.json`, `livecheck/r4sweep-out.csv`, `livecheck/r4whs-means.json`.
  The repo was not modified outside `review/`.

**critical: 0, major: 0**
