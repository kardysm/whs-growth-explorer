#!/usr/bin/env python3
"""Products round 3: composition regions from Nutricia catalog + Nestle pages."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw" / "products"

kt = (RAW / "nutricia_katalog_text.txt").read_text(errors="ignore")
flat = re.sub(r"\s+", " ", kt)

print("### catalog checks ###")
for kw in ["Fortini", "Infatrini", "Nutrini", "Fresubin", "Frebini", "Resource", "PediaSure", "NAN ", "MCT"]:
    print(f"{kw!r}: {len(re.findall(kw, kt))} hits")

print("\n### FANTOMALT region ###")
i = flat.find("FANTOMAL")
print(flat[i: i + 1500] if i >= 0 else "not found")

print("\n### PROTIFAR region ###")
i = flat.find("PROTIFAR ")
if i < 0:
    i = flat.find("PROTIFAR")
print(flat[i: i + 1500] if i >= 0 else "not found")

print("\n### Nestle Resource Junior (plyn) nutrition ###")
x = (RAW / "nestle_rj_plyn.html").read_text(errors="ignore")
t = re.sub(r"<[^>]+>", " ", x)
t = re.sub(r"\s+", " ", t)
for kw in ["Wartość odżywcza", "100 ml", "białko", "Białko"]:
    j = t.find(kw)
    if j >= 0:
        print(f"-- {kw}:", t[max(0, j - 150): j + 450])
        break

print("\n### Nestle Resource Junior (proszek) nutrition ###")
x = (RAW / "nestle_rj_proszek.html").read_text(errors="ignore")
t = re.sub(r"<[^>]+>", " ", x)
t = re.sub(r"\s+", " ", t)
for kw in ["Wartość odżywcza", "100 g", "białko", "Białko"]:
    j = t.find(kw)
    if j >= 0:
        print(f"-- {kw}:", t[max(0, j - 150): j + 450])
        break
