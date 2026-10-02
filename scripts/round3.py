#!/usr/bin/env python3
"""Round 3: decompress wayback snapshots, extract 2025-paper text, FAO/EFSA/NBK probes."""
import gzip
import pathlib
import re
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest, max_time=120):
    p = subprocess.run(["curl", "-sSL", "--max-time", str(max_time), "-A", UA,
                        "-o", str(dest), "-w", "%{http_code}|%{size_download}", url],
                       capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    return parts[0] if parts else "0", parts[1] if len(parts) > 1 else "0"


def maybe_gunzip(path):
    p = pathlib.Path(path)
    b = p.read_bytes()
    if b[:2] == b"\x1f\x8b":
        data = gzip.decompress(b)
        p.write_bytes(data)
        return len(data), True
    return len(b), False


print("### decompress ###")
for f in ["wb_wiley_64075_full.html", "wb_orpha280.html", "wb_nasem_26818.html",
          "wb_wiley_64075.pdf"]:
    n, gz = maybe_gunzip(RAW / f)
    print(f, "->", n, "gunzipped" if gz else "as-is")
for f in ["wb_wiley_64075_full.html", "wb_orpha280.html", "wb_nasem_26818.html"]:
    x = (RAW / f).read_text(errors="ignore")
    m = re.search(r"<title>(.*?)</title>", x, re.S | re.I)
    print("--", f, "| title:", (m.group(1).strip()[:150] if m else None))

print("### efsa wb inline check ###")
x = (RAW / "wb_efsa_3005.pdf").read_text(errors="ignore")
t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip()
print("len:", len(x), "| text:", t[:250])

print("### wayback set B ###")
probes = [
    ("research/raw/wb_efsa_pub.html",
     "https://web.archive.org/web/2id_/https://www.efsa.europa.eu/en/efsajournal/pub/3005"),
    ("research/raw/wb_efsa_wiley.pdf",
     "https://web.archive.org/web/2id_/https://efsa.onlinelibrary.wiley.com/doi/pdf/10.2903/j.efsa.2013.3005"),
    ("research/raw/wb_nbk1183.html",
     "https://web.archive.org/web/2id_/https://www.ncbi.nlm.nih.gov/books/NBK1183/"),
]
for dest, url in probes:
    code, size = curl(url, ROOT / dest)
    print(dest, "->", code, size)
    time.sleep(10)
    p = ROOT / dest
    if p.exists():
        n, gz = maybe_gunzip(p)
        b = p.read_bytes()
        print("   ", n, "gz" if gz else "", b[:14])

print("### wiley 2025 pdf text ###")
from pypdf import PdfReader
r = PdfReader(str(RAW / "wb_wiley_64075.pdf"))
txt = "\n".join((pg.extract_text() or "") for pg in r.pages)
(RAW / "growth2025_text.txt").write_text(txt)
print("pages:", len(r.pages), "| chars:", len(txt))
print("head:", txt[:600].replace("\n", " "))
for kw in ["Supporting Information", "FIGURE S", "Table S1", "TABLE ", "FIGURE "]:
    print(kw, "->", txt.count(kw))

print("### FAO extra chapters ###")
for c in ["0b", "0c", "0d", "0e"]:
    code, size = curl(f"https://www.fao.org/3/y5686e/y5686e{c}.htm", RAW / f"fao_y5686e{c}.htm", 60)
    print(f"ch{c} ->", code, size)
    time.sleep(1)
for c in ["0b", "0c", "0d", "0e"]:
    p = RAW / f"fao_y5686e{c}.htm"
    if p.exists() and p.stat().st_size > 2000:
        x = p.read_text(errors="ignore")
        t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip()
        print(c, "::", t[:150])

print("### catch-up / Schofield across FAO files ###")
files = sorted(RAW.glob("fao_y5686e*.htm"))
for p in files:
    x = p.read_text(errors="ignore")
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))
    for kw in ["catch-up", "catch up", "Schofield"]:
        n = t.lower().count(kw.lower())
        if n:
            i = t.lower().find(kw.lower())
            print(f"{p.name} [{kw} x{n}]:", t[max(0, i - 80):i + 120])
