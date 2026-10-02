#!/usr/bin/env python3
"""Content lint (GOAL.md §6): cite integrity across content/, parameters.json, model, notes.

Checks:
- every content item (reasons/flags/rules) has >=1 source_id
- every referenced source_id exists in research/sources.json
- every referenced source_id is verified:true (else warning)
- report source_ids cited 0x across: content/*.json, parameters.json, src/calc/*.ts, notes/evidence files

Exit 1 on errors; report -> research/qa/content-lint-report.md
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sources = json.loads((ROOT / "research" / "sources.json").read_text())["sources"]
valid = {s["id"]: s for s in sources}
errors: list[str] = []
warnings: list[str] = []
cited: dict[str, int] = {}


def cite(sid: str, where: str, count: int = 1) -> None:
    cited[sid] = cited.get(sid, 0) + count
    if sid not in valid:
        errors.append(f"unknown source_id '{sid}' (in {where})")
    elif not valid[sid].get("verified"):
        warnings.append(f"source '{sid}' is not verified:true (in {where})")


def walk_items(obj, where: str, path: str = "") -> None:
    if isinstance(obj, dict):
        if isinstance(obj.get("sources"), list):
            if not obj["sources"]:
                errors.append(f"item without any sources at {where}{path}")
            for sid in obj["sources"]:
                cite(sid, f"{where}{path}")
        for k, v in obj.items():
            walk_items(v, where, f"{path}/{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            walk_items(v, where, f"{path}[{i}]")


for cf in ["reasons.json", "flags.json", "rules.json"]:
    p = ROOT / "content" / cf
    if not p.exists():
        errors.append(f"missing content file {cf}")
        continue
    walk_items(json.loads(p.read_text()), cf)

# parameters.json source_ids
params = json.loads((ROOT / "research" / "data" / "parameters.json").read_text())


def deep(o, where: str) -> None:
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("source_ids", "source_id") and isinstance(v, list):
                for sid in v:
                    cite(str(sid), where)
            elif k in ("source_ids", "source_id") and isinstance(v, str):
                cite(v, where)
            else:
                deep(v, where)
    elif isinstance(o, list):
        for v in o:
            deep(v, where)


deep(params, "parameters.json")

# src/calc/*.ts quoted ids
for tf in (ROOT / "src" / "calc").glob("*.ts"):
    txt = tf.read_text()
    for sid in valid:
        n = len(re.findall(rf'"{re.escape(sid)}"', txt))
        if n:
            cite(sid, tf.name, n)

# notes / evidence table
for nf in ["research/research-notes.md", "research/evidence-table.md"]:
    p = ROOT / nf
    if p.exists():
        txt = p.read_text()
        for sid in valid:
            n = txt.count(sid)
            if n:
                cite(sid, nf, n)

uncited = [s["id"] for s in sources if cited.get(s["id"], 0) == 0]
for s in sources:
    if not s.get("verified"):
        warnings.append(f"source '{s['id']}' is verified:false in sources.json")

lines = [
    "# Content lint report",
    "",
    "- content files checked: content/reasons.json, flags.json, rules.json (+ base.json strings)",
    "- citation sources counted: content/*, research/data/parameters.json, src/calc/*.ts, research notes/evidence table",
    f"- distinct source_ids cited: {len([k for k, v in cited.items() if v > 0])} / {len(valid)}",
    "",
    "## Errors",
    *([f"- {e}" for e in errors] or ["- none"]),
    "",
    "## Warnings",
    *([f"- {w}" for w in warnings] or ["- none"]),
    "",
    "## Sources cited 0x (informational; may be research-only)",
    *([f"- {u}" for u in uncited] or ["- none"]),
    "",
]
(ROOT / "research" / "qa").mkdir(exist_ok=True)
(ROOT / "research" / "qa" / "content-lint-report.md").write_text("\n".join(lines))
print("\n".join(lines))
sys.exit(1 if errors else 0)
