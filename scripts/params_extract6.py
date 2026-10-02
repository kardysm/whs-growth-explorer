#!/usr/bin/env python3
"""Sixth pass: Krick factors (PMC2735385 direct), PZH tables hunt, NICE thresholds, vit D doses, abstracts."""
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


print("### PMC2735385 direct fetch (Krick factors hunt) ###")
dest = RAW / "pmc2735385.html"
subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest),
                "https://pmc.ncbi.nlm.nih.gov/articles/PMC2735385/"])
t = strip_html(dest.read_text(errors="ignore"))
print("chars:", len(t))
for pat in ["Krick", r"muscle tone", r"0\.9", r"1\.1\b", r"1\.15", r"1\.25", r"1\.3\b", "activity factor", "tone factor"]:
    for m in list(re.finditer(pat, t))[:4]:
        seg = t[max(0, m.start() - 220):m.start() + 280]
        if re.search(r"(tone|factor|activity|grow|kcal|energy|Krick)", seg, re.I):
            print(f"[{pat}]", seg.replace("\n", " ")[:460], "\n")

print("### feeding_intolerance refs 38/39 ###")
t2 = strip_html((RAW / "fulltext_feeding_intolerance_2017.xml").read_text(errors="ignore"))
for m in re.finditer(r"(3[89])\.\s.{0,260}", t2):
    print(">>", m.group(0)[:300], "\n")

print("### PZH: counts by case ###")
zt = (RAW / "pzh_normy_text.txt").read_text()
for kw in ["Żelazo", "żelaza", "Cynk", "cynku", "Witamina D", "witaminy D", "witaminę D", "Normy na żelazo", "RDA", "EAR"]:
    print(kw, "->", len(re.findall(re.escape(kw), zt)))

print("### PZH: 'dla dzieci' iron/zinc/vitD statements ###")
for kw in ["żelaza", "cynku", "witaminy D"]:
    c = 0
    for m in re.finditer(kw, zt):
        seg = zt[max(0, m.start() - 150):m.start() + 320]
        if re.search(r"(dzieci|niemowl|chłop|dziewcz|lat|miesiąc)", seg, re.I) and re.search(r"\d+\s*(mg|µg)", seg):
            print(kw, ">>", seg.replace("\n", " ")[:430], "\n")
            c += 1
        if c >= 5:
            break

print("### NICE NG75 thresholds ###")
n = strip_html((RAW / "url_nice_ng75_recommendations.html").read_text(errors="ignore"))
for kw in ["centile", "weight loss", "crossing", "faltered", "length", "head circumference"]:
    c = 0
    for m in re.finditer(kw, n, re.I):
        seg = n[max(0, m.start() - 180):m.start() + 300]
        if re.search(r"\d", seg):
            print(f"[{kw}]", seg.replace("\n", " ")[:420], "\n")
            c += 1
        if c >= 3:
            break

print("### pludowski fulltext: vit D doses ###")
dest = RAW / "fulltext_pludowski2023.xml"
if not dest.exists() or dest.stat().st_size < 2000:
    subprocess.run(["curl", "-sSL", "--max-time", "90", "-A", UA, "-o", str(dest),
                    "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC9920487/fullTextXML"])
p = strip_html(dest.read_text(errors="ignore"))
print("chars:", len(p))
c = 0
for m in re.finditer(r"(400|600|1000|2000|4000)\s*(IU|units|j\.m\.)", p):
    seg = p[max(0, m.start() - 180):m.start() + 220]
    print(">>", seg.replace("\n", " ")[:380], "\n")
    c += 1
    if c >= 10:
        break

print("### abstracts: da_silva + faltering_2026 ###")
for f in ["epmc_da_silva2020.json", "epmc_ext_faltering_2026.json", "epmc_ext_ni_nutrition_2025.json"]:
    d = json.loads((RAW / f).read_text())
    for r in ((d.get("resultList") or {}).get("result") or [])[:1]:
        print("###", f, "|", (r.get("title") or "")[:90])
        print((r.get("abstractText") or "NO ABSTRACT")[:1400].replace("\n", " "), "\n")
