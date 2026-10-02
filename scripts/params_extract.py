#!/usr/bin/env python3
"""Extract parameter-relevant passages from fetched sources (for parameters.json curation)."""
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


def ctx(text, kw, n=4, span=380, ci=True):
    out = []
    for m in list(re.finditer(re.escape(kw), text, re.I if ci else 0))[:n]:
        s = max(0, m.start() - span // 3)
        out.append(text[s:m.start() + span].replace("\n", " "))
    return out


print("=" * 30, "FAO ch06 (children) catch-up & BMR", "=" * 30)
x = strip_html((RAW / "fao_y5686e06.htm").read_text(errors="ignore"))
for c in ctx(x, "catch-up", 6, 500):
    print(">>", c, "\n")
for c in ctx(x, "Schofield", 3, 500):
    print(">>", c, "\n")

print("=" * 30, "FAO ch05 (infants) 3.5 catch-up growth", "=" * 30)
x5 = strip_html((RAW / "fao_y5686e05.htm").read_text(errors="ignore"))
i = x5.lower().find("catch-up growth")
print(x5[max(0, i - 200):i + 2200], "\n")

print("=" * 30, "FAO ch0e annexes: BMR equations", "=" * 30)
xe = strip_html((RAW / "fao_y5686e0e.htm").read_text(errors="ignore"))
for c in ctx(xe, "equation", 6, 420):
    print(">>", c, "\n")
print("== kcal/g across FAO ==")
for f in sorted(RAW.glob("fao_y5686e*.htm")):
    t = strip_html(f.read_text(errors="ignore"))
    for c in ctx(t, "kcal/g", 2, 320):
        print(f.name, ">>", c, "\n")

print("=" * 30, "TRS935 protein (pdf text)", "=" * 30)
from pypdf import PdfReader
pr = PdfReader(str(RAW / "url_who_protein2007_full.pdf"))
ptxt = "\n".join((pg.extract_text() or "") for pg in pr.pages)
(RAW / "protein_trs935_text.txt").write_text(ptxt)
print("pages:", len(pr.pages), "chars:", len(ptxt))
for c in ctx(ptxt, "catch-up", 5, 420):
    print(">>", c, "\n")
for c in ctx(ptxt, "g protein per kg", 4, 380):
    print(">>", c, "\n")

print("=" * 30, "PZH Normy 2024 (pdf text)", "=" * 30)
pz = PdfReader(str(RAW / "url_pzh_normy_pdf.pdf"))
ztxt = "\n".join((pg.extract_text() or "") for pg in pz.pages)
(RAW / "pzh_normy_text.txt").write_text(ztxt)
print("pages:", len(pz.pages), "chars:", len(ztxt))
for kw in ["energia", "białko", "żelazo", "cynk", "witamina D"]:
    for c in ctx(ztxt, kw, 2, 420):
        print(kw, ">>", c[:400], "\n")

print("=" * 30, "MDPI refeeding children — full text via EPMC", "=" * 30)
d = json.loads((RAW / "epmc_ext_refeeding_children_2025.json").read_text())
r = (((d.get("resultList") or {}).get("result") or []) or [{}])[0]
pmcid = r.get("pmcid")
print("pmcid:", pmcid)
if pmcid:
    dest = RAW / "fulltext_refeeding_children_2025.xml"
    subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest),
                    f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML"])
    t = strip_html(dest.read_text(errors="ignore"))
    print("chars:", len(t))
    for kw in ["risk", "kcal", "phosphate", "threshold", "SGA"]:
        for c in ctx(t, kw, 2, 300):
            print(kw, ">>", c[:300], "\n")

print("=" * 30, "borsani fulltext: Krick + kcal/cm", "=" * 30)
t = strip_html((RAW / "fulltext_borsani2023.xml").read_text(errors="ignore"))
for kw in ["Krick", "kcal/cm", "Culley", "tone"]:
    for c in ctx(t, kw, 3, 320):
        print(kw, ">>", c[:330], "\n")
