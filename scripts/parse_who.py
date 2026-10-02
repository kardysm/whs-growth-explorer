#!/usr/bin/env python3
"""Convert WHO xlsx tables -> research/data/who_lms/*.json (LMS + SD columns)."""
import json
import pathlib

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "research" / "data" / "who_lms"
RAWX = OUT / "raw"

FILES = {
    ("wfa", "boys"): ["wfa_boys_0-to-5-years_zscores.xlsx"],
    ("wfa", "girls"): ["wfa_girls_0-to-5-years_zscores.xlsx"],
    ("lhfa", "boys"): ["lhfa_boys_0-to-2-years_zscores.xlsx", "lhfa_boys_2-to-5-years_zscores.xlsx"],
    ("lhfa", "girls"): ["lhfa_girls_0-to-2-years_zscores.xlsx", "lhfa_girls_2-to-5-years_zscores.xlsx"],
    ("wfl", "boys"): ["wfl_boys_0-to-2-years_zscores.xlsx"],
    ("wfl", "girls"): ["wfl_girls_0-to-2-years_zscores.xlsx"],
    ("wfh", "boys"): ["wfh_boys_2-to-5-years_zscores.xlsx"],
    ("wfh", "girls"): ["wfh_girls_2-to-5-years_zscores.xlsx"],
}
AXIS = {"wfa": "age_months", "lhfa": "age_months", "wfl": "length_cm", "wfh": "height_cm"}


def read_rows(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    return rows


for (ind, sex), files in FILES.items():
    header = None
    allrows = {}
    for fn in files:
        rows = read_rows(RAWX / fn)
        h = [str(c).strip() if c is not None else "" for c in rows[0]]
        if header is None:
            header = h
        assert h == header or [x.strip() for x in h] == [x.strip() for x in header], (fn, h)
        for r in rows[1:]:
            if r[0] is None:
                continue
            key = float(r[0])
            vals = [None if v is None else float(v) for v in r[1:]]
            allrows[key] = vals
    keys = sorted(allrows)
    out = {
        "source": "WHO Child Growth Standards (2006) - expanded z-score tables, retrieved 2026-10-02",
        "source_id": "who_standards_wfa",
        "indicator": ind, "sex": sex, "axis": AXIS[ind],
        "columns": header, "rows": [[k] + allrows[k] for k in keys],
    }
    dest = OUT / f"{ind}_{sex}.json"
    dest.write_text(json.dumps(out, separators=(",", ":")))
    print(ind, sex, "rows:", len(keys), "range:", keys[0], "->", keys[-1], "->", dest.name)

# sanity checks against known WHO values
wfa_boys = json.loads((OUT / "wfa_boys.json").read_text())
i = wfa_boys["columns"].index("M")
m12 = [r for r in wfa_boys["rows"] if r[0] == 12][0][1 + i]
print("check wfa boys 12mo M:", m12, "(expected 9.6479)")
lhfa_boys = json.loads((OUT / "lhfa_boys.json").read_text())
i = lhfa_boys["columns"].index("M")
m0 = [r for r in lhfa_boys["rows"] if r[0] == 0][0][1 + i]
print("check lhfa boys 0mo M:", m0, "(expected 49.8842)")
