#!/usr/bin/env python3
"""Ad-hoc Europe PMC query helper.

Usage: python3 scripts/epmc_query.py <tag> <query> [pageSize]
Stores raw JSON at research/raw/epmc_<tag>.json and prints top hits.
"""
import json
import pathlib
import subprocess
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
RAW.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"

tag, q = sys.argv[1], sys.argv[2]
n = sys.argv[3] if len(sys.argv) > 3 else "5"
url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
    {"query": q, "format": "json", "resultType": "core", "pageSize": n})
dest = RAW / ("epmc_%s.json" % tag)
subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", str(dest), url])
d = json.loads(dest.read_text())
print("=== %s === hits: %s" % (tag, d.get("hitCount")))
for r in (d.get("resultList") or {}).get("result") or []:
    ji = r.get("journalInfo") or {}
    print("- pm%s doi:%s | %s | %s %s" % (
        r.get("pmid"), r.get("doi"), (r.get("title") or "")[:120],
        (ji.get("journal") or {}).get("title"), ji.get("yearOfPublication")))
