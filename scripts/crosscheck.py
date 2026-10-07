#!/usr/bin/env python3
"""Independent cross-check (GOAL.md §6) — round-1-audit updated version.

Recomputes grid points in Python from the raw data files (no imports from src/calc) and
compares against src/data/grid.json. This version (post audit round 1):
  * EFSA infants: months 6..11 (month 6 = PZH 2024; EFSA starts at 7) + month-12 anchor,
    fractional months interpolated linearly (mirrors the fixed JS behaviour; audit F2);
  * EFSA girls year 3 = 1096 (audit F3);
  * FAO girls 11-12 mo = 712 (audit F5); FAO included in the A band (low/high);
  * C default length = WHS mean length for age (digitized Antonius 2008), matching the
    grid/live default (audit F1);
  * compares ALL stored fields: A/Alo/Ahi/B/C/Clo/Chi/D/Dlo/Dhi/fluid.

Acceptance: max relative difference <= 0.5% on every compared field.
Report: research/qa/crosscheck-report.md (and stdout).
"""
import csv
import json
import math
import pathlib
import random

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "research" / "data"
GRID = json.loads((ROOT / "src" / "data" / "grid.json").read_text())

WHO = {k: json.loads((DATA / "who_lms" / f"{k}.json").read_text()) for k in
       ["wfa_boys", "wfa_girls", "lhfa_boys", "lhfa_girls"]}

# WHS digitized means by (sex, month) for weight and length
whs_mean_w, whs_mean_l = {}, {}
for row in csv.DictReader((DATA / "whs_growth" / "antonius_digitized.csv").open()):
    if row["line"] == "mean" and row["value"]:
        key = (row["sex"], int(row["age_months"]))
        if row["measure"] == "weight":
            whs_mean_w[key] = float(row["value"])
        elif row["measure"] == "length":
            whs_mean_l[key] = float(row["value"])


def col(t, name):
    return [c.strip() for c in t["columns"]].index(name)


def lms(t, anchor):
    rows = t["rows"]
    if anchor < rows[0][0] or anchor > rows[-1][0]:
        return None
    lo, hi = 0, len(rows) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if rows[mid][0] <= anchor:
            lo = mid
        else:
            hi = mid
    r0, r1 = rows[lo], rows[hi]
    a0, a1 = r0[0], r1[0]
    tt = 0 if a1 == a0 else (anchor - a0) / (a1 - a0)
    return [r0[col(t, "L")] + (r1[col(t, "L")] - r0[col(t, "L")]) * tt,
            r0[col(t, "M")] + (r1[col(t, "M")] - r0[col(t, "M")]) * tt,
            r0[col(t, "S")] + (r1[col(t, "S")] - r0[col(t, "S")]) * tt]


def median(t, anchor):
    l = lms(t, anchor)
    return None if l is None else l[1]


def age_for_weight(t, w):
    iM = col(t, "M")
    rows = t["rows"]
    if w < rows[0][iM] or w > rows[-1][iM]:
        return None
    for i in range(len(rows) - 1):
        a0, a1 = rows[i][0], rows[i + 1][0]
        m0, m1 = rows[i][iM], rows[i + 1][iM]
        if (w >= m0 and w <= m1) or (w <= m0 and w >= m1):
            return a0 if m1 == m0 else a0 + (w - m0) / (m1 - m0) * (a1 - a0)
    return None


