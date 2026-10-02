#!/usr/bin/env python3
"""Round 4: EFSA text, 2025 figure rendering, NASEM chapters, NBK1183 CDX, figure dims."""
import json
import pathlib
import re
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
FIGS = RAW / "figs"
FIGS.mkdir(exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest, max_time=120):
    p = subprocess.run(["curl", "-sSL", "--max-time", str(max_time), "-A", UA,
                        "-o", str(dest), "-w", "%{http_code}|%{size_download}", url],
                       capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    return parts[0] if parts else "0", parts[1] if len(parts) > 1 else "0"


print("### EFSA energy opinion text ###")
from pypdf import PdfReader
r = PdfReader(str(RAW / "wb_efsa_wiley.pdf"))
txt = "\n".join((pg.extract_text() or "") for pg in r.pages)
(RAW / "efsa_energy_text.txt").write_text(txt)
print("pages:", len(r.pages), "| chars:", len(txt))
for kw in ["Average Requirement", "kcal/kg", "children", "infants"]:
    print(kw, "->", len(re.findall(kw, txt, re.I)))
# print contexts around 'kcal/kg'
for m in list(re.finditer(r"kcal/kg", txt))[:8]:
    s = max(0, m.start() - 120)
    print("...", txt[s:m.start() + 180].replace("\n", " "))

print("### render 2025 paper pages ###")
import fitz
doc = fitz.open(str(RAW / "wb_wiley_64075.pdf"))
for i in range(len(doc)):
    pix = doc[i].get_pixmap(dpi=220)
    out = FIGS / f"growth2025_page{i+1}.png"
    pix.save(str(out))
    print(config_in := f"page{i+1}", pix.width, "x", pix.height, "->", out.name)
t = (RAW / "growth2025_text.txt").read_text()
for kw in ["FIGURE 1", "FIGURE 2", "FIGURE 3", "TABLE "]:
    i = t.find(kw)
    if i >= 0:
        print("--", kw, "context:", t[i:i + 260].replace("\n", " "))

print("### NASEM TOC parse ###")
x = (RAW / "wb_nasem_26818.plain.html").read_text(errors="ignore")
toc = re.findall(r'href="([^"]*?/read/26818/[^"]*?)"[^>]*>(.*?)<', x, re.S)
seen = []
for href, label in toc:
    lab = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", label)).strip()
    key = (href, lab)
    if lab and key not in seen and len(seen) < 40:
        seen.append(key)
for href, lab in seen[:40]:
    print("-", lab[:90], "|", href[-60:])

print("### NASEM chapters fetch ###")
for n in range(1, 15):
    dest = RAW / f"nasem_ch{n}.html"
    code, size = curl(f"https://web.archive.org/web/2id_/https://www.nationalacademies.org/read/26818/chapter/{n}", dest, 90)
    print(f"ch{n} -> {code} {size}")
    if code != "200" or int(size) < 3000:
        break
    time.sleep(8)
    t = dest.read_text(errors="ignore")
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    print("   ", (m.group(1).strip()[:110] if m else "no title"))

print("### NBK1183 CDX ###")
code, size = curl("https://web.archive.org/cdx/search/cdx?url=ncbi.nlm.nih.gov/books/NBK1183*&output=json&limit=30", RAW / "nbk1183_cdx.json", 60)
print("cdx ->", code, size)
try:
    rows = json.loads((RAW / "nbk1183_cdx.json").read_text())
    for row in rows[:12]:
        print("   ", row)
except Exception as e:
    print("cdx parse err:", e)

print("### antonius figs dims ###")
from PIL import Image
for i in [2, 3, 4, 5]:
    im = Image.open(FIGS / f"antonius_fig{i}.jpg")
    print(f"antonius_fig{i}:", im.size, im.mode)
