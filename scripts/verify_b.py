#!/usr/bin/env python3
"""B-line verification (user report 2026-10-05: "Energia vs masa ciała (w wieku 18 mies.) — żółta linia
do weryfikacji"). Recomputes the B line ("healthy child of the same weight": EER at weight-age) from the
raw published constants, compares the pre-fix (published steps) and post-fix (bridged boundaries) shapes,
and writes research/qa/b-line-verification.md.

Run: .venv/bin/python scripts/verify_b.py
"""
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "research" / "data"
WHO = {k: json.loads((DATA / "who_lms" / f"{k}.json").read_text()) for k in
       ["wfa_boys", "wfa_girls", "lhfa_boys", "lhfa_girls"]}


def col(t, name):
    return [c.strip() for c in t["columns"]].index(name)


def lms(t, a):
    rows = t["rows"]
    if a < rows[0][0] or a > rows[-1][0]:
        return None
    lo, hi = 0, len(rows) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if rows[mid][0] <= a:
            lo = mid
        else:
            hi = mid
    r0, r1 = rows[lo], rows[hi]
    x0, x1 = r0[0], r1[0]
    tt = 0 if x1 == x0 else (a - x0) / (x1 - x0)
    return [r0[col(t, "L")] + (r1[col(t, "L")] - r0[col(t, "L")]) * tt,
            r0[col(t, "M")] + (r1[col(t, "M")] - r0[col(t, "M")]) * tt,
            r0[col(t, "S")] + (r1[col(t, "S")] - r0[col(t, "S")]) * tt]


def med(t, a):
    l = lms(t, a)
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


EFSA_M6 = {"boys": [597, 636, 661, 688, 725, 742], "girls": [549, 573, 599, 625, 656, 673]}
EFSA_Y1 = {"boys": 777, "girls": 712}
EFSA_CH = {"boys": {1: 777, 2: 1028, 3: 1174, 4: 1256, 5: 1332},
           "girls": {1: 712, 2: 946, 3: 1096, 4: 1168, 5: 1239}}


def efsa(sex, m):
    if 6 <= m < 12:
        nodes = EFSA_M6[sex] + [EFSA_Y1[sex]]
        pos = m - 6
        i = min(int(pos), len(nodes) - 2)
        frac = min(1.0, max(0.0, pos - i))
        return nodes[i] + (nodes[i + 1] - nodes[i]) * frac
    if m < 12 or m >= 216:
        return None
    y = m / 12
    lo = int(y)
    hi = min(17, lo + 1)
    a = EFSA_CH[sex].get(lo)
    b = EFSA_CH[sex].get(hi)
    if a is None:
        return None
    if b is None or hi == lo:
        return a
    return a + (b - a) * (y - lo)


FAO_I = {"boys": [518, 570, 596, 569, 608, 639, 653, 680, 702, 731, 752, 775],
         "girls": [464, 517, 550, 537, 571, 599, 604, 629, 652, 676, 694, 712]}


def fao(sex, m):
    if m < 12:
        return FAO_I[sex][min(11, int(m))]
    return None


def growth_raw(sex, m):
    """Pre-fix: the exact published NASEM Table S-2 growth addends (hard steps)."""
    if sex == "boys":
        return 200 if m < 3 else (50 if m < 6 else 20)
    return 180 if m < 3 else (60 if m < 6 else (20 if m < 12 else 15))


def growth_bridged(sex, m, win=0.5):
    bands = [(3, 200, 50), (6, 50, 20)] if sex == "boys" else [(3, 180, 60), (6, 60, 20), (12, 20, 15)]
    g = bands[0][1]
    for at, fr, to in bands:
        if m >= at + win:
            g = to
        elif m > at - win:
            g = fr + (to - fr) * (m - (at - win)) / (2 * win)
    return g


def nasem(sex, m, h, w, bridged):
    base = (-716.45 - 1.0 * (m / 12) + 17.82 * h + 15.06 * w) if sex == "boys" \
        else (-69.15 + 80.0 * (m / 12) + 2.65 * h + 54.15 * w)
    return base + (growth_bridged(sex, m) if bridged else growth_raw(sex, m))


def b_curve(sex, bridged):
    out = []
    for i in range(16, 81):  # 4 .. 20 kg step 0.25
        w = i / 4.0
        wa = age_for_weight(WHO[f"wfa_{sex}"], w)
        if wa is None:
            continue
        h = med(WHO[f"lhfa_{sex}"], wa)
        wm = med(WHO[f"wfa_{sex}"], wa)
        n = nasem(sex, wa, h, wm, bridged)
        e = efsa(sex, wa)
        if e is not None and not bridged:
            c = e
        elif e is not None and bridged and 5.5 < wa < 6.5:
            t = (wa - 5.5) / 1.0
            c = (1 - t) * n + t * e
        else:
            c = e if e is not None else n
        out.append((w, wa, c))
    return out


