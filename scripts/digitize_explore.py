#!/usr/bin/env python3
"""Diagnostics for Antonius figure digitization: frame/grid line detection, sample runs."""
import json
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
FIGS = ROOT / "research" / "raw" / "figs"

# re-verify WHO parse with correct indexing
OUT = ROOT / "research" / "data" / "who_lms"
wb = json.loads((OUT / "wfa_boys.json").read_text())
cols = [c.strip() for c in wb["columns"]]
iM = cols.index("M")
row12 = [r for r in wb["rows"] if r[0] == 12][0]
print("wfa boys 12mo M:", row12[iM], "(expect 9.6479)")
lb = json.loads((OUT / "lhfa_boys.json").read_text())
cols2 = [c.strip() for c in lb["columns"]]
iM2 = cols2.index("M")
row0 = [r for r in lb["rows"] if r[0] == 0][0]
print("lhfa boys 0mo M:", row0[iM2], "(expect 49.8842)")

for fig in [2, 3, 4, 5]:
    im = Image.open(FIGS / f"antonius_fig{fig}.jpg").convert("L")
    a = np.array(im)
    H, W = a.shape
    dark = a < 120
    rowc = dark.sum(axis=1)
    colc = dark.sum(axis=0)
    print(f"\n=== fig{fig}: {W}x{H} ===")
    rows = [i for i in range(H) if rowc[i] > 0.6 * W]
    cols = [i for i in range(W) if colc[i] > 0.6 * H]
    print(" dark rows(>60%):", rows)
    print(" dark cols(>60%):", cols)
    g = (a >= 150) & (a <= 220)
    rowg = g.sum(axis=1)
    colg = g.sum(axis=0)
    rows2 = [i for i in range(H) if rowg[i] > 0.5 * W]
    cols2 = [i for i in range(W) if colg[i] > 0.5 * H]
    print(" gray rows(>50%):", rows2)
    print(" gray cols(>50%):", cols2)
    for x in [150, 250, 350]:
        ys = np.where(dark[:, x])[0]
        runs = []
        start = None
        prev = None
        for y in ys:
            if start is None:
                start = y
            elif y - prev > 1:
                runs.append((start, prev))
                start = y
            prev = y
        if start is not None:
            runs.append((start, prev))
        print(f"  x={x} dark runs:", runs)
