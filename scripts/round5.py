#!/usr/bin/env python3
"""Round 5: NASEM EER equations, Antonius high-res figs, Wiley fig images, eutils books, EFSA tables."""
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


print("### NASEM EER equation table extraction ###")
x = (RAW / "nasem_ch2.html").read_text(errors="ignore")
tt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))
idxs = [m.start() for m in re.finditer(r"EER Equation \(kcal/d\)", tt)]
print("occurrences:", len(idxs))
if idxs:
    i0 = idxs[0]
    blob = tt[max(0, i0 - 500): i0 + 90000]
    (RAW / "nasem_eer_equations.txt").write_text(blob)
    print("saved blob chars:", len(blob))
    print(blob[:1800])
    print('...')
    # also count specific age-group headers
    for kw in ["0 to 2.99", "3.0 to 8.99", "9.0 to 11.99", "12.0 to 23.99", "24.0 to 35.99", "36.0 to 47.99", "1 to 3", "Estimated Energy Requirement"]:
        print(kw, "->", tt.count(kw))

print("### antonius high-res attempts (Springer) ###")
for i in [2, 3, 4, 5]:
    for ext in ["jpg", "gif"]:
        u = (f"https://media.springernature.com/full/springer-static/image/"
             f"art%3A10.1007%2Fs00431-007-0595-8/MediaObjects/431_2007_595_Fig{i}_HTML.{ext}")
        dest = FIGS / f"antonius_fig{i}_hr.{ext}"
        code, size = curl(u, dest)
        print(f"fig{i} .{ext} -> {code} {size}")
        if code == "200" and int(size) > 10000:
            try:
                from PIL import Image
                im = Image.open(dest)
                print("   dims:", im.size, im.mode)
            except Exception as e:
                print("   img err:", e)
            break

print("### wiley figure images via wayback ###")
figs = {
    "1": "40738d0a-687b-4a39-84f4-e112c693d427/ajmga64075-fig-0001-m.jpg",
    "2": "7fb7d196-f089-4023-a731-b3f6df8a9fb8/ajmga64075-fig-0002-m.jpg",
    "3": "c5168e17-ec13-44b9-8d11-5176c2259690/ajmga64075-fig-0003-m.jpg",
}
for k, path in figs.items():
    u = f"https://web.archive.org/web/2id_/https://onlinelibrary.wiley.com/cms/asset/{path}"
    dest = FIGS / f"growth2025_fig{k}_wb.jpg"
    code, size = curl(u, dest, 90)
    print(f"fig{k} -> {code} {size}")
    time.sleep(6)
    if code == "200":
        try:
            from PIL import Image
            im = Image.open(dest)
            print("   dims:", im.size, im.mode)
        except Exception as e:
            print("   img err:", e, "(head:", dest.read_bytes()[:20], ")")

print("### eutils books: GeneReviews ###")
code, size = curl("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books&term=Wolf-Hirschhorn&retmode=json", RAW / "eutils_books_search.json", 60)
print("esearch ->", code, size)
d = json.loads((RAW / "eutils_books_search.json").read_text())
ids = ((d.get("esearchresult") or {}).get("idlist") or [])
print("ids:", ids)
if ids:
    code2, size2 = curl("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=books&id=" + ",".join(ids) + "&retmode=json", RAW / "eutils_books_summary.json", 60)
    print("esummary ->", code2, size2)
    try:
        s = json.loads((RAW / "eutils_books_summary.json").read_text())
        for bid in ids:
            rec = (s.get("result") or {}).get(bid) or {}
            print("-", bid, "|", (rec.get("title") or "")[:120], "|", rec.get("pubdate"), "|", (rec.get("authors") or [{}])[0].get("name"))
    except Exception as e:
        print("summary parse err:", e)

print("### EPMC check: retired GeneReviews record ###")
q = 'TITLE:"Wolf-Hirschhorn" AND (TITLE:"RETIRED" OR SRC:NBK)'
import urllib.parse
u = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode(
    {"query": q, "format": "json", "resultType": "core", "pageSize": "10"})
code, size = curl(u, RAW / "epmc_genereviews_retired.json", 60)
print("epmc ->", code, size)
d2 = json.loads((RAW / "epmc_genereviews_retired.json").read_text())
print("hits:", d2.get("hitCount"))
for r in ((d2.get("resultList") or {}).get("result") or [])[:6]:
    print("-", r.get("source"), r.get("id"), "|", (r.get("title") or "")[:130])

print("### EFSA tables v2 ###")
t = (RAW / "efsa_energy_text.txt").read_text()
anchors = ["Summary of Average Requirement (AR) for energy for infants",
           "Summary of Average Requirement (AR) for energy for children",
           "Summary of Average Requirement (AR) for energy for adults"]
found = 0
extracts = []
for a in anchors:
    for m in re.finditer(re.escape(a), t):
        seg = t[m.start(): m.start() + 2600]
        if "...." in seg[:200]:  # skip TOC entry
            continue
        extracts.append(f"===== {a} =====\n{seg}")
        found += 1
(RAW / "efsa_ar_summaries.txt").write_text("\n\n".join(extracts))
print("extracts:", found)
for e in extracts[:2]:
    print(e[:900].replace("\n", " "))
    print("---")
