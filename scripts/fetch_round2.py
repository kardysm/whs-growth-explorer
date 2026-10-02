#!/usr/bin/env python3
"""Round 2 fetches: Wayback retries, NASEM Bookshelf, FAO chapters, page parses.

All fetches via curl (-sSL, browser UA). Outputs under research/raw/.
"""
import json
import pathlib
import re
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest, max_time=120):
    p = subprocess.run(
        ["curl", "-sSL", "--max-time", str(max_time), "-A", UA,
         "-o", str(dest), "-w", "%{http_code}|%{size_download}", url],
        capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    code = parts[0] if parts else "0"
    size = parts[1] if len(parts) > 1 else "0"
    return code, size


def head_bytes(path, n=14):
    b = pathlib.Path(path).read_bytes()
    return len(b), b[:n]


print("### wayback retries (with redirects) ###")
todo = [
    ("research/raw/wb_efsa_3005.pdf",
     "https://web.archive.org/web/2id_/https://www.efsa.europa.eu/sites/default/files/scientific_output/files/main_documents/3005.pdf"),
    ("research/raw/wb_wiley_64075.pdf",
     "https://web.archive.org/web/2id_/https://onlinelibrary.wiley.com/doi/pdf/10.1002/ajmg.a.64075"),
    ("research/raw/wb_wiley_64075_full.html",
     "https://web.archive.org/web/2id_/https://onlinelibrary.wiley.com/doi/full/10.1002/ajmg.a.64075"),
    ("research/raw/wb_orpha280.html",
     "https://web.archive.org/web/2id_/https://www.orpha.net/en/disease/detail/280"),
    ("research/raw/wb_nasem_26818.html",
     "https://web.archive.org/web/2id_/https://www.nationalacademies.org/publications/26818"),
]
for dest, url in todo:
    code, size = curl(url, ROOT / dest)
    print(dest, "->", code, size)
    time.sleep(10)
    p = ROOT / dest
    if p.exists() and p.stat().st_size > 500:
        print("   head:", head_bytes(p)[1])

print("### NASEM bookshelf ###")
code, size = curl("https://www.ncbi.nlm.nih.gov/books/NBK588659/",
                  RAW / "url_nasem_dri_energy_bookshelf.html")
print("bookshelf ->", code, size)
x = (RAW / "url_nasem_dri_energy_bookshelf.html").read_text(errors="ignore")
m = re.search(r"<title>(.*?)</title>", x, re.S)
print("title:", m.group(1).strip() if m else None)
links = sorted(set(re.findall(r'href="(/books/NBK588659/[^"#]+)"', x)))
print("chapter link count:", len(links))
for l in links[:24]:
    print("   ", l)

print("### FAO chapters ###")
for c in ["02", "03", "04", "05", "06", "07", "08", "09", "0a"]:
    dest = RAW / f"fao_y5686e{c}.htm"
    code, size = curl(f"https://www.fao.org/3/y5686e/y5686e{c}.htm", dest, max_time=60)
    print(f"ch{c} ->", code, size)
    time.sleep(1)
for c in ["02", "03", "04", "05", "06", "07", "08", "09", "0a"]:
    p = RAW / f"fao_y5686e{c}.htm"
    if not p.exists():
        continue
    x = p.read_text(errors="ignore")
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip()
    print(c, "::", t[:150])

print("### gene reviews parse ###")
x = (RAW / "url_gene_reviews").read_text(errors="ignore")
print("has Wolf-Hirschhorn:", "Wolf-Hirschhorn" in x)
print("has 'retired' ci:", "retired" in x.lower())
t = re.sub(r"<script.*?</script>", " ", x, flags=re.S | re.I)
t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t)).strip()
print("text head:", t[:350])