# --- EFSA (corrected tables, audit F2/F3) ---
EFSA_INF_M6 = {"boys": [597, 636, 661, 688, 725, 742], "girls": [549, 573, 599, 625, 656, 673]}  # months 6..11
EFSA_CH = {
    "boys": {1: [777], 2: [1028], 3: [1174], 4: [1256, 1436, 1615], 5: [1332, 1522, 1712], 6: [1409, 1610, 1811], 7: [1497, 1711, 1925], 8: [1592, 1819, 2046], 9: [1684, 1925, 2165], 10: [1933, 2174, 2416], 11: [2043, 2298, 2554], 12: [2174, 2445, 2717], 13: [2333, 2625, 2916], 14: [2513, 2828, 3142], 15: [2699, 3036, 3374], 16: [2845, 3201, 3556], 17: [2940, 3307, 3675]},
    "girls": {1: [712], 2: [946], 3: [1096], 4: [1168, 1335, 1502], 5: [1239, 1417, 1594], 6: [1312, 1500, 1687], 7: [1392, 1591, 1790], 8: [1477, 1688, 1899], 9: [1566, 1790, 2013], 10: [1818, 2046, 2273], 11: [1908, 2146, 2385], 12: [2004, 2255, 2505], 13: [2099, 2361, 2624], 14: [2175, 2447, 2719], 15: [2228, 2507, 2786], 16: [2259, 2542, 2824], 17: [2277, 2562, 2846]},
}


def efsa(sex, m):
    if 6 <= m < 12:
        nodes = EFSA_INF_M6[sex] + [EFSA_CH[sex][1][0]]  # months 6..12
        pos = m - 6
        i = min(int(pos), len(nodes) - 2)
        frac = min(1.0, max(0.0, pos - i))
        return nodes[i] + (nodes[i + 1] - nodes[i]) * frac
    if m < 12 or m >= 216:
        return None
    y = m / 12
    lo = int(y)
    hi = min(17, lo + 1)
    a = EFSA_CH[sex].get(lo, [None])[0]
    b = EFSA_CH[sex].get(hi, [None])[0]
    if a is None:
        return None
    if b is None or hi == lo:
        return a
    return a + (b - a) * (y - lo)


# --- FAO (corrected: girls 712) ---
FAO_INF = {
    "boys": [518, 570, 596, 569, 608, 639, 653, 680, 702, 731, 752, 775],
    "girls": [464, 517, 550, 537, 571, 599, 604, 629, 652, 676, 694, 712],
}
FAO_CH = {"boys": {1: 948, 2: 1129, 3: 1252, 4: 1360}, "girls": {1: 865, 2: 1047, 3: 1156, 4: 1241}}


def fao(sex, m):
    if m < 12:
        return FAO_INF[sex][min(11, int(m))]
    if m >= 60:
        return None
    y = m / 12
    lo = int(y)
    hi = min(4, lo + 1)
    a = FAO_CH[sex][lo]
    b = FAO_CH[sex][hi]
    if hi == lo:
        return a
    return a + (b - a) * (y - lo)


def growth_addend(sex, m, win=0.5):
    """NASEM Table S-2 growth addends with a linear bridge across band boundaries (D-029)."""
    bands = [(3, 200, 50), (6, 50, 20)] if sex == "boys" else [(3, 180, 60), (6, 60, 20), (12, 20, 15)]
    g = bands[0][1]
    for at, fr, to in bands:
        if m >= at + win:
            g = to
        elif m > at - win:
            g = fr + (to - fr) * (m - (at - win)) / (2 * win)
    return g


def nasem(sex, m, h, w):
    age = m / 12
    if m < 3:
        base = (-716.45 - 1.0 * age + 17.82 * h + 15.06 * w) if sex == "boys" else (-69.15 + 80.0 * age + 2.65 * h + 54.15 * w)
        return base + growth_addend(sex, m)
    if m < 6:
        base = (-716.45 - 1.0 * age + 17.82 * h + 15.06 * w) if sex == "boys" else (-69.15 + 80.0 * age + 2.65 * h + 54.15 * w)
        return base + growth_addend(sex, m)
    if m < 36:
        if sex == "boys":
            return -716.45 - 1.0 * age + 17.82 * h + 15.06 * w + growth_addend(sex, m)
        return -69.15 + 80.0 * age + 2.65 * h + 54.15 * w + growth_addend(sex, m)
    if 36 <= m < 168:  # low-active equations + growth addend (needed for the A band up to 48 mo)
        if sex == "boys":
            g = 20 if m < 48 else 15
            return 19.12 + 3.68 * age + 8.62 * h + 20.28 * w + g
        g = 15
        return -297.54 - 22.25 * age + 12.77 * h + 14.73 * w + g
    return None


