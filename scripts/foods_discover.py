#!/usr/bin/env python3
"""Foods discovery: find best FDC (SR Legacy) descriptions for our everyday-food list."""
import csv
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = ROOT / "research" / "raw" / "fdc" / "sr_legacy" / "FoodData_Central_sr_legacy_food_csv_2018-04"

files = sorted(p.name for p in SR.iterdir())
print("SR files:", files[:20])

foods = {}
with (SR / "food.csv").open(newline="", encoding="utf8", errors="ignore") as f:
    for row in csv.DictReader(f):
        foods[row["fdc_id"]] = row["description"]

KEYS = [
    ("rapeseed oil", "rapeseed"), ("olive oil", "olive"), ("butter", "butter, salted"),
    ("ghee", "clarified"), ("cream 30%", "cream, heavy"), ("twarog", "cottage"),
    ("greek yogurt", "greek"), ("egg", "egg, whole"), ("avocado", "avocado"),
    ("banana", "banana"), ("semolina", "semolina"), ("millet", "millet"),
    ("oats", "oats"), ("potato", "potato"), ("sweet potato", "sweet potato"),
    ("salmon", "salmon"), ("mackerel", "mackerel"), ("lentils", "lentils"),
    ("flaxseed", "flaxseed"), ("tahini", "sesame"), ("peanut butter", "peanut butter"),
    ("cheddar", "cheddar"), ("whole milk", "milk, whole"), ("plain yogurt", "yogurt, plain"),
    ("chicken", "chicken, broiler"), ("beef", "beef, ground"), ("pork", "pork, fresh"),
    ("cod", "cod"), ("sardines", "sardine"), ("tofu", "tofu"),
    ("chickpeas", "chickpeas"), ("white beans", "white beans"), ("quinoa", "quinoa"),
    ("buckwheat", "buckwheat"), ("pasta", "pasta"), ("rice", "rice, white"),
    ("tomato", "tomato"), ("carrot", "carrot"), ("broccoli", "broccoli"),
    ("spinach", "spinach"), ("pumpkin", "pumpkin"), ("apple", "apple"),
    ("blueberry", "blueberr"), ("orange", "orange"), ("dates", "dates"),
    ("raisins", "raisins"), ("almonds", "almonds"), ("walnuts", "walnuts"),
    ("sunflower seeds", "sunflower seed"), ("pumpkin seeds", "pumpkin seed"),
    ("honey", "honey"), ("bread rye", "bread, rye"), ("bread wheat", "bread, white"),
]

for key, token in KEYS:
    tok = token.lower()
    matches = [f"{fid} | {d}" for fid, d in foods.items() if tok in d.lower()]
    matches.sort(key=len)
    print(f"== {key} ({token!r}): {len(matches)} matches")
    for m in matches[:4]:
        print("   ", m[:130])
