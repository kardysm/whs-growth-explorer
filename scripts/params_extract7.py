#!/usr/bin/env python3
"""Seventh pass: wayback PMC2735385 (Krick factors), extra source records, NASEM footnotes, PZH hunt #3."""
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


print("### wayback PMC2735385 ###")
for url in ["https://web.archive.org/web/2id_/https://pmc.ncbi.nlm.nih.gov/articles/PMC2735385/",
            "https://web.archive.org/web/2id_/https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2735385/"]:
    dest = RAW / "wb_pmc2735385.html"
    subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest), url])
    b = dest.read_bytes()
    print(url, "->", len(b), b[:14])
    if len(b) > 10000:
        break
if dest.exists() and dest.stat().st_size > 10000:
    t = strip_html(dest.read_text(errors="ignore"))
    for pat in ["Krick method", "Muscle tone factor", "Activity factor", r"0\.9", r"1\.1\b", r"1\.15", r"1\.2\b", r"1\.3\b", r"1\.25", "growth factor", "kcal/cm"]:
        for m in list(re.finditer(pat, t))[:4]:
            seg = t[max(0, m.start() - 240):m.start() + 320]
            print(f"[{pat}]", seg.replace("\n", " ")[:520], "\n")

print("### extra source records ###")
for tag, pmid in [("cps2009_marchand", "20592978"), ("feeding_intol_2017", "29271904")]:
    q = "EXT_ID:%s AND SRC:MED" % pmid
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
        {"query": q, "format": "json", "resultType": "core", "pageSize": "2"})
    dest = RAW / f"epmc_{tag}.json"
    subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", str(dest), url])
    d = json.loads(dest.read_text())
    r = (((d.get("resultList") or {}).get("result") or []) or [{}])[0]
    ji = r.get("journalInfo") or {}
    print(tag, "|", r.get("authorString"), "|", (r.get("title") or "")[:100], "|",
          (ji.get("journal") or {}).get("title"), ji.get("yearOfPublication"),
          ji.get("volume"), r.get("pageInfo"), "| doi:", r.get("doi"))

print("### NASEM footnotes a/b/c ###")
nt = (RAW / "nasem_eer_equations.txt").read_text()
for pat in [r"a\s+For", r"b\s+For", r"c\s+For", r"a\s+kcal", r"^\s*a\s", r"\bkcal/d for\b", r"growth.{0,120}kcal"]:
    for m in list(re.finditer(pat, nt, re.M))[:3]:
        print(f"[{pat}]", nt[max(0, m.start() - 120):m.start() + 260].replace("\n", " ")[:360], "\n")

print("### PZH hunt #3 ###")
zt = (RAW / "pzh_normy_text.txt").read_text()
for m in list(re.finditer(re.escape("Normy na żelazo"), zt))[:2]:
    print("Normy na żelazo >>", zt[max(0, m.start() - 100):m.start() + 700].replace("\n", " "), "\n")
for pat in [r"[Żż]elazo[^.]{0,240}mg", r"cynk[^.]{0,240}mg", r"witamin[ęy] D[^.]{0,240}(µg|j\.m\.)"]:
    for m in list(re.finditer(pat, zt, re.I)):
        seg = zt[max(0, m.start() - 120):m.start() + 340]
        if re.search(r"(1–3|4–6|0,5|niemowl|dzieci)", seg, re.I):
            print(f"[{pat[:14]}]", seg.replace("\n", " ")[:430], "\n")
            break
