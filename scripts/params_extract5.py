#!/usr/bin/env python3
"""Fifth pass: Krick factors source hunt, TRS935 Table 47, PZH micros, refeeding criteria."""
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def strip_html(x):
    x = re.sub(r"<script.*?</script>", " ", x, flags=re.S | re.I)
    x = re.sub(r"<style.*?</style>", " ", x, flags=re.S | re.I)
    x = re.sub(r"<[^>]+>", " ", x)
    return re.sub(r"\s+", " ", x)


def fetch_fulltext(tag, pmcid):
    dest = RAW / f"fulltext_{tag}.xml"
    if not dest.exists() or dest.stat().st_size < 2000:
        subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest),
                        f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"])
    return strip_html(dest.read_text(errors="ignore"))


print("### Krick 1992 abstract ###")
d = json.loads((RAW / "epmc_krick1992.json").read_text())
for r in ((d.get("resultList") or {}).get("result") or [])[:1]:
    print((r.get("abstractText") or "NO ABSTRACT")[:1500])

print("\n### NI children 2009 (PMC2735385) ###")
t = fetch_fulltext("ni2009", "PMC2735385")
print("chars:", len(t))
for pat in ["Krick", r"0\.9", r"1\.1\b", r"1\.25", r"1\.15", "Culley", "kcal/cm", "tone", "activity factor"]:
    for m in list(re.finditer(pat, t))[:3]:
        seg = t[max(0, m.start() - 200):m.start() + 260]
        print(f"[{pat}]", seg.replace("\n", " ")[:430], "\n")

print("\n### feeding_intolerance refs 38/39 ###")
t2 = fetch_fulltext("feeding_intolerance_2017", "PMC5789283")
ref = re.search(r"References(.{0,7000})", t2, re.S)
if ref:
    seg = ref.group(1)
    print(seg[:900], "\n...\n", seg[900:1800], "\n...\n")
print("### context of the kcal/cm sentence ###")
i = t2.find("12")
for m in list(re.finditer(r"12\s*[–-]\s*15 kcal/cm", t2))[:2]:
    print(">>", t2[max(0, m.start() - 500):m.start() + 350], "\n")

print("### TRS935 Table 47 ###")
pt = (RAW / "protein_trs935_text.txt").read_text()
idxs = [m.start() for m in re.finditer(re.escape("Table 47"), pt)]
print("occurrences:", len(idxs))
if idxs:
    print(pt[idxs[-1]:idxs[-1] + 2000], "\n")

print("### PZH: Żelazo / Cynk / witamina D contexts ###")
zt = (RAW / "pzh_normy_text.txt").read_text()
for kw in ["Żelazo", "Cynk", "witaminy D"]:
    c = 0
    for m in re.finditer(kw, zt):
        seg = zt[max(0, m.start() - 60):m.start() + 400]
        if re.search(r"\d+\s*(mg|µg|j\.m\.|IU|mcg)", seg):
            print(kw, ">>", seg.replace("\n", " ")[:420], "\n")
            c += 1
        if c >= 4:
            break

print("### refeeding criteria (MDPI children) ###")
t3 = strip_html((RAW / "fulltext_refeeding_children_2025.xml").read_text(errors="ignore"))
for kw in ["at risk of RFS", "risk factors", "marasmus", "kwashiorkor", "recommendation", "monitor"]:
    for m in list(re.finditer(kw, t3, re.I))[:2]:
        print(f"[{kw}]", t3[max(0, m.start() - 140):m.start() + 340].replace("\n", " ")[:430], "\n")
