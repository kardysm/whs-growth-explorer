#!/usr/bin/env python3
"""Convert research/data -> src/data (importable by Vite/vitest)."""
import csv
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
SD = ROOT / "src" / "data"
SD.mkdir(parents=True, exist_ok=True)

# WHO LMS tables
who_out = SD / "who_lms"
who_out.mkdir(exist_ok=True)
for f in (ROOT / "research" / "data" / "who_lms").glob("*.json"):
    shutil.copy(f, who_out / f.name)
    print("who:", f.name)

# WHS digitized rows
rows = []
with (ROOT / "research" / "data" / "whs_growth" / "antonius_digitized.csv").open() as fh:
    for r in csv.DictReader(fh):
        rows.append({
            "sex": r["sex"], "measure": r["measure"], "age_months": int(r["age_months"]),
            "line": r["line"],
            "value": None if r["value"] == "" else float(r["value"]),
            "est_error": None if r["est_error"] == "" else float(r["est_error"]),
        })
(SD / "whs_digitized.json").write_text(json.dumps({
    "source_id": "antonius2008", "method": "digitized",
    "note": "Digitized from Antonius 2008 figures 2-5; see research/data/whs_growth/provenance.md",
    "rows": rows}, separators=(",", ":")))
print("whs_digitized.json rows:", len(rows))

# parameters + sources
for name in ["parameters.json"]:
    shutil.copy(ROOT / "research" / "data" / name, SD / name)
    print("copied:", name)
shutil.copy(ROOT / "research" / "sources.json", SD / "sources.json")
print("copied: sources.json")
