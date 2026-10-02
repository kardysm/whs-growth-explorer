#!/usr/bin/env python3
"""Third extraction pass: Krick/kcal-cm/Schofield quotes from OA sources; remaining tables."""
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


def fetch_fulltext(tag, pmcid):
    dest = RAW / f"fulltext_{tag}.xml"
    if not dest.exists() or dest.stat().st_size < 2000:
        subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest),
                        f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"])
    return strip_html(dest.read_text(errors="ignore"))


print("=" * 26, "OA sources: Krick / kcal-cm / Schofield quotes", "=" * 26)
targets = [
    ("topten_ni_2020", "PMC7099819"),
    ("ni_dietary_2015", "PMC4663597"),
    ("feeding_intolerance_2017", "PMC5789283"),
    ("energy_rationale_2026", "PMC13175717"),
]
greps = ["Krick", "kcal/cm", "Schofield", "60.9", "22.7", "muscle tone", "tone factor", "activity factor"]
for tag, pmc in targets:
    t = fetch_fulltext(tag, pmc)
    print(f"--- {tag} ({pmc}) chars={len(t)}")
    for g in greps:
        ms = list(re.finditer(re.escape(g), t))
        if ms:
            m = ms[0]
            print(f"   [{g} x{len(ms)}] >>", t[max(0, m.start() - 160):m.start() + 300], "\n")

print("=" * 26, "TRS935: catch-up section (2nd occurrence) + summary tables", "=" * 26)
pt = (RAW / "protein_trs935_text.txt").read_text()
idxs = [m.start() for m in re.finditer(re.escape("rapid weight gain"), pt)]
print("occurrences:", len(idxs))
if len(idxs) > 1:
    i = idxs[-1]
    print(pt[i - 150:i + 3200], "\n")
k = pt.find("14.3 Protein requirements of infants, children and adolescents", 2000)
print("== 14.3 ctx ==")
print(pt[k:k + 2200] if k > 0 else "not found\n")

print("=" * 26, "PZH: micronutrient norm sections (uppercase headings)", "=" * 26)
zt = (RAW / "pzh_normy_text.txt").read_text()
for kw in ["ŻELAZO", "CYNK", "WITAMINA D", "WAPŃ"]:
    idxs = [m.start() for m in re.finditer(re.escape(kw), zt)]
    print(f"--- {kw}: {len(idxs)} occurrences")
    shown = 0
    for i in idxs:
        seg = zt[i:i + 900]
        if re.search(r"norm", seg, re.I) and re.search(r"\d", seg):
            print(">>", seg.replace("\n", " ")[:700], "\n")
            shown += 1
        if shown >= 2:
            break

print("=" * 26, "PZH: children energy table (after EER section)", "=" * 26)
m = re.search(r"Tabela 4\. Normy na energię.*?kcal", zt, re.S)
i = zt.find("Tabela 4. Normy")
print(zt[i:i + 1800] if i > 0 else "Tabela 4 not found; searching 'Normy na energię dla dzieci'")
if i <= 0:
    j = zt.find("Normy na energię dla dzieci")
    print(zt[j:j + 1800])

print("=" * 26, "FAO girls table + infants table", "=" * 26)
x6 = strip_html((RAW / "fao_y5686e06.htm").read_text(errors="ignore"))
i = x6.find("TABLE 4.3")
print(x6[i:i + 900], "\n")
x5 = strip_html((RAW / "fao_y5686e05.htm").read_text(errors="ignore"))
for t in ["TABLE 3.2", "TABLE 3.3", "TABLE 3.4"]:
    i = x5.find(t)
    if i > 0:
        print(x5[i:i + 1400], "\n")

print("=" * 26, "NASEM units + footnotes", "=" * 26)
nt = (RAW / "nasem_eer_equations.txt").read_text()
for kw in ["age (months)", "age (years)", "in months", "in years", "a ", "b ", "c "]:
    for m in list(re.finditer(re.escape(kw), nt))[:2]:
        seg = nt[max(0, m.start() - 150):m.start() + 260]
        if any(ch.isdigit() for ch in seg):
            print(f"[{kw}]", seg.replace("\n", " ")[:380], "\n")

print("=" * 26, "EFSA children table full", "=" * 26)
et = (RAW / "efsa_ar_summaries.txt").read_text()
print(et[et.find("Summary of Average Requirement (AR) for energy for children"):][:2600])
