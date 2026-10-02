#!/usr/bin/env python3
"""Fetch USDA FoodData Central bulk CSV datasets (fallback composition source, non-PL -> flagged).

Downloads Foundation Foods + SR Legacy CSV archives into research/raw/fdc/ and unzips them.
"""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw" / "fdc"
RAW.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"

page = RAW / "download_page.html"
subprocess.run(["curl", "-sSL", "--max-time", "60", "-A", UA, "-o", str(page),
                "https://fdc.nal.usda.gov/download-datasets.html"], check=False)
x = page.read_text(errors="ignore") if page.exists() else ""
links = sorted(set(re.findall(r'href="([^"]+\.zip)"', x)) | set(re.findall(r'(https?://[^"\']+fdc-datasets[^"\']+\.zip)', x)))
links = [(l if l.startswith("http") else "https://fdc.nal.usda.gov/" + l.lstrip("/")) for l in links]
print("zip links found:", len(links))
for l in links[:12]:
    print(" -", l)

wanted = []
for l in links:
    low = l.lower()
    if "foundation" in low and "csv" in low:
        wanted.append(("foundation", l))
    elif "sr_legacy" in low and "csv" in low:
        wanted.append(("sr_legacy", l))

for tag, url in wanted:
    dest = RAW / (tag + ".zip")
    print("downloading", tag, "...")
    subprocess.run(["curl", "-sSL", "--max-time", "600", "-A", UA, "-o", str(dest), url], check=False)
    size = dest.stat().st_size if dest.exists() else 0
    print(tag, "size:", size)
    if size > 100_000:
        import zipfile
        try:
            with zipfile.ZipFile(dest) as zf:
                zf.extractall(RAW / tag)
            names = [p.name for p in (RAW / tag).iterdir()][:10]
            print(tag, "unzipped:", names)
        except Exception as e:
            print(tag, "unzip-failed:", e)

print("DONE")
