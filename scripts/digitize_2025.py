#!/usr/bin/env python3
"""Digitize the 2025 WHS growth curves (Calhoun et al., AJMG A 197:e64075).

Stages:
  axes <fig>   — detect axis lines + tick positions, print calibration diagnostics
  curves <fig> — classify color families, track curves per column, save overlay QC + CSV

Coordinate approach: weight values are linear in pixel y (ticks), ages linear in pixel x.
Curves do not cross (percentile curves), so per-column run centers are assigned to
tracks by order, with continuity matching.
"""
import sys, json, math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

FIGDIR = Path(__file__).resolve().parent.parent / "research" / "raw" / "figs"
OUTDIR = Path(__file__).resolve().parent.parent / "research" / "data" / "whs_growth"

# ---------- color families ----------
def classify(r, g, b):
    # returns family name or None; tuned to the census clusters:
    # blue(4p- quartiles) #1800f0/#3018f0/#4830f0 ; purple(CDC) #9018d8 ;
    # lightblue(2.5/97.5) #a8d8d8 ; green(5/95) #48f000 ; red(10/90) #f00018
    if r > 190 and g < 100 and b < 130 and (r - g) > 120:
        return "red"
    if g > 170 and r < 190 and b < 140 and (g - b) > 90:
        return "green"
    if 110 <= r <= 215 and g > 160 and b > 160 and (g - r) > 18 and (b - r) > 18:
        return "lightblue"
    if r < 115 and b > 180 and (b - g) > 80 and (b - r) > 70:
        # separate blue from purple: purple has r>=115
        return "blue"
    if 115 <= r <= 195 and g < 110 and b > 170 and (r - g) > 50 and (b - g) > 100:
        return "purple"
    return None


def load(figname):
    return Image.open(FIGDIR / figname).convert("RGB")


def panel_columns(img):
    """Split a two-panel figure at the whitest column in the middle third."""
    a = np.asarray(img).astype(int)
    nonwhite = (a.sum(axis=2) < 720)
    colsum = nonwhite.sum(axis=0)
    w = img.size[0]
    lo, hi = int(w * 0.30), int(w * 0.70)
    gap = min(range(lo, hi), key=lambda x: colsum[x])
    return gap


def find_axes(sub):
    """Return (x0, y0, x1, y1) of plot area: axis lines + gridline extent."""
    a = np.asarray(sub).astype(int)
    s = a.sum(axis=2)
    h, w = s.shape
    # y-axis: leftmost column with long dark run (dark = sum < 350)
    dark = s < 350
    colcount = dark.sum(axis=0)
    x0 = None
    for x in range(int(w * 0.45)):
        if colcount[x] > h * 0.5:
            x0 = x
            break
    # x-axis: bottom row with long dark run
    y0 = None
    rowcount = dark.sum(axis=1)
    for y in range(h - 1, int(h * 0.55), -1):
        if rowcount[y] > w * 0.4:
            y0 = y
            break
    # gridlines: light gray dotted, sum in (500..700); find extent right/top
    grid = ((s > 470) & (s < 705) & (np.abs(a[:, :, 0] - a[:, :, 2]) < 30))
    gcol = grid.sum(axis=0)
    grow = grid.sum(axis=1)
    x1 = w - 1
    for x in range(w - 1, x0, -1):
        if gcol[x] > grow.max() * 0.20:
            x1 = x
            break
    y1 = 0
    for y in range(0, y0):
        if grow[y] > gcol.max() * 0.20:
            y1 = y
            break
    print(f"  axes: x0={x0} y0={y0} x1={x1} y1={y1} (plot {x1-x0}x{y0-y1})")
    return x0, y0, x1, y1


