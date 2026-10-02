#!/usr/bin/env python3
"""Round 4b: NASEM chapters (fixed names), NBK1183 CDX, EFSA AR extraction, fig dims."""
import json
import pathlib
import re
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
FIGS = RAW / "figs"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest, max_time=90):
    p = subprocess.run(["curl", "-sSL", "--max-time", str(max_time), "-A", UA,
                        "-o", str(dest), "-w", "%{http_code}|%{size_download}", url],
                       capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    return parts[0] if parts else "0", parts[1] if len(parts) > 1 else "0"


print("### NASEM TOC parse ###")
x = (RAW / "wb_nasem_26818.html").read_text(errors="ignore")
toc = re.findall(r'href="([^"]*?/read/26818/[^"]*?)"[^>]*>(.*?)<', x, re.S)
seen = []
for href, label in toc:
    lab = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", label)).strip()
    key = (href, lab)
    if lab and key not in seen:
        seen.append(key)
print("toc entries:", len(seen))
for href, lab in seen[:45]:
    print("-", lab[:100], "|", href[-70:])

print("### NASEM chapters fetch ###")
ok_chapters = []
for n in range(1, 15):
    dest = RAW / f"nasem_ch{n}.html"
    code, size = curl(f"https://web.archive.org/web/2id_/https://www.nationalacademies.org/read/26818/chapter/{n}", dest)
    print(f"ch{n} -> {code} {size}")
    if code != "200" or int(size) < 3000:
        break
    t = dest.read_text(errors="ignore")
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    print("   ", (m.group(1).strip()[:110] if m else "no title"))
    if "Just a moment" in t[:3000]:
        print("   (CF challenge page)")
    ok_chapters.append(n)
    time.sleep(8)

print("### grep EER equations in chapters ###")
for n in ok_chapters:
    t = (RAW / f"nasem_ch{n}.html").read_text(errors="ignore")
    tt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))
    for kw in ["Estimated Energy Requirement", "EER =", "kcal/kg"]:
        c = tt.count(kw)
        if c:
            i = tt.find(kw)
            print(f"ch{n} [{kw} x{c}]:", tt[max(0, i - 60):i + 140])

print("### NBK1183 CDX ###")
code, size = curl("https://web.archive.org/cdx/search/cdx?url=ncbi.nlm.nih.gov/books/NBK1183*&output=json&limit=40",
                  RAW / "nbk1183_cdx.json", 60)
print("cdx ->", code, size)
try:
    rows = json.loads((RAW / "nbk1183_cdx.json").read_text())
    for row in rows[:10]:
        print("   ", row)
    if len(rows) > 1:
        stamp, orig = rows[1][1], rows[1][2]
        snap = f"https://web.archive.org/web/{stamp}id_/{orig}"
        code2, size2 = curl(snap, RAW / "wb_nbk1183.html")
        print("snapshot fetch:", snap, "->", code2, size2)
except Exception as e:
    print("cdx parse err:", e)

print("### EFSA AR summary extraction ###")
t = (RAW / "efsa_energy_text.txt").read_text()
outs = []
for m in re.finditer(r"Summary of Average Requirement \(AR\) for energy", t):
    outs.append(t[m.start(): m.start() + 1400])
(RAW / "efsa_ar_summaries.txt").write_text("\n\n=====\n\n".join(outs))
print("summaries found:", len(outs))
if outs:
    print(outs[0][:600].replace("\n", " "))

print("### wiley html figure urls ###")
h = (RAW / "wb_wiley_64075_full.html").read_text(errors="ignore")
imgs = re.findall(r'(?:src|data-src)="([^"]*?(?:fig|Fig|image|asset|amjg)[^"]*?)"', h)[:20]
for u in sorted(set(imgs)):
    print("-", u[:180])

print("### antonius figs dims ###")
from PIL import Image
for i in [2, 3, 4, 5]:
    im = Image.open(FIGS / f"antonius_fig{i}.jpg")
    print(f"antonius_fig{i}:", im.size, im.mode)
