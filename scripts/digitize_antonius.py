#!/usr/bin/env python3
"""Digitize Antonius 2008 growth charts (figs 2-5) into research/data/whs_growth/.

Method: frame-based axis calibration + per-column dark-run extraction + ordered
5-track nearest-neighbour tracking. Two threshold configs -> duplicate-run error
estimate on 10 points per chart. Overlay PNGs saved for visual verification.
"""
import csv
import pathlib

import numpy as np
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1]
FIGS = ROOT / "research" / "raw" / "figs"
OUT = ROOT / "research" / "data" / "whs_growth"
OUT.mkdir(parents=True, exist_ok=True)

CHARTS = {
    "height_girls": dict(file="antonius_fig2.jpg", measure="length", sex="girls",
                         xl=47, xr=442, yt=81, yb=615, ymin=30.0, ymax=105.0, unit="cm"),
    "height_boys": dict(file="antonius_fig3.jpg", measure="length", sex="boys",
                        xl=49, xr=448, yt=75, yb=614, ymin=30.0, ymax=105.0, unit="cm"),
    "weight_girls": dict(file="antonius_fig4.jpg", measure="weight", sex="girls",
                         xl=41, xr=448, yt=82, yb=632, ymin=0.0, ymax=12.0, unit="kg"),
    "weight_boys": dict(file="antonius_fig5.jpg", measure="weight", sex="boys",
                        xl=41, xr=447, yt=78, yb=626, ymin=0.0, ymax=12.0, unit="kg"),
}
LINES = ["+2SD", "+1SD", "mean", "-1SD", "-2SD"]  # top to bottom
MONTHS = list(range(0, 49, 3))


def find_runs(col, thr):
    ys = np.where(col < thr)[0]
    runs = []
    start = prev = None
    for y in ys:
        if start is None:
            start = prev = y
        elif y - prev > 1:
            runs.append((int(start), int(prev)))
            start = prev = y
        else:
            prev = y
    if start is not None:
        runs.append((int(start), int(prev)))
    return runs


def digitize(cfg, thr):
    a = np.array(Image.open(FIGS / cfg["file"]).convert("L"))
    xl, xr, yt, yb = cfg["xl"], cfg["xr"], cfg["yt"], cfg["yb"]
    ppm = (xr - xl) / 48.0
    H, W = a.shape

    def py_to_val(py):
        return cfg["ymin"] + (yb - py) / (yb - yt) * (cfg["ymax"] - cfg["ymin"])

    # --- choose seed column with exactly 5 plausible runs ---
    seed = None
    for m in [24, 30, 20, 36, 18, 12, 28, 32]:
        x = int(round(xl + m * ppm))
        col = a[:, x].astype(int)
        runs = [(s, e) for (s, e) in find_runs(col, thr) if yt + 2 < s and e < yb - 2 and (e - s) <= 20]
        if len(runs) == 5:
            seed = (m, x, runs)
            break
    if seed is None:
        raise RuntimeError(f"no seed column found for {cfg['file']}")

    # --- track right and left from seed ---
    def track(start_x, seed_runs, direction):
        tracks = [[(s + e) / 2.0] for (s, e) in seed_runs]  # y-center per line
        gaps = [0] * 5
        xs = list(range(start_x + direction, xl - 1 if direction < 0 else xr, direction))
        for x in xs:
            col = a[:, x].astype(int)
            runs = [(s, e) for (s, e) in find_runs(col, thr) if yt + 2 < s and e < yb - 2 and (e - s) <= 25]
            # candidate centers; tall runs may be merged pairs OR marker blobs:
            # offer center + both edge centers, let prediction pick
            cands = []
            for (s, e) in runs:
                h = e - s
                cands.append(((s + e) / 2.0, h))
                if h >= 6:
                    cands.append((s + 1.5, h))
                    cands.append((e - 1.5, h))
            used = set()
            for i in range(5):
                hist = tracks[i]
                pred = hist[-1]
                if len(hist) >= 2:
                    pred = hist[-1] + (hist[-1] - hist[-2]) * 0.8
                best, bestd = None, 9e9
                for j, (c, h) in enumerate(cands):
                    if j in used:
                        continue
                    d = abs(c - pred)
                    if d < bestd:
                        best, bestd = j, d
                if best is not None and bestd <= 6.0:
                    used.add(best)
                    hist.append(cands[best][0])
                    gaps[i] = 0
                else:
                    hist.append(pred)
                    gaps[i] += 1
        return tracks

    m_seed, x_seed, seed_runs = seed
    left = track(x_seed, seed_runs, -1)
    right = track(x_seed, seed_runs, +1)
    # assemble: y-center per line per x (we recorded only sequences; for simplicity resample at months)
    # Build lookup: for each direction we sampled one value per x step; reconstruct dict x->[5]
    ymap = {}
    for x, vals in zip(range(x_seed, xl - 1, -1), zip(*left)):
        ymap[x] = list(vals)
    for x, vals in zip(range(x_seed + 1, xr), zip(*right)):
        ymap[x] = list(vals)

    # --- sample at month grid ---
    samples = {}
    fallback_used = 0
    for m in MONTHS:
        x = int(round(xl + m * ppm))
        x = min(max(x, xl + 1), xr - 1)
        cols5 = []
        for xx in [x - 1, x, x + 1]:
            if xx < xl + 1 or xx > xr - 1:
                continue
            runs = [(s, e) for (s, e) in find_runs(a[:, xx].astype(int), thr)
                    if yt + 2 < s and e < yb - 2 and (e - s) <= 25]
            if len(runs) == 5:
                cols5.append([(s + e) / 2.0 for (s, e) in runs])
        if cols5:
            vals = []
            for i in range(5):
                py = float(np.mean([c[i] for c in cols5]))
                vals.append(round(py_to_val(py), 3))
        else:
            fallback_used += 1
            cols = [xx for xx in range(x - 1, x + 2) if xx in ymap]
            vals = []
            for i in range(5):
                ys = [ymap[xx][i] for xx in cols]
                py = float(np.mean(ys)) if ys else None
                vals.append(None if py is None else round(py_to_val(py), 3))
        samples[m] = vals
    samples["_fallback_used"] = fallback_used
    return samples