def schofield(sex, m, w, h_cm):
    H = h_cm / 100
    # Audit H1 (2026-10-07): the form is selected by BODY SIZE (weight-age), not the birthday —
    # mirrors the JS (methods.ts resolves the fallback; energy.ts consumes it).
    wa = age_for_weight(WHO[f"wfa_{sex}"], w)
    if wa is None:
        m36 = median(WHO[f"wfa_{sex}"], 36)
        if m36 is not None:
            wa = 36 if w >= m36 else 0
    use_wh = (m >= 36) if wa is None else (wa >= 36)
    if not use_wh:
        # Schofield weight-only (W) forms (ESPGHAN/ESPEN PN energy guideline; flat-chart fix 2026-10-03)
        return (59.48 * w - 30.33) if sex == "boys" else (58.29 * w - 31.05)
    if m < 120:
        return (19.6 * w + 130.3 * H + 414.9) if sex == "boys" else (16.97 * w + 161.8 * H + 371.2)
    return (16.25 * w + 137.2 * H + 515.5) if sex == "boys" else (8.365 * w + 465.0 * H + 200.0)


def holliday(w):
    return w * 100 if w <= 10 else (1000 + (w - 10) * 50 if w <= 20 else 1500 + (w - 20) * 20)


def whs_mean_at(table, sex, m):
    m = min(m, 48)
    keys = sorted(k for k in table if k[0] == sex)
    if not keys:
        return None
    ms = [k[1] for k in keys]
    if m < ms[0] or m > ms[-1]:
        return None
    for i in range(len(keys) - 1):
        (s0, a0), (s1, a1) = keys[i], keys[i + 1]
        if a0 <= m <= a1:
            v0, v1 = table[keys[i]], table[keys[i + 1]]
            return None if a1 == a0 else v0 + (v1 - v0) * (m - a0) / (a1 - a0)
    return None


def central_healthy(sex, m, primary, n):
    """Primary-source handover blend at 6 months (mirrors the JS centralHealthy; D-029)."""
    W = 0.5
    if n is not None and 6 - W < m < 6 + W:
        e_at = primary if primary is not None else efsa(sex, 6)
        if e_at is not None:
            t = (m - (6 - W)) / (2 * W)
            return (1 - t) * n + t * e_at
    return primary if primary is not None else n


def healthy(sex, m):
    """A-type band (primary=EFSA/PZH, NASEM, FAO) with full low/high edges."""
    h = median(WHO[f"lhfa_{sex}"], m)
    w = median(WHO[f"wfa_{sex}"], m)
    if h is None or w is None:
        return None, None, None
    primary = efsa(sex, m)
    vals = [v for v in (primary, nasem(sex, m, h, w), fao(sex, m)) if v is not None]
    if not vals:
        return None, None, None
    # EFSA month-6 anchor in the lower half of the handover window (keeps low <= central <= high)
    if primary is None and m > 6 - 0.5 and m < 6:
        e6 = efsa(sex, 6)
        if e6 is not None:
            vals.append(e6)
    central = central_healthy(sex, m, primary, nasem(sex, m, h, w))
    return min(vals), central, max(vals)


def rec(sex, row):
    m, w = row["age"], row["w"]
    # C: default length = WHS mean length for age (audit F1), WHO median fallback
    h_c = whs_mean_at(whs_mean_l, sex, m)
    if h_c is None:
        h_c = median(WHO[f"lhfa_{sex}"], m)
    bmr = schofield(sex, m, w, h_c)
    clo = bmr * 0.9 * 1.2
    c = bmr * 0.9 * 1.2
    chi = bmr * 1.1 * 1.2
    tgt = whs_mean_at(whs_mean_w, sex, m + 12 * 7 / 30.4375)
    gain = None if tgt is None else (tgt - w) / (12 * 7) * 1000
    if gain is not None and gain > 0:
        dlo, d, dhi = clo + gain * 4.1, c + gain * 5, chi + gain * 6
    else:
        dlo, d, dhi = clo, c, chi
    wa = age_for_weight(WHO[f"wfa_{sex}"], w)
    if wa is None:
        b = None
    else:
        _, b, _ = healthy(sex, wa)
    alo, a, ahi = healthy(sex, m)
    return {"A": a, "Alo": alo, "Ahi": ahi, "B": b, "C": c, "Clo": clo, "Chi": chi,
            "D": d, "Dlo": dlo, "Dhi": dhi, "fluid": holliday(w)}


