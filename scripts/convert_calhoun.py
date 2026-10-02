#!/usr/bin/env python3
"""Convert calhoun2025_digitized.csv -> src/data/calhoun2025.json (for the site)."""
import csv, json
from pathlib import Path

SRC = Path("research/data/whs_growth/calhoun2025_digitized.csv")
DST = Path("src/data/calhoun2025.json")

rows = list(csv.DictReader(SRC.open()))
out = {
    "note": (
        "Calhoun et al. 2025 (Am J Med Genet A 197:e64075), digitized percentiles. "
        "left = months 0-24; right = years 2-18 (right-panel tails carry model-edge artifacts "
        "near 2.0-2.5 y; extreme percentiles do not join at the 2-y seam; see provenance_2025.md)."
    ),
    "weight": {"left": {}, "right": {}},
    "length": {"left": {}, "right": {}},
    "ofc": {"ofc": {}},
}
for r in rows:
    meas = r["measure"]
    panel = "ofc" if meas == "ofc" else r["panel"]
    slot = out[meas][panel]
    slot.setdefault(r["percentile"], []).append([float(r["age"]), float(r["value"])])

for meas in out:
    if meas == "note":
        continue
    for panel in out[meas]:
        for pct in out[meas][panel]:
            out[meas][panel][pct] = sorted(out[meas][panel][pct])

DST.write_text(json.dumps(out, separators=(",", ":")))
n = sum(len(v) for m in ("weight", "length", "ofc") for pan in out[m] for v in out[m][pan].values())
print("wrote", DST, DST.stat().st_size, "bytes;", n, "points")
