#!/usr/bin/env python3
"""Second extraction pass: FAO child tables, TRS935 catch-up protein, PZH tables, Krick/Schofield checks."""
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


print("=" * 28, "FAO ch06: child TEE regression tables", "=" * 28)
x = strip_html((RAW / "fao_y5686e06.htm").read_text(errors="ignore"))
i = x.find("TABLE 4.1")
print(x[i:i + 2600], "\n")
i2 = x.find("TABLE 4.2")
print(x[i2:i2 + 1800], "\n")

print("=" * 28, "TRS935: section 10 catch-up protein", "=" * 28)
pt = (RAW / "protein_trs935_text.txt").read_text()
i = pt.find("Protein requirements for rapid weight gain")
print(pt[i:i + 3000], "\n")
j = pt.find("Catch-up in height in stunted")
print(pt[j:j + 1500], "\n")
print("-- protein EAR numbers near 'g/kg' --")
for m in list(re.finditer(r"[0-9]\.[0-9]{1,2}\s*g[^.]{0,80}kg", pt))[:10]:
    print(">>", pt[max(0, m.start() - 120):m.start() + 160].replace("\n", " "), "\n")

print("=" * 28, "PZH: energy section + tables", "=" * 28)
zt = (RAW / "pzh_normy_text.txt").read_text()
i = zt.find("zapotrzebowanie na energię jest definiowane")
print(zt[i:i + 1200], "\n")
for kw in ["kcal/kg", "EER", "PAL"]:
    for m in list(re.finditer(re.escape(kw), zt))[:6]:
        print(kw, ">>", zt[max(0, m.start() - 200):m.start() + 260].replace("\n", " "), "\n")

print("=" * 28, "PZH: micronutrients (numbers)", "=" * 28)
for kw in ["witamina D", "żelazo", "cynk"]:
    c = 0
    for m in re.finditer(kw, zt, re.I):
        seg = zt[m.start(): m.start() + 260]
        if re.search(r"\d", seg):
            print(kw, ">>", seg.replace("\n", " ")[:260], "\n")
            c += 1
        if c >= 4:
            break

print("=" * 28, "abstracts: ashworth/spady/golden/ree_rehab", "=" * 28)
for f in ["epmc_ashworth1969.json", "epmc_spady1976.json", "epmc_catchup_energy_2.json", "epmc_ext_ree_rehab_2026.json"]:
    d = json.loads((RAW / f).read_text())
    for r in ((d.get("resultList") or {}).get("result") or [])[:2]:
        t = r.get("abstractText") or ""
        if t:
            print("###", f, "|", (r.get("title") or "")[:90])
            print(t[:900].replace("\n", " "), "\n")

print("=" * 28, "borsani: Schofield / energy equations", "=" * 28)
bt = strip_html((RAW / "fulltext_borsani2023.xml").read_text(errors="ignore"))
for kw in ["Schofield", "predictive equation", " FAO", "WHO"]:
    for m in list(re.finditer(re.escape(kw), bt, re.I))[:3]:
        print(kw, ">>", bt[max(0, m.start() - 150):m.start() + 300], "\n")

print("=" * 28, "EPMC: Krick quotes in open sources", "=" * 28)
for tag, q in [
    ("krick_in_fulltext", '"Krick" AND ("energy" AND ("cerebral palsy" OR "neurological impairment"))'),
    ("kcalcm", '"kcal/cm" AND (cerebral palsy OR "energy requirements")'),
    ("schofield_eq", '"Schofield" AND ("resting energy expenditure" OR "basal metabolic rate") AND children AND equations'),
]:
    url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
        {"query": q, "format": "json", "resultType": "core", "pageSize": "8"})
    dest = RAW / f"epmc_{tag}.json"
    subprocess.run(["curl", "-sS", "-L", "--max-time", "60", "-A", UA, "-o", str(dest), url])
    d = json.loads(dest.read_text())
    print(f"--- {tag}: hits {d.get('hitCount')}")
    for r in ((d.get("resultList") or {}).get("result") or [])[:8]:
        ji = r.get("journalInfo") or {}
        print(f"   pm{r.get('pmid')} {ji.get('yearOfPublication')} OA:{r.get('isOpenAccess')} pmc:{r.get('pmcid')} | {(r.get('title') or '')[:100]}")