def find_ticks(sub, x0, y0, x1, y1):
    a = np.asarray(sub).astype(int)
    s = a.sum(axis=2)
    dark = s < 350
    h, w = s.shape
    # x ticks: dark below y0 in band y0+3 .. y0+12
    band = dark[y0 + 3:min(y0 + 14, h), :]
    colcount = band.sum(axis=0)
    xs = []
    x = x0
    while x <= x1:
        if colcount[x] >= 2:
            # merge consecutive
            run = [x]
            while x + 1 <= x1 and colcount[x + 1] >= 2:
                x += 1
                run.append(x)
            xs.append(sum(run) / len(run))
        x += 1
    # y ticks: dark left of x0, band x0-15 .. x0-2 (looser threshold — some ticks are faint)
    darky = s < 420
    band2 = darky[:, max(0, x0 - 15):max(1, x0 - 2)]
    rowcount = band2.sum(axis=1)
    ys = []
    y = y1
    while y <= y0:
        if rowcount[y] >= 2:
            run = [y]
            while y + 1 <= y0 and rowcount[y + 1] >= 2:
                y += 1
                run.append(y)
            ys.append(sum(run) / len(run))
        y += 1
    print(f"  x-tick px: {[round(v,1) for v in xs]}")
    print(f"  y-tick px: {[round(v,1) for v in ys]}")
    return xs, ys


def calibrate(pxlist, expected_values, name):
    """Least-squares linear map pixel->value; report residuals & match count."""
    if len(pxlist) != len(expected_values):
        print(f"  !! {name}: {len(pxlist)} tick marks vs {len(expected_values)} expected values")
        # allow subset match: try drop extras (e.g. axis end ticks)
        if len(pxlist) > len(expected_values):
            # keep evenly spaced subset? just report
            pass
    xs = np.array(pxlist)
    vs = np.array(expected_values)
    A = np.vstack([xs, np.ones_like(xs)]).T
    coef, res, *_ = np.linalg.lstsq(A, vs, rcond=None)
    pred = A @ coef
    err = np.abs(pred - vs)
    print(f"  {name}: value = {coef[0]:.6f}*px + {coef[1]:.3f}  max_err={err.max():.3f} (mean {err.mean():.3f})")
    return coef


def panel_spec(fig):
    """Return list of (name, subimage, x_vals, y_vals) for the figure."""
    img = load(fig)
    gap = panel_columns(img)
    w, h = img.size
    panels = [
        ("left", img.crop((0, 0, gap - 5, h))),
        ("right", img.crop((gap + 5, 0, w, h))),
    ]
    if fig.startswith("growth2025_fig3"):
        panels = [("ofc", img)]
    return img, panels


def axes_stage(fig, xw, yw):
    img, panels = panel_spec(fig)
    out = {}
    for name, sub in panels:
        print(f"[{fig} :: {name}] size={sub.size}")
        x0, y0, x1, y1 = find_axes(sub)
        xs, ys = find_ticks(sub, x0, y0, x1, y1)
        out[name] = dict(x0=x0, y0=y0, x1=x1, y1=y1, xticks=xs, yticks=ys,
                         xvals=xw, yvals=yw)
    return out


def detect_legend(sub, x0, y0, x1, y1):
    """Find the legend box (white rect, dark border) inside the plot area.
    Returns (lx, ty, rx, by) or None."""
    a = np.asarray(sub).astype(int)
    s = a.sum(axis=2)
    dark = s < 430
    half = int(y1 + (y0 - y1) * 0.5)
    cand = []
    for y in range(y1 + 6, half):
        row = dark[y, x0 + 8:x1]
        # longest contiguous run (gap<=4)
        best = cur = 0
        start = None; bstart = None
        for i, v in enumerate(row):
            if v:
                cur += 1
                if start is None: start = i
                if cur > best: best, bstart = cur, start
            else:
                cur = 0; start = None
        if 90 <= best <= 600:
            cand.append((y, x0 + 8 + bstart, best))
    # pair top/bottom: consecutive candidates with similar start & length
    for i in range(len(cand)):
        yt, st, lt = cand[i]
        for j in range(i + 1, len(cand)):
            yb, sb, lb = cand[j]
            if 60 <= yb - yt <= 420 and abs(st - sb) <= 50 and abs(lt - lb) <= 60:
                # verticals between yt..yb
                cols = []
                for x in range(max(x0 + 5, st - 40), min(x1, st + lt + 40)):
                    if dark[yt:yb, x].sum() > (yb - yt) * 0.5:
                        cols.append(x)
                if len(cols) >= 2:
                    return (min(cols), yt, max(cols), yb)
                return (st, yt, st + lt, yb)
    return None


