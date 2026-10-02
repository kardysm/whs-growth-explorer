#!/usr/bin/env python3
"""Products round 2: Nutricia catalog PDF + Nestle Resource Junior pages."""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw" / "products"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest):
    subprocess.run(["curl", "-sSL", "--max-time", "120", "-A", UA, "-o", str(dest), url], check=False)
    print(dest.name, dest.stat().st_size if dest.exists() else "MISSING")


curl("https://akademianutricia.pl/e-learning-files/Katalog-Nutricia-2023.pdf", RAW / "nutricia_katalog_2023.pdf")
curl("https://www.nestlehealthscience.pl/produkty/resource-junior/resource-junior-plyn", RAW / "nestle_rj_plyn.html")
curl("https://www.nestlehealthscience.pl/produkty/resource-junior/resource-junior-400g", RAW / "nestle_rj_proszek.html")

kp = RAW / "nutricia_katalog_2023.pdf"
if kp.exists() and kp.stat().st_size > 100_000:
    from pypdf import PdfReader
    r = PdfReader(str(kp))
    txt = "\n".join((p.extract_text() or "") for p in r.pages)
    (RAW / "nutricia_katalog_text.txt").write_text(txt)
    print("katalog pages:", len(r.pages), "chars:", len(txt))
    for kw in ["Fortini", "Fantomalt", "Protifar"]:
        hits = list(re.finditer(kw, txt))
        print(f"== {kw}: {len(hits)} hits")
        for m in hits[:3]:
            print("   ::", re.sub(r"\s+", " ", txt[max(0, m.start() - 100): m.start() + 260]))

for f in ["nestle_rj_plyn.html", "nestle_rj_proszek.html"]:
    p = RAW / f
    if not p.exists():
        continue
    x = p.read_text(errors="ignore")
    t = re.sub(r"<[^>]+>", " ", x)
    t = re.sub(r"\s+", " ", t)
    print("==", f, "kcal?", "kcal" in t.lower(), "| kJ?", "kJ" in t, "| text len", len(t))
    imgs = re.findall(r'src="([^"]*(?:odzyw|nutri|sklad|tabel|wartos)[^"]*)"', x, re.I)
    print("   imgs:", imgs[:6])
    i = t.lower().find("kcal")
    if i >= 0:
        print("   ctx:", t[max(0, i - 200): i + 200])