import hashlib
grid_bytes = (ROOT / "src" / "data" / "grid.json").read_bytes()
grid_sha = hashlib.sha256(grid_bytes).hexdigest()

rows = GRID["rows"]
FIELDS = ["A", "Alo", "Ahi", "B", "C", "Clo", "Chi", "D", "Dlo", "Dhi", "fluid"]
mismatch = 0
worst = 0.0
worst_line = ""
n_cmp = 0
null_pairs = {f: 0 for f in FIELDS}
null_mismatch = 0
bad_lines = []
for row in rows:
    r = rec(row["sex"], row)
    for field in FIELDS:
        g = row[field]
        rr = r[field]
        if g is None and rr is None:
            null_pairs[field] += 1
            continue
        if g is None or rr is None:
            mismatch += 1
            null_mismatch += 1
            if len(bad_lines) < 50:
                bad_lines.append(f"| NULL-MISMATCH | {row['sex']} | {row['age']} | {row['w']} | {field} | grid={g} rec={rr} |")
            continue
        n_cmp += 1
        if not (isinstance(g, (int, float)) and isinstance(rr, (int, float)) and math.isfinite(g) and math.isfinite(rr)):
            mismatch += 1
            if len(bad_lines) < 50:
                bad_lines.append(f"| NON-FINITE | {row['sex']} | {row['age']} | {row['w']} | {field} | grid={g} rec={rr} |")
            continue
        rel = abs(g - rr) / max(abs(g), 1e-9)
        if rel > worst:
            worst = rel
            worst_line = f"{row['sex']} {row['age']}mo {row['w']}kg {field}: grid={g:.4f} rec={rr:.4f}"
        if rel > 0.005:
            mismatch += 1
            if len(bad_lines) < 50:
                bad_lines.append(f"| FAIL | {row['sex']} | {row['age']} | {row['w']} | {field} | grid={g:.4f} rec={rr:.4f} | {rel*100:.4f}% |")

expected_min = len(rows) * 10  # B may legitimately be null for some rows; everything else always present
count_ok = n_cmp >= expected_min and len(rows) >= 7000
accept = mismatch == 0 and worst <= 0.005 and count_ok

lines = ["# Cross-check report (independent Python recomputation, full-grid sweep)", "",
         f"grid.json sha256: {grid_sha}",
         f"Grid rows: {len(rows)} (0-48 mo; both sexes; weights 2-20 kg, step 0.25)",
         f"Fields compared per row: {', '.join(FIELDS)} (11 fields)",
         f"Values compared: {n_cmp} (expected >= {expected_min}; B is null by design where the weight is outside the WHO weight-for-age range: {null_pairs['B']} rows)",
         f"Null-pair (grid=NULL, recomputed=NULL) counts: {json.dumps(null_pairs)}",
         f"Null mismatches (one side null, other not): {null_mismatch}",
         f"Worst relative difference: {worst*100:.6f}% ({worst_line})",
         f"Acceptance (0 failures > 0.5%, 0 null mismatches, count >= expected): {'PASS' if accept else 'FAIL'}", "",
         "Note: constants are duplicated from the same published sources by design (two independent implementations);",
         "the grid hash above pins exactly which artifact this report validated.", ""]
if bad_lines:
    lines += ["## Failures", "", "| kind | sex | age | w | field | detail |", "|---|---|---|---|---|---|"] + bad_lines
(ROOT / "research" / "qa").mkdir(exist_ok=True)
(ROOT / "research" / "qa" / "crosscheck-report.md").write_text("\n".join(lines))
print("\n".join(lines[2:9]))
print("wrote research/qa/crosscheck-report.md")
