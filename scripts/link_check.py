#!/usr/bin/env python3
"""Link check for research/sources.json (GOAL.md §6).

One canonical target per source (url field; else doi.org/<doi>; else PubMed).
Classifies results: ok / blocked-expected (Wayback route documented) /
blocked-informational (publisher bot-wall or paywall) / investigate.

Report -> research/qa/link-check-report.md
"""
import json
import pathlib
import subprocess
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
sources = json.loads((ROOT / "research" / "sources.json").read_text())["sources"]
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
TIME_BUDGET = 420  # seconds


def target_for(s: dict) -> str | None:
    if s.get("url"):
        return s["url"]
    if s.get("doi"):
        return "https://doi.org/" + s["doi"]
    if s.get("pmid"):
        return f"https://pubmed.ncbi.nlm.nih.gov/{s['pmid']}/"
    return None


def check(url: str) -> tuple[str, str]:
    p = subprocess.run(
        ["curl", "-sS", "-L", "--max-time", "20", "-A", UA, "-o", "/dev/null",
         "-w", "%{http_code} %{url_effective}", url],
        capture_output=True, text=True)
    out = (p.stdout or "").strip()
    parts = out.split(" ", 1)
    code = parts[0] if parts else "000"
    eff = parts[1] if len(parts) > 1 else ""
    if p.returncode != 0 and code == "000":
        return "000", eff or "(transport error)"
    return code, eff


rows = []
start = time.time()
for s in sources:
    url = target_for(s)
    if url is None:
        rows.append((s["id"], "-", "-", "no link recorded"))
        continue
    if time.time() - start > TIME_BUDGET:
        rows.append((s["id"], url, "-", "skipped (time budget)"))
        continue
    code, eff = check(url)
    notes = s.get("notes") or ""
    if code.startswith(("2", "3")):
        verdict = "ok"
    elif code in ("403", "429"):
        verdict = ("blocked-expected (Wayback route documented)" if "Wayback" in notes
                   else "blocked-informational (publisher bot-wall/paywall)")
    elif code == "404":
        verdict = "INVESTIGATE (404)"
    else:
        verdict = f"INVESTIGATE ({code})"
    rows.append((s["id"], url, code, verdict))
    time.sleep(0.4)

lines = ["# Link check report (research/sources.json)", "",
         f"Checked {len(rows)} entries; one canonical target per source.",
         "Note: publisher bot-walls (403/429) are common for DOI landing pages when fetched by tools;",
         "sources whose content was originally retrieved via Wayback are marked accordingly.", "",
         "| id | target | http | verdict |", "|---|---|---|---|"]
lines += [f"| {a} | {b} | {c} | {d} |" for (a, b, c, d) in rows]
investigate = [r for r in rows if str(r[3]).startswith("INVESTIGATE")]
lines += ["", f"Total: {len(rows)}; investigate: {len(investigate)}"]
(ROOT / "research" / "qa" / "link-check-report.md").write_text("\n".join(lines))
print(f"total={len(rows)} investigate={len(investigate)}")
for r in investigate:
    print("INVESTIGATE:", r[0], r[1], r[2], r[3])
print("report: research/qa/link-check-report.md")
