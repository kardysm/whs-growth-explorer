#!/usr/bin/env python3
"""Fetch the extended sources selected from the §2.2 search protocol."""
import json
import pathlib
import subprocess
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"

EXT = [
    ("whs_gh_2026", "41017003"),
    ("whs_epilepsy_2025", "41303083"),
    ("whs_features_2023", "37576793"),
    ("ds_nutrition_2025", "40941574"),
    ("ree_rehab_2026", "42766671"),
    ("faltering_2026", "41833317"),
    ("whs_oral_2020", "33158290"),
    ("ni_nutrition_2025", "38196166"),
    ("refeeding_children_2025", "41007088"),
    ("cp_protein_2026", "42238674"),
]

for tag, pmid in EXT:
    q = "EXT_ID:%s AND SRC:MED" % pmid
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
        {"query": q, "format": "json", "resultType": "core", "pageSize": "3"})
    dest = RAW / f"epmc_ext_{tag}.json"
    subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", str(dest), url])
    d = json.loads(dest.read_text())
    rl = (d.get("resultList") or {}).get("result") or []
    if not rl:
        print(tag, pmid, "NOT FOUND")
        continue
    r = rl[0]
    ji = r.get("journalInfo") or {}
    print(tag, "pm" + str(r.get("pmid")), "|", ji.get("yearOfPublication"), "|",
          (ji.get("journal") or {}).get("title"), "|", (r.get("title") or "")[:110])
    time.sleep(0.8)