def run_all(thr, tag):
    allsamples = {}
    for name, cfg in CHARTS.items():
        s = digitize(cfg, thr)
        allsamples[name] = s
        print(f"[{tag}] {name} (fallback cols used: {s.get('_fallback_used')}): " + "; ".join(
            f"{m}mo:" + ",".join("na" if v is None else f"{v:.2f}" for v in s[m])
            for m in [0, 12, 24, 36, 48]))
    return allsamples


A = run_all(145, "A")
B = run_all(135, "B")

print("\n--- duplicate-run diffs (10 pts/chart) ---")
pts = [(m, i) for m in [0, 6, 12, 18, 24, 30, 36, 42, 48] for i in [2]] + [(24, 0)]
allpts = [(m, i) for m in MONTHS for i in range(5)]
err = {}
for name in CHARTS:
    diffs = []
    for (m, i) in pts:
        va, vb = A[name][m][i], B[name][m][i]
        if va is not None and vb is not None:
            diffs.append(abs(va - vb))
    alld = []
    for (m, i) in allpts:
        va, vb = A[name][m][i], B[name][m][i]
        if va is not None and vb is not None:
            alld.append(abs(va - vb))
    mean_d = float(np.mean(diffs)) if diffs else None
    mean_all = float(np.mean(alld)) if alld else None
    err[name] = mean_d
    print(name, "10pt n=", len(diffs), "mean:", None if mean_d is None else round(mean_d, 4),
          "| full-grid n=", len(alld), "mean:", None if mean_all is None else round(mean_all, 4),
          "max:", None if not alld else round(max(alld), 4))

print("\n--- anchor checks vs paper text ---")
anchors = {
    "weight_boys": ("mean", {0: 2.1, 48: 9.7}),
    "weight_girls": ("mean", {0: 1.9, 48: 9.8}),
    "height_boys": ("mean", {0: 41.5, 48: 85.8}),
    "height_girls": ("mean", {0: 43.0, 48: 87.2}),
}
for name, (line, exp) in anchors.items():
    for m, v in exp.items():
        got = A[name][m][2]
        print(f"{name} {line} @{m}mo: digitized={got} paper={v} delta={None if got is None else round(got-v,3)}")

# --- write CSV ---
rows = []
for name, s in A.items():
    cfg = CHARTS[name]
    for m in MONTHS:
        for i, line in enumerate(LINES):
            v = s[m][i]
            rows.append({
                "source_id": "antonius2008", "sex": cfg["sex"], "age_months": m,
                "measure": cfg["measure"], "line": line,
                "value": "" if v is None else v, "method": "digitized",
                "est_error": "" if err[name] is None else round(err[name], 3),
            })
dest = OUT / "antonius_digitized.csv"
with dest.open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["source_id", "sex", "age_months", "measure", "line", "value", "method", "est_error"])
    w.writeheader()
    w.writerows(rows)
print("\nwrote", dest, len(rows), "rows")

# duplicate-run raw outputs for provenance
for tag, data in [("A", A), ("B", B)]:
    p = ROOT / "research" / "raw" / f"antonius_digitized_run{tag}.json"
    import json
    p.write_text(json.dumps({k: {str(m): v for m, v in s.items()} for k, s in data.items()}, indent=1))
    print("wrote", p)

# --- overlays for visual verification ---
for name, cfg in CHARTS.items():
    im = Image.open(FIGS / cfg["file"]).convert("RGB")
    dr = ImageDraw.Draw(im)
    xl, xr = cfg["xl"], cfg["xr"]
    yt, yb = cfg["yt"], cfg["yb"]
    ppm = (xr - xl) / 48.0
    colors = [(220, 0, 0), (0, 140, 0), (0, 0, 220), (150, 0, 150), (200, 120, 0)]
    for m in MONTHS:
        x = int(round(xl + m * ppm))
        for i in range(5):
            v = A[name][m][i]
            if v is None:
                continue
            py = yb - (v - cfg["ymin"]) / (cfg["ymax"] - cfg["ymin"]) * (yb - yt)
            dr.ellipse([x - 2, py - 2, x + 2, py + 2], outline=colors[i], width=1)
    dest = FIGS / f"overlay_{name}.png"
    im.save(dest)
    print("overlay:", dest)
