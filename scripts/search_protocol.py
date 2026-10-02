#!/usr/bin/env python3
"""§2.2 search protocol: run the minimum query set on Europe PMC, save raw + draft log.

Outputs:
  research/raw/epmc_search_<tag>.json  (raw responses)
  research/search-protocol-dump.md     (draft screening table for curation)
"""
import datetime
import json
import pathlib
import subprocess
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
ACCESSED = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

QUERIES = [
    ("q1_whs_feeding", '"Wolf-Hirschhorn" AND (feeding OR growth OR nutrition OR gastrostomy OR weight OR dysphagia OR reflux)'),
    ("q2_4p_growth", '("4p- syndrome" OR "4p deletion") AND growth'),
    ("q3_ee_ni", '("energy expenditure") AND (hypotonia OR "neurological impairment" OR "cerebral palsy") AND children'),
    ("q4_ds_ee", '"Down syndrome" AND "energy expenditure"'),
    ("q5_catchup", '"catch-up growth" AND energy AND children'),
    ("q6_ftt_guideline", '("failure to thrive" OR "faltering growth") AND guideline'),
    ("q7_whs_energy", '"Wolf-Hirschhorn" AND (energy OR calories OR "energy expenditure" OR "nutritional status")'),
    ("q8_whs_gastrostomy", '"Wolf-Hirschhorn" AND (gastrostomy OR "tube feeding" OR dysphagia)'),
    ("q9_ni_energy_req", '"energy requirements" AND ("neurological impairment" OR "cerebral palsy") AND children'),
    ("q10_refeeding", '("refeeding syndrome") AND children AND (consensus OR guideline OR recommendations)'),
]

lines = [f"# §2.2 search-protocol dump (Europe PMC) — {ACCESSED}\n"]
for tag, q in QUERIES:
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
        {"query": q, "format": "json", "resultType": "core", "pageSize": "25"})
    dest = RAW / f"epmc_search_{tag}.json"
    subprocess.run(["curl", "-sS", "-L", "--max-time", "90", "-A", UA, "-o", str(dest), url])
    d = json.loads(dest.read_text())
    hits = d.get("hitCount", 0)
    res = (d.get("resultList") or {}).get("result") or []
    print(f"{tag}: hits={hits} saved={len(res)}")
    lines.append(f"\n## {tag} — `{q}`\nhits: {hits}; shown: {len(res)}\n")
    lines.append("| # | pmid | doi | year | journal | title | screen |")
    lines.append("|---|------|-----|------|---------|-------|--------|")
    for i, r in enumerate(res, 1):
        ji = r.get("journalInfo") or {}
        title = (r.get("title") or "").replace("|", "/")[:150]
        lines.append("| %d | %s | %s | %s | %s | %s | ? |" % (
            i, r.get("pmid") or "", r.get("doi") or "",
            ji.get("yearOfPublication") or "", ((ji.get("journal") or {}).get("title") or "")[:40],
            title))
    time.sleep(0.8)

(ROOT / "research" / "search-protocol-dump.md").write_text("\n".join(lines))
print("wrote research/search-protocol-dump.md")
