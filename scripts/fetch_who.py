#!/usr/bin/env python3
"""Fetch WHO Child Growth Standards expanded tables (wfa, lhfa, wfl/wfh) and store raw."""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
OUT = ROOT / "research" / "data" / "who_lms"
OUT.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"


def curl(url, dest, max_time=120):
    p = subprocess.run(["curl", "-sSL", "--max-time", str(max_time), "-A", UA,
                        "-o", str(dest), "-w", "%{http_code}|%{size_download}", url],
                       capture_output=True, text=True)
    parts = (p.stdout or "").strip().split("|")
    return parts[0] if parts else "0", parts[1] if len(parts) > 1 else "0"


pages = {
    "wfa": "https://www.who.int/tools/child-growth-standards/standards/weight-for-age",
    "lhfa": "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age",
    "wflh": "https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height",
}
all_links = {}
for tag, url in pages.items():
    dest = RAW / f"who_page_{tag}.html"
    code, size = curl(url, dest)
    print(tag, "page ->", code, size)
    x = dest.read_text(errors="ignore")
    links = re.findall(r'href="(https://cdn\.who\.int/[^"]+\.(?:txt|xlsx))"', x)
    links += re.findall(r'href="(/[^"]+\.(?:txt|xlsx))"', x)
    links = sorted(set(links))
    all_links[tag] = links
    for l in links:
        print("   ", l)

print("### download zscore txts ###")
for tag, links in all_links.items():
    for l in links:
        u = l if l.startswith("http") else ("https://www.who.int" + l)
        name = u.rsplit("/", 1)[-1]
        if not name.endswith(".txt"):
            continue
        if "zscore" not in name.lower() and "percentile" not in name.lower():
            continue
        dest = OUT / "raw" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        code, size = curl(u, dest)
        print(tag, name, "->", code, size)
        if code == "200" and dest.exists() and dest.stat().st_size > 1000:
            txt = dest.read_text(errors="ignore")
            print("   head:", txt[:220].replace("\n", " | "))
