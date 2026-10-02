#!/usr/bin/env python3
"""Fourth pass: Krick factor values, Schofield child equations, TRS935 14.3/10.1, PZH norms, NASEM units."""
import json
import pathlib
import re
import subprocess
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def strip_html(x):
    x = re.sub(r"<script.*?</script>", " ", x, flags=re.S | re.I)
    x = re.sub(r"<style.*?</style>", " ", x, flags=re.S | re.I)
    x = re.sub(r"<[^>]+>", " ", x)
    return re.sub(r"\s+", " ", x)


print("=" * 24, "factor values in OA sources", "=" * 24)
for tag in ["topten_ni_2020", "ni_dietary_2015", "feeding_intolerance_2017", "energy_rationale_2026"]:
    p = RAW / f"fulltext_{tag}.xml"
    if not p.exists():
        continue
    t = strip_html(p.read_text(errors="ignore"))
    for pat in [r"0\.9", r"1\.1\b", r"1\.15", r"1\.25", r"1\.3\b", r"tone factor", r"activity factor", r"growth factor"]:
        for m in list(re.finditer(pat, t))[:3]:
            seg = t[max(0, m.start() - 130):m.start() + 170]
            if re.search(r"(factor|tone|activity|growth|kcal)", seg, re.I):
                print(f"{tag} [{pat}]", seg.replace("\n", " ")[:300], "\n")

print("=" * 24, "EPMC searches: factors + Schofield children", "=" * 24)
qs = [
    ("tone_factor", '"muscle tone factor" AND (energy OR kcal OR requirements)'),
    ("schofield_num", '"Schofield" AND ("60.9" OR "22.7")'),
    ("schofield_child", '"Schofield" AND "children" AND ("MJ/day" OR "kcal/day") AND ("equation" OR "formula")'),
]
for tag, q in qs:
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
        {"query": q, "format": "json", "resultType": "core", "pageSize": "6"})
    dest = RAW / f"epmc_{tag}.json"
    subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", str(dest), url])
    d = json.loads(dest.read_text())
    print(f"--- {tag}: hits {d.get('hitCount')}")
    for r in ((d.get("resultList") or {}).get("result") or [])[:6]:
        ji = r.get("journalInfo") or {}
        print(f"   pm{r.get('pmid')} {ji.get('yearOfPublication')} OA:{r.get('isOpenAccess')} pmc:{r.get('pmcid')} | {(r.get('title') or '')[:95]}")

print("=" * 24, "FAO: child Schofield numbers?", "=" * 24)
for f in ["fao_y5686e05.htm", "fao_y5686e06.htm", "fao_y5686e0e.htm"]:
    t = strip_html((RAW / f).read_text(errors="ignore"))
    for pat in [r"60\.9", r"22\.7", r"17\.5", r"weight\s*\(kg\).{0,60}height"]:
        for m in list(re.finditer(pat, t))[:2]:
            print(f, pat, ">>", t[max(0, m.start() - 150):m.start() + 220], "\n")

print("=" * 24, "TRS935: 14.3 summary + 10.1 section", "=" * 24)
pt = (RAW / "protein_trs935_text.txt").read_text()
idxs = [m.start() for m in re.finditer(re.escape("Protein requirements of infants, children and adolescents"), pt)]
print("14.3 occurrences:", len(idxs))
if idxs:
    i = idxs[-1]
    print(pt[i:i + 1900], "\n")
idxs2 = [m.start() for m in re.finditer(re.escape("Protein requirements for rapid weight gain"), pt)]
print("10.1 occurrences:", len(idxs2))
if len(idxs2) > 1:
    print(pt[idxs2[-1]:idxs2[-1] + 2400], "\n")

print("=" * 24, "PZH: mg/dzień & µg/dzień contexts", "=" * 24)
zt = (RAW / "pzh_normy_text.txt").read_text()
for pat, n in [(r"mg/dzień", 10), (r"µg/dzień", 10)]:
    for m in list(re.finditer(pat, zt))[:n]:
        print(pat, ">>", zt[max(0, m.start() - 230):m.start() + 120].replace("\n", " ")[:350], "\n")

print("=" * 24, "NASEM: age units", "=" * 24)
nt = (RAW / "nasem_eer_equations.txt").read_text()
for kw in ["age is", "age (", "expressed in", "where", "months of age"]:
    for m in list(re.finditer(re.escape(kw), nt))[:3]:
        print(f"[{kw}]", nt[max(0, m.start() - 120):m.start() + 220].replace("\n", " ")[:340], "\n")

print("=" * 24, "EFSA children kcal table", "=" * 24)
et = (RAW / "efsa_ar_summaries.txt").read_text()
i = et.find("Summary of Average Requirement (AR) for energy for children")
print(et[i:i + 2400] if i >= 0 else "not found")

print("=" * 24, "EFSA 0-6 mo handling", "=" * 24)
e2 = (RAW / "efsa_energy_text.txt").read_text()
for m in list(re.finditer(r"adequate intake|breast-?fed infants|0-6 months|first 6 months", e2, re.I))[:6]:
    print(">>", e2[max(0, m.start() - 160):m.start() + 240].replace("\n", " ")[:380], "\n")