def classify_masks(a):
    R = a[:, :, 0]; G = a[:, :, 1]; B = a[:, :, 2]
    fam = {}
    fam["red"] = (R > 190) & (G < 100) & (B < 130) & ((R - G) > 120)
    fam["green"] = (G > 170) & (R < 190) & (B < 140) & ((G - B) > 90)
    fam["lightblue"] = (R >= 110) & (R <= 215) & (G > 160) & (B > 160) & ((G - R) > 18) & ((B - R) > 18)
    fam["blue"] = (R < 115) & (B > 180) & ((B - G) > 80) & ((B - R) > 70)
    fam["purple"] = (R >= 115) & (R <= 195) & (G < 110) & (B > 170) & ((R - G) > 50) & ((B - G) > 100)
    return fam


def col_centers(mask, x, ylo, yhi, gap=2):
    ys = np.where(mask[ylo:yhi, x])[0] + ylo
    if len(ys) == 0:
        return []
    clusters = [[int(ys[0])]]
    for y in ys[1:]:
        if y - clusters[-1][-1] <= gap:
            clusters[-1].append(int(y))
        else:
            clusters.append([int(y)])
    return [(sum(c) / len(c), len(c)) for c in clusters]


FAMILY_PCT = {
    "blue": ["p75", "p50", "p25"],
    "red": ["p90", "p10"],
    "green": ["p95", "p5"],
    "lightblue": ["p97.5", "p2.5"],
}


def track_family(mask, x0, x1, y1, y0, expected, max_missing=70):
    tracks = []
    for x in range(x0 + 2, x1 - 1):
        cl = col_centers(mask, x, y1 + 2, y0 - 1)
        centers = [c for c, _s in cl]
        if not tracks:
            if len(centers) == expected:
                tracks = [dict(y=c, slope=0.0, last_x=x, pts=[(x, c)], missing=0) for c in sorted(centers)]
            continue
        # split wide clusters when short
        if len(centers) < expected:
            cs = list(cl)
            for i in range(len(cs)):
                if len(cs) >= expected:
                    break
                c, s = cs[i]
                if s >= 8:
                    cs[i] = (c - s / 4, s / 2)
                    cs.insert(i + 1, (c + s / 4, s / 2))
            centers = [c for c, _s in cs]
        preds = [t["y"] + t["slope"] * (x - t["last_x"]) for t in tracks]
        used_c = set()
        used_t = set()
        pairs = []
        for ti in range(len(tracks)):
            best = None
            for ci in range(len(centers)):
                if ci in used_c:
                    continue
                d = abs(centers[ci] - preds[ti])
                if d <= 10 and (best is None or d < best[1]):
                    best = (ci, d)
            if best:
                ci, _ = best
                used_c.add(ci); used_t.add(ti)
                pairs.append((ti, ci))
        for ti, ci in pairs:
            t = tracks[ti]
            dy = centers[ci] - t["y"]
            dx = max(1, x - t["last_x"])
            t["slope"] = max(-6.0, min(6.0, 0.75 * t["slope"] + 0.25 * dy / dx))
            t["y"] = centers[ci]
            t["last_x"] = x
            t["missing"] = 0
            t["pts"].append((x, centers[ci]))
        for ti, t in enumerate(tracks):
            if ti not in used_t:
                t["missing"] += 1
    keep = [t for t in tracks if len(t["pts"]) >= 120 and t["missing"] <= max_missing]
    keep.sort(key=lambda t: np.mean([p[1] for p in t["pts"]]))
    return keep


