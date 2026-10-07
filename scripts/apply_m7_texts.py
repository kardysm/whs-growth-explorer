#!/usr/bin/env python3
"""Card 7 (M7): texture rule — thickeners ADD energy. New source + texts."""
import json, pathlib, sys

# --- sources.json: add starch_thickening_2026 ---
S = pathlib.Path('research/sources.json')
raw = S.read_text(encoding='utf-8')
so = json.loads(raw)
if json.dumps(so, indent=1, ensure_ascii=False) + "\n" != raw:
    print("sources FORMAT FAILED"); sys.exit(1)
assert not any(s['id'] == 'starch_thickening_2026' for s in so['sources'])
so['sources'].append({
    "id": "starch_thickening_2026",
    "category": "texture-nutrition",
    "evidence_class": "B",
    "citation": "De Smul C, Braekman J, De Wever L, Vanhoorne V, Tommelein E. Starch-based thickening in infant formula: in vitro study of behavior in the bottle and under simulated gastric conditions. Frontiers in Nutrition 2026;13:1803756.",
    "title": "Starch-based thickening in infant formula: in vitro study of behavior in the bottle and under simulated gastric conditions",
    "authors": "De Smul C, Braekman J, De Wever L, Vanhoorne V, Tommelein E",
    "journal": "Frontiers in nutrition",
    "year": 2026, "volume": 13, "issue": None, "pages": "1803756",
    "doi": "10.3389/fnut.2026.1803756", "pmid": "42039895", "pmcid": "PMC13106065",
    "url": "https://doi.org/10.3389/fnut.2026.1803756",
    "verified": True, "accessed": "2026-10-07",
    "fetched_file": "research/raw/epmc_ext_starch_thickening_2026.json",
    "notes": ("In vitro rheology study of starch-thickened infant formula; estimates the caloric contribution of added "
        "starch-based thickeners. Abstract: 'adding starch-based thickeners substantially elevates the caloric content of "
        "infant feeds.' Basis for the corrected texture rule (audit M7, D-058): thickening ADDS energy rather than lowering it."),
})
so['count'] = len(so['sources'])
S.write_text(json.dumps(so, indent=1, ensure_ascii=False) + "\n", encoding='utf-8')
print('sources.json +starch_thickening_2026; count =', so['count'])

# --- rules.json texture item ---
R = pathlib.Path('content/rules.json')
s = R.read_text(encoding='utf-8')
pairs = [
    ('"pl": "Zagęszczanie płynów zmniejsza ich kaloryczność w ml — przy diecie płynnej to kompromis; licz objętość i energię razem (kalkulator, sekcja E)."',
     '"pl": "Zagęszczanie płynów DODAJE energii, a nie ujmuje: zagęszczacze są na bazie skrobi/gum/maltodekstryny (np. Nutilis Clear ≈ 290 kcal/100 g proszku), a dodatek skrobi istotnie podnosi kaloryczność pokarmu — sprawdź etykietę swojego produktu. Przy diecie płynnej licz objętość i energię razem (kalkulator, sekcja E)."'),
    ('"en": "Thickening liquids lowers their energy per ml — a trade-off in liquid diets; count volume and energy together (calculator, section E)."',
     '"en": "Thickening liquids ADDS energy rather than removing it: thickeners are starch/gum/maltodextrin based (e.g. Nutilis Clear ≈ 290 kcal/100 g powder) and added starch substantially elevates the caloric content of feeds — check your product\'s label. In liquid diets count volume and energy together (calculator, section E)."'),
    ('"sources": [\n    "iddsi",\n    "efsa_energy"\n   ],\n   "grade": "B"',
     '"sources": [\n    "starch_thickening_2026",\n    "iddsi"\n   ],\n   "grade": "B"'),
]
for old, new in pairs:
    if old not in s:
        raise SystemExit('NOT FOUND in rules.json: ' + old[:140])
    s = s.replace(old, new, 1)
R.write_text(s, encoding='utf-8')
print('rules.json texture item updated')

# --- research-notes.md texture line ---
N = pathlib.Path('research/research-notes.md')
t = N.read_text(encoding='utf-8')
old = "- Texture modification framework for dysphagia: IDDSI 2.0 (levels 0–7; thicker liquids have lower energy density per ml — relevant to fortification). `iddsi` (A/framework)"
new = "- Texture modification framework for dysphagia: IDDSI 2.0 (levels 0–7). `iddsi` (A/framework). Thickening ADDS energy rather than lowering it (thickeners are starch/gum/maltodextrin; added starch substantially elevates the caloric content of feeds — `starch_thickening_2026`; Nutilis Clear ≈ 290 kcal/100 g) — corrected 2026-10-07 (audit M7, D-058)."
assert old in t, 'research-notes texture line not found'
N.write_text(t.replace(old, new, 1), encoding='utf-8')
print('research-notes updated')