def metrics(curve):
    worst_rel = 0.0
    worst_where = ""
    worst_drop = 0.0
    drop_where = ""
    for i in range(1, len(curve)):
        d = curve[i - 1][2] - curve[i][2]
        rel = abs(curve[i][2] - curve[i - 1][2]) / curve[i - 1][2]
        if rel > worst_rel:
            worst_rel, worst_where = rel, f"{curve[i-1][0]}->{curve[i][0]} kg"
        if d > worst_drop:
            worst_drop, drop_where = d, f"{curve[i-1][0]}->{curve[i][0]} kg"
    return worst_rel, worst_where, worst_drop, drop_where


lines = []
lines.append("# B-line verification — „Energia vs masa ciała (w wieku 18 mies.)”, yellow line (2026-10-05)")
lines.append("")
lines.append("User report: the yellow line (series **B — healthy child of the same weight**) needs verification.")
lines.append("B is defined as the EER of a healthy child at the **weight-age** (the age at which the WHO median")
lines.append("weight-for-age equals the entered weight), using EFSA/PZH (primary from month 6), NASEM 2023 (primary")
lines.append("below month 6) and FAO/WHO/UNU 2004 (band edges); see `content/base.json` (method p1) and")
lines.append("`src/calc/energy.ts` / `src/calc/methods.ts`.")
lines.append("")
lines.append("## Sources re-read for this check (research/raw/)")
lines.append("")
lines.append("- NASEM 2023 DRI for Energy, Table S-2 + footnotes (raw: `nasem_eer_equations.txt`, `nasem_ch2.html`):")
lines.append("  boys 0–2.99 mo `... + 200`, 3–5.99 mo `... + 50`, 6 mo–2.99 y `... + 20`; girls `+ 180 / + 60 / + 20/15`;")
lines.append("  footnote: „Age is in years, weight is in kilograms, and height is in centimeters.”")
lines.append("- EFSA 2013 AR for energy (raw: `efsa_ar_summaries.txt`): infants months 7–11 = 636/661/688/725/742 (boys),")
lines.append("  573/599/625/656/673 (girls); month 6 = PZH 2024 (597/549); children year 1 = 777/712 (PAL 1.4 column).")
lines.append("- FAO/WHO/UNU 2004, Table 3.2 (raw: `fao_y5686e05.htm`): boys 0–1..11–12 mo =")
lines.append("  518/570/596/569/608/639/653/680/702/731/752/775 kcal/d (the 596→569 dip at 3–4 mo is in the table itself).")
lines.append("")
lines.append("## Finding")
lines.append("")
lines.append("Every constant is transcribed correctly (hand-checked against the fetched files above; also pinned by")
lines.append("`scripts/crosscheck.py`). But through the weight→age mapping the published **category steps become visible")
lines.append("cliffs on the B line**, exactly in the weight range where WHS children live:")
lines.append("")
lines.append("| sex | largest adjacent drop (pre-fix) | where | cause |")
lines.append("|---|---|---|---|")
bo_old = metrics(b_curve("boys", False))
gi_old = metrics(b_curve("girls", False))
lines.append(f"| boys | {bo_old[2]:.1f} kcal ({bo_old[0]*100:.1f}%) | {bo_old[3]} | NASEM growth addend 200→50 at 3.0 mo weight-age |")
lines.append(f"| girls | {gi_old[2]:.1f} kcal ({gi_old[0]*100:.1f}%) | {gi_old[3]} | NASEM growth addend 180→60 at 3.0 mo weight-age |")
lines.append("")
lines.append("(Also from the same class: NASEM 50→20 at 6 mo; the NASEM→EFSA primary switch at month 6; the EFSA")
lines.append("month-12 anchor; girls' footnote-a 20→15 at 12 mo. All are published-table granularity, faithfully reproduced.)")
lines.append("")
lines.append("## Fix (DECISIONS D-029)")
lines.append("")
lines.append("The growth addend is interpolated linearly across a ±0.5-month window around each NASEM boundary")
lines.append("(3 / 6 / 12 mo) and the NASEM→EFSA handover is blended across ±0.5 months around month 6.")
lines.append("**Band interiors keep the exact published values** (verified below); only the crossings are smoothed.")
lines.append("")
bo_new = metrics(b_curve("boys", True))
gi_new = metrics(b_curve("girls", True))
lines.append("| sex | largest adjacent step (post-fix) | largest drop (post-fix) |")
lines.append("|---|---|---|")
lines.append(f"| boys | {bo_new[0]*100:.2f}% ({bo_new[1]}) | {bo_new[2]:.1f} kcal ({bo_new[3]}) |")
lines.append(f"| girls | {gi_new[0]*100:.2f}% ({gi_new[1]}) | {gi_new[2]:.1f} kcal ({gi_new[3]}) |")
lines.append("")
lines.append("Residual behaviour is continuous: a gentle dip around 3–4 months of weight-age (present in the source")
lines.append("tables themselves — FAO 596→569 at 3–4 mo) and a steeper (continuous) rise at the EFSA month-12 anchor.")
lines.append("")
lines.append("## Spot checks (post-fix grid vs hand-computed published value)")
lines.append("")
grid = json.loads((ROOT / "src" / "data" / "grid.json").read_text())


