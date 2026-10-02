#!/usr/bin/env python3
"""Compact digest of research/seed_fetch_results.json (for eyeballing)."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "research" / "seed_fetch_results.json").read_text())
for r in d["results"]:
    t = r.get("top") or {}
    print("%-20s epmc=%s hits=%s pmid=%s pmcid=%s ft=%s xref=%s url_http=%s bytes=%s" % (
        r["id"], r.get("epmc_http"), r.get("hitCount"), t.get("pmid"), t.get("pmcid"),
        r.get("fulltext_http"), r.get("crossref_http"), r.get("http"), r.get("bytes")))
    if r.get("figures"):
        print("      figures: %s" % r["figures"])
    if r.get("top5"):
        for x in r["top5"][:3]:
            print("      | pm%s | %s | %s" % (x.get("pmid"), x.get("doi"),
                                              (x.get("title") or "")[:110]))
    f = r.get("file")
    if f and f.endswith((".html", ".htm")):
        try:
            txt = (ROOT / f).read_text(errors="ignore")[:6000]
            txt = re.sub(r"<script.*?</script>", " ", txt, flags=re.S | re.I)
            txt = re.sub(r"<[^>]+>", " ", txt)
            txt = re.sub(r"\s+", " ", txt).strip()
            print("      page: %s" % txt[:150])
        except Exception as e:
            print("      page: [unreadable: %s]" % e)
    if r.get("error"):
        print("      ERROR: %s" % r["error"])