def curves_stage(fig):
    img, panels = panel_spec(fig)
    a = np.asarray(img).astype(int)
    for name, sub in panels:
        print(f"[{fig} :: {name}] size={sub.size}")
        x0, y0, x1, y1 = find_axes(sub)
        xs, ys = find_ticks(sub, x0, y0, x1, y1)
        if fig.startswith("growth2025_fig1"):
            xvals = [0, 5, 10, 15, 20] if name == "left" else [5, 10, 15]
            yvals = [14, 12, 10, 8, 6, 4, 2] if name == "left" else [60, 40, 20, 0]
        elif fig.startswith("growth2025_fig2"):
            xvals = [0, 5, 10, 15, 20] if name == "left" else [5, 10, 15]
            yvals = [90, 80, 70, 60, 50, 40] if name == "left" else [180, 160, 140, 120, 100, 80, 60, 40]
        else:
            xvals = [0, 5, 10, 15, 20]
            yvals = [50, 45, 40, 35, 30]
        xa, xb = calibrate(xs, xvals, f"{name} x")[:2]
        ya, yb = calibrate(ys, yvals, f"{name} y")[:2]
        legend = detect_legend(sub, x0, y0, x1, y1)
        print(f"  legend bbox: {legend}")
        sa = np.asarray(sub).astype(int)
        fam = classify_masks(sa)
        if legend:
            lx, ty, rx, by = legend
            for k in fam:
                fam[k][ty - 2:by + 3, lx - 2:rx + 3] = False
        measure = "weight" if fig.startswith("growth2025_fig1") else ("length" if fig.startswith("growth2025_fig2") else "ofc")
        unit = "kg" if measure == "weight" else "cm"
        month_panel = (name in ("left", "ofc"))
        if month_panel:
            ages = list(np.arange(0, 24.01, 1.0))
            age_unit = "months"
        else:
            ages = list(np.arange(2, 18.01, 0.5))
            age_unit = "years"
        rows = []
        draw = ImageDraw.Draw(sub)
        for fname, expected in [("blue", 3), ("red", 2), ("green", 2), ("lightblue", 2)]:
            tracks = track_family(fam[fname], x0, x1, y1, y0, expected)
            print(f"  family {fname}: {len(tracks)} tracks of expected {expected}")
            pcts = FAMILY_PCT[fname]
            for pct, t in zip(pcts, tracks):
                pts = sorted(t["pts"])
                xs_ = [p[0] for p in pts]
                ys_ = [p[1] for p in pts]
                draw.line([(px_, py_) for px_, py_ in pts], fill=(0, 0, 0), width=2)
                vals = {}
                for age in ages:
                    col = (age - xb) / xa
                    if xs_[0] - 3 <= col <= xs_[-1] + 3:
                        colc = min(max(col, xs_[0]), xs_[-1])
                        ypx = float(np.interp(colc, xs_, ys_))
                        vals[age] = round(ya * ypx + yb, 2)
                for age, v in vals.items():
                    rows.append(dict(measure=measure, panel=name, percentile=pct, age=age, age_unit=age_unit, value=v, unit=unit, sex="combined"))
        if legend:
            lx, ty, rx, by = legend
            draw.rectangle([lx, ty, rx, by], outline=(255, 140, 0), width=3)
        sub.save(f"/tmp/qc2025_{fig.replace('.jpg','')}_{name}.png")
        Path(f"/tmp/d2025_{fig}_{name}.json").write_text(json.dumps(rows))
        # ---- quick numeric QC: percentile ordering at reference ages ----
        order = ["p97.5", "p95", "p90", "p75", "p50", "p25", "p10", "p5", "p2.5"]
        tol = {"weight": 0.45, "length": 2.5, "ofc": 1.5}[measure] if month_panel else {"weight": 1.2, "length": 4.0, "ofc": 1.5}[measure]
        check_ages = [6, 12, 18, 24] if month_panel else [5, 10, 15, 18]
        print(f"  QC {measure} {name}: sampled values per percentile")
        for age in check_ages:
            vals = [(p, next((r["value"] for r in rows if r["percentile"] == p and r["age"] == age), None)) for p in order]
            s = " ".join(f"{p}={v}" for p, v in vals if v is not None)
            seq = [v for _, v in vals if v is not None]
            viol = 0
            for i in range(len(seq) - 1):
                if seq[i] < seq[i + 1] - tol:
                    viol += 1
            print(f"    age {age} ({age_unit}): {s} {'<-- ORDER VIOLATIONS: ' + str(viol) if viol else 'ok'}")