def grid_b(sex, age, w):
    for r in grid["rows"]:
        if r["sex"] == sex and r["age"] == age and abs(r["w"] - w) < 1e-9:
            return r["B"]
    return None


def hand_nasem(sex, wa, h, w):
    base = (-716.45 - 1.0 * (wa / 12) + 17.82 * h + 15.06 * w) if sex == "boys" \
        else (-69.15 + 80.0 * (wa / 12) + 2.65 * h + 54.15 * w)
    return base + growth_bridged(sex, wa)


checks = []
for sex, w, expect_band in [("boys", 4.0, "0-2.99 mo (addend 200)"), ("girls", 4.5, "0-2.99 mo (addend 180)")]:
    wa = age_for_weight(WHO[f"wfa_{sex}"], w)
    h = med(WHO[f"lhfa_{sex}"], wa)
    wm = med(WHO[f"wfa_{sex}"], wa)
    hand = hand_nasem(sex, wa, h, wm)
    got = grid_b(sex, 18, w)
    checks.append((sex, w, wa, expect_band, hand, got))
lines.append("| sex | weight | weight-age | published form | hand | grid | Δ |")
lines.append("|---|---|---|---|---|---|---|")
ok = True
for sex, w, wa, band, hand, got in checks:
    delta = abs(hand - got)
    ok = ok and delta < 0.01
    lines.append(f"| {sex} | {w} kg | {wa:.2f} mo | {band} | {hand:.2f} | {got:.2f} | {delta:.4f} |")
# EFSA-side checkpoint (pure EFSA interpolation, year 1->2 for boys at ~13.5 mo weight-age)
wa = age_for_weight(WHO["wfa_boys"], 10.0)
e = efsa("boys", wa)
got = grid_b("boys", 18, 10.0)
delta = abs(e - got)
ok = ok and delta < 0.01
lines.append(f"| boys | 10 kg | {wa:.2f} mo | EFSA year 1→2 interp (PAL 1.4) | {e:.2f} | {got:.2f} | {delta:.4f} |")
lines.append("")
lines.append(f"Checkpoint acceptance (all Δ < 0.01 kcal): **{'PASS' if ok else 'FAIL'}**")
lines.append("")
lines.append("## Evidence")
lines.append("")
lines.append("- `src/calc/methods.test.ts` — „A/B line continuity (user report 2026-10-05; DECISIONS D-029)” (max relative")
lines.append("  adjacent step < 6% across 3.5–18 kg for both sexes; old cliff bound; published-value checkpoint).")
lines.append("- `scripts/crosscheck.py` — full-grid independent recomputation (0.000000% worst difference; grid sha256 in")
lines.append(f"  `research/qa/crosscheck-report.md`, pin {__import__('hashlib').sha256((ROOT / 'src' / 'data' / 'grid.json').read_bytes()).hexdigest()[:16]}…).")
lines.append("- `npm run build` + browser check of chart 1 (see DECISIONS D-029).")
lines.append("")

out = ROOT / "research" / "qa" / "b-line-verification.md"
out.write_text("\n".join(lines))
print(f"wrote {out.relative_to(ROOT)}")
print(f"old max drop: boys {bo_old[2]:.1f} ({bo_old[3]}), girls {gi_old[2]:.1f} ({gi_old[3]})")
print(f"new max rel step: boys {bo_new[0]*100:.2f}% {bo_new[1]}, girls {gi_new[0]*100:.2f}% {gi_new[1]}")
print(f"new max drop: boys {bo_new[2]:.1f}, girls {gi_new[2]:.1f}")
print(f"checkpoints: {'PASS' if ok else 'FAIL'}")