def verify_stage(fig):
    """Pixel-level audit: every track point must sit on its family colour."""
    img, panels = panel_spec(fig)
    report = []
    for name, sub in panels:
        x0, y0, x1, y1 = find_axes(sub)
        legend = detect_legend(sub, x0, y0, x1, y1)
        sa = np.asarray(sub).astype(int)
        fm = classify_masks(sa)
        famw = {k: v.copy() for k, v in fm.items()}
        if legend:
            lx, ty, rx, by = legend
            for k in famw:
                famw[k][ty - 2:by + 3, lx - 2:rx + 3] = False
        report.append(f"== {fig} {name} (legend {legend}) ==")
        for fname, expected in [("blue", 3), ("red", 2), ("green", 2), ("lightblue", 2)]:
            tracks = track_family(famw[fname], x0, x1, y1, y0, expected)
            for pct, t in zip(FAMILY_PCT[fname], tracks):
                on_fam = on_pur = off = 0
                for (px_, py_) in t["pts"]:
                    if legend:
                        lx, ty, rx, by = legend
                        if lx - 3 <= px_ <= rx + 3 and ty - 3 <= py_ <= by + 3:
                            continue
                    ylo, yhi = max(0, int(py_) - 3), int(py_) + 4
                    if fm[fname][ylo:yhi, px_].any():
                        on_fam += 1
                    elif fm["purple"][ylo:yhi, px_].any():
                        on_pur += 1
                    else:
                        off += 1
                tot = on_fam + on_pur + off
                if tot:
                    line = f"  {fname} {pct}: n={tot} on_family={on_fam/tot:.3f} on_purple={on_pur/tot:.3f} off={off/tot:.3f}"
                    print(line)
                    report.append(line)
    out = Path("/opt/data/whs-growth-explorer/research/qa") / f"digitize2025_verify_{fig.replace('.jpg','')}.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(report) + "\n")
    print("wrote", out)


def assemble_stage():
    rows = []
    for fig in ["growth2025_fig1_wb.jpg", "growth2025_fig2_wb.jpg", "growth2025_fig3_wb.jpg"]:
        for name in (["left", "right"] if not fig.startswith("growth2025_fig3") else ["ofc"]):
            p = Path(f"/tmp/d2025_{fig}_{name}.json")
            if p.exists():
                rows.extend(json.loads(p.read_text()))
    out = Path("/opt/data/whs-growth-explorer/research/data/whs_growth/calhoun2025_digitized.csv")
    lines = ["measure,panel,percentile,age,age_unit,value,unit,sex,source"]
    for r in sorted(rows, key=lambda r: (r["measure"], r["panel"], r["percentile"], r["age"])):
        lines.append(f"{r['measure']},{r['panel']},{r['percentile']},{r['age']},{r['age_unit']},{r['value']},{r['unit']},{r['sex']},calhoun2025_digitized")
    out.write_text("\n".join(lines) + "\n")
    print(f"wrote {out} — {len(rows)} rows")
    measures = {}
    for r in rows:
        measures.setdefault((r["measure"], r["panel"]), set()).add(r["percentile"])
    for k, v in sorted(measures.items()):
        print(" ", k, sorted(v))


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "axes"
    fig = sys.argv[2] if len(sys.argv) > 2 else "growth2025_fig1_wb.jpg"
    if cmd == "curves":
        curves_stage(fig)
        return
    if cmd == "verify":
        verify_stage(fig)
        return
    if cmd == "assemble":
        assemble_stage()
        return
    if cmd == "axes":
        if fig.startswith("growth2025_fig1"):
            xw = {"left": [0, 5, 10, 15, 20], "right": [5, 10, 15]}
            yw = {"left": [14, 12, 10, 8, 6, 4, 2], "right": [60, 40, 20, 0]}
        elif fig.startswith("growth2025_fig2"):
            xw = {"left": [0, 5, 10, 15, 20], "right": [5, 10, 15]}
            yw = {"left": [90, 80, 70, 60, 50, 40], "right": [180, 160, 140, 120, 100, 80, 60, 40]}
        else:  # fig3 OFC
            xw = {"ofc": [0, 5, 10, 15, 20]}
            yw = {"ofc": [50, 45, 40, 35, 30]}
        res = axes_stage(fig, xw, yw)
        for name, d in res.items():
            print(f"[{name}] calibrating")
            calibrate(d["xticks"], xw[name], f"{name} x (age)")
            calibrate(d["yticks"], yw[name], f"{name} y (value)")
        Path("/tmp/d2025_axes.json").write_text(json.dumps(res))
        print("saved /tmp/d2025_axes.json")


if __name__ == "__main__":
    main()
