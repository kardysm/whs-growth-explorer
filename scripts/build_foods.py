#!/usr/bin/env python3
"""Build the everyday-foods dataset from USDA SR Legacy (flagged non-PL per GOAL.md).

Outputs: research/data/products_foods.json (+ copy to src/data/)
Each item: key, pl/en names, category, per-100 g values (kcal, protein, fat, satfat,
carbs, fibre, Ca, Fe, Zn, Na, K, vit A, vit D), FDC id + description, household portions
(from food_portion.csv), source note.
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SR = ROOT / "research" / "raw" / "fdc" / "sr_legacy" / "FoodData_Central_sr_legacy_food_csv_2018-04"

NUTRIENTS = {
    "1008": "kcal", "1003": "protein_g", "1004": "fat_g", "1258": "satfat_g",
    "1005": "carbs_g", "1079": "fibre_g", "1087": "calcium_mg", "1089": "iron_mg",
    "1095": "zinc_mg", "1093": "sodium_mg", "1094": "potassium_mg",
    "1106": "vita_rae_ug", "1110": "vitd_IU", "1114": "vitd_ug",
}

FOODS = [
    ("rapeseed-oil", "Olej rzepakowy", "Rapeseed (canola) oil", "fats", ["oil, canola"]),
    ("olive-oil", "Oliwa z oliwek", "Olive oil", "fats", ["oil, olive, salad or cooking"]),
    ("butter", "Masło", "Butter", "fats", ["butter, salted"]),
    ("ghee", "Masło klarowane", "Ghee (clarified butter)", "fats", ["butter, clarified"]),
    ("cream30", "Śmietanka 30%", "Heavy cream (30%)", "fats", ["cream, fluid, heavy whipping"]),
    ("lard", "Smalec", "Lard", "fats", ["lard"]),
    ("twarog", "Twaróg (tłusty)", "Curd cheese (twaróg)", "dairy", ["cheese, cottage, creamed, large or small curd", "cheese, cottage, creamed"]),
    ("greek-yogurt", "Jogurt grecki", "Greek yogurt", "dairy", ["yogurt, greek, plain, whole milk", "yogurt, greek, plain, lowfat"]),
    ("milk-32", "Mleko 3,2%", "Whole milk", "dairy", ["milk, whole, 3.25% milkfat, with added vitamin d"]),
    ("yogurt-plain", "Jogurt naturalny", "Plain yogurt", "dairy", ["yogurt, plain, whole milk"]),
    ("cheddar", "Ser żółty typu cheddar", "Cheddar cheese", "dairy", ["cheese, cheddar"]),
    ("egg", "Jaja kurze (całe)", "Whole eggs", "protein", ["egg, whole, raw, fresh"]),
    ("salmon", "Łosoś atlantycki", "Atlantic salmon", "protein", ["fish, salmon, atlantic, farmed, raw", "fish, salmon, atlantic, wild, raw"]),
    ("mackerel", "Makrela atlantycka", "Atlantic mackerel", "protein", ["fish, mackerel, atlantic, raw"]),
    ("sardines", "Sardynki w oleju (z ośćmi)", "Sardines in oil (with bone)", "protein", ["fish, sardine, atlantic, canned in oil, drained solids with bone"]),
    ("cod", "Dorsz atlantycki", "Atlantic cod", "protein", ["fish, cod, atlantic, raw"]),
    ("chicken", "Kurczak (mięso z skórą, pieczony)", "Roasted chicken", "protein", ["chicken, broilers or fryers, meat and skin, cooked, roasted"]),
    ("beef", "Wołowina mielona 80/20 (gotowana)", "Ground beef 80/20 (cooked)", "protein", ["beef, ground, 80% lean meat / 20% fat, patty, cooked, broiled"]),
    ("pork", "Wieprzowina (schab, gotowany)", "Pork loin (cooked)", "protein", ["pork, fresh, loin, whole, separable lean and fat, cooked, roasted"]),
    ("tofu", "Tofu (twarde, z wapniem)", "Tofu (firm, calcium-set)", "protein", ["tofu, raw, firm, prepared with calcium sulfate"]),
    ("lentils-red", "Soczewica czerwona", "Red lentils", "protein", ["lentils, pink or red, raw"]),
    ("chickpeas", "Ciecierzyca (gotowana)", "Chickpeas (cooked)", "protein", ["chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt", "chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, with salt"]),
    ("white-beans", "Fasola biała (gotowana)", "White beans (cooked)", "protein", ["beans, white, mature seeds, cooked, boiled, without salt", "beans, white, mature seeds, canned"]),
    ("oats", "Płatki owsiane", "Rolled oats", "carbs", ["cereals, oats, regular and quick, not fortified, dry"]),
    ("semolina", "Kasza manna", "Semolina", "carbs", ["semolina, enriched"]),
    ("millet", "Kasza jaglana", "Millet", "carbs", ["millet, raw"]),
    ("buckwheat", "Kasza gryczana (gotowana)", "Buckwheat groats (cooked)", "carbs", ["buckwheat groats, roasted, cooked"]),
    ("rice", "Ryż biały (gotowany)", "White rice (cooked)", "carbs", ["rice, white, long-grain, regular, cooked, enriched"]),
    ("pasta", "Makaron (gotowany)", "Pasta (cooked)", "carbs", ["pasta, cooked, enriched, without added salt"]),
    ("potato", "Ziemniaki (gotowane)", "Potatoes (boiled)", "carbs", ["potatoes, boiled, cooked without skin, flesh, without salt", "potatoes, boiled, cooked in skin, flesh, without salt"]),
    ("sweet-potato", "Bataty", "Sweet potato", "carbs", ["sweet potato, raw, unprepared", "sweet potato, cooked, baked in skin, without salt"]),
    ("bread-rye", "Chleb żytni", "Rye bread", "carbs", ["bread, rye"]),
    ("bread-ww", "Chleb pełnoziarnisty", "Whole-wheat bread", "carbs", ["bread, whole-wheat, commercially prepared"]),
    ("avocado", "Awokado", "Avocado", "produce", ["avocados, raw, all commercial varieties"]),
    ("banana", "Banan", "Banana", "produce", ["bananas, raw"]),
    ("apple", "Jabłko", "Apple", "produce", ["apples, raw, with skin"]),
    ("blueberry", "Borówka amerykańska", "Blueberries", "produce", ["blueberries, raw"]),
    ("orange", "Pomarańcza", "Orange", "produce", ["oranges, raw, all commercial varieties"]),
    ("dates", "Daktyle", "Dates (medjool)", "produce", ["dates, medjool"]),
    ("raisins", "Rodzynki", "Raisins", "produce", ["raisins, dark, seedless"]),
    ("tomato", "Pomidor", "Tomato", "produce", ["tomatoes, red, ripe, raw, year round average"]),
    ("carrot", "Marchew", "Carrot", "produce", ["carrots, raw"]),
    ("broccoli", "Brokuł", "Broccoli", "produce", ["broccoli, raw"]),
    ("spinach", "Szpinak", "Spinach", "produce", ["spinach, raw"]),
    ("pumpkin", "Dynia", "Pumpkin", "produce", ["pumpkin, raw"]),
    ("almonds", "Migdały", "Almonds", "nuts-seeds", ["nuts, almonds"]),
    ("walnuts", "Orzechy włoskie", "Walnuts (English)", "nuts-seeds", ["nuts, walnuts, english"]),
    ("sunflower", "Ziarna słonecznika", "Sunflower seed kernels", "nuts-seeds", ["seeds, sunflower seed kernels, dried"]),
    ("pumpkin-seeds", "Pestki dyni", "Pumpkin seed kernels", "nuts-seeds", ["seeds, pumpkin and squash seed kernels, roasted, without salt", "seeds, pumpkin and squash seed kernels, raw"]),
    ("tahini", "Tahini (pasta sezamowa)", "Tahini (sesame butter)", "nuts-seeds", ["seeds, sesame butter, paste"]),
    ("flax", "Siemię lniane", "Flaxseed", "nuts-seeds", ["seeds, flaxseed"]),
    ("peanut-butter", "Masło orzechowe (gładkie)", "Peanut butter (smooth)", "nuts-seeds", ["peanut butter, smooth style, with salt", "peanut butter, smooth style, without salt"]),
    ("honey", "Miód", "Honey", "sweets", ["honey"]),
    # Seasonings & herbs (2026-10-07 user batch card 3): flavour boosters for children's meals,
    # warned where needed (cinnamon/coumarin). Same USDA SR Legacy pipeline as the other foods.
    ("dill-fresh", "Koperek (świeży)", "Dill (fresh)", "seasonings", ["dill weed, fresh"]),
    ("parsley-fresh", "Natka pietruszki", "Parsley (fresh)", "seasonings", ["parsley, fresh"]),
    ("chives", "Szczypiorek", "Chives", "seasonings", ["chives, raw"]),
    ("basil-fresh", "Bazylia (świeża)", "Basil (fresh)", "seasonings", ["basil, fresh"]),
    ("thyme-fresh", "Tymianek (świeży)", "Thyme (fresh)", "seasonings", ["thyme, fresh"]),
    ("rosemary-fresh", "Rozmaryn (świeży)", "Rosemary (fresh)", "seasonings", ["rosemary, fresh"]),
    ("coriander-fresh", "Kolendra (świeże liście)", "Coriander (fresh leaves)", "seasonings", ["coriander (cilantro) leaves, raw"]),
    ("oregano-dried", "Oregano (suszone)", "Oregano (dried)", "seasonings", ["spices, oregano, dried"]),
    ("cinnamon", "Cynamon mielony", "Cinnamon (ground)", "seasonings", ["spices, cinnamon, ground"]),
    ("ginger", "Imbir mielony", "Ginger (ground)", "seasonings", ["spices, ginger, ground"]),
    ("turmeric", "Kurkuma mielona", "Turmeric (ground)", "seasonings", ["spices, turmeric, ground"]),
    ("paprika", "Papryka słodka mielona", "Paprika (sweet, ground)", "seasonings", ["spices, paprika"]),
    ("garlic-powder", "Czosnek granulowany", "Garlic powder", "seasonings", ["spices, garlic powder"]),
]

# Allergen/age tags rendered on the cards and indexed by the search (audit CS-3).
ALLERGENS = {
    "twarog": ["dairy"], "greek-yogurt": ["dairy"], "milk-32": ["dairy"],
    "yogurt-plain": ["dairy"], "cheddar": ["dairy"],
    "egg": ["egg"],
    "salmon": ["fish"], "mackerel": ["fish"], "sardines": ["fish"], "cod": ["fish"],
    "tofu": ["soy"],
    "bread-rye": ["gluten"], "bread-ww": ["gluten"], "semolina": ["gluten"], "pasta": ["gluten"],
    "almonds": ["nuts"], "walnuts": ["nuts"], "peanut-butter": ["nuts"],
    "tahini": ["sesame"],
}

# Item-level warnings (safety) — honey <12 mo (audit CS-1) + choking-hazard notes (audit R2-5).
WARNINGS = {
    "honey": {
        "pl": "NIE dla dzieci poniżej 12. miesiąca życia — ryzyko botulizmu niemowlęcego (zarodniki Clostridium botulinum).",
        "en": "NOT for children under 12 months — infant botulism risk (Clostridium botulinum spores).",
    },
    "almonds": {
        "pl": "Ryzyko zadławienia: całe orzechy — podawaj wyłącznie zmielone lub na gładko (małe dzieci; dysfagia wg IDDSI).",
        "en": "Choking risk: never whole — serve ground or smooth only (young children; dysphagia per IDDSI).",
    },
    "walnuts": {
        "pl": "Ryzyko zadławienia: całe orzechy — podawaj wyłącznie zmielone lub na gładko (małe dzieci; dysfagia wg IDDSI).",
        "en": "Choking risk: never whole — serve ground or smooth only (young children; dysphagia per IDDSI).",
    },
    "peanut-butter": {
        "pl": "Masło orzechowe rozcieńczaj do gładkiej konsystencji dla niemowląt/małych dzieci; nigdy grudki.",
        "en": "Thin peanut butter to a smooth consistency for infants/young children; never lumps.",
    },
    "raisins": {
        "pl": "Ryzyko zadławienia: suszone owoce — miękkie, drobno pokrojone; nie podawaj w całości małym dzieciom.",
        "en": "Choking risk: dried fruit — serve soft and finely chopped; never whole for young children.",
    },
    "dates": {
        "pl": "Ryzyko zadławienia: suszone owoce — miękkie, drobno pokrojone; nie podawaj w całości małym dzieciom.",
        "en": "Choking risk: dried fruit — serve soft and finely chopped; never whole for young children.",
    },
    "carrot": {
        "pl": "Ryzyko zadławienia: podawaj ugotowane/starte, nie surowe kawałki (małe dzieci; dysfagia wg IDDSI).",
        "en": "Choking risk: serve cooked/grated, not raw pieces (young children; dysphagia per IDDSI).",
    },
    "apple": {
        "pl": "Ryzyko zadławienia: podawaj ugotowane/starte, nie surowe kawałki (małe dzieci; dysfagia wg IDDSI).",
        "en": "Choking risk: serve cooked/grated, not raw pieces (young children; dysphagia per IDDSI).",
    },
    "blueberry": {
        "pl": "Ryzyko zadławienia: owoce okrągłe — przekrój na połówki lub rozgnieć.",
        "en": "Choking risk: round fruit — halve or crush.",
    },
    "sunflower": {
        "pl": "Ryzyko zadławienia: nasiona — mielone, nie całe (małe dzieci).",
        "en": "Choking risk: seeds — ground, not whole (young children).",
    },
    "pumpkin-seeds": {
        "pl": "Ryzyko zadławienia: nasiona — mielone, nie całe (małe dzieci).",
        "en": "Choking risk: seeds — ground, not whole (young children).",
    },
    # Seasonings (card 3, 2026-10-07): coumarin caution for cassia cinnamon — numbers verbatim from
    # the fetched BfR FAQ (TDI 0.1 mg/kg bw/d; small child ~15 kg reaches it with ~0.5 g cassia/day).
    "cinnamon": {
        "pl": "Cynamon kasja (typowy w sklepach) zawiera kumarynę: wg BfR małe dziecko (~15 kg) osiąga tolerowaną dawkę dzienną przy ok. 0,5 g kasji dziennie; krótkotrwałe przekroczenie nie zagraża zdrowiu, ale przy częstym stosowaniu wybieraj cynamon cejloński (znacznie mniej kumaryny).",
        "en": "Cassia cinnamon (the common shop variety) contains coumarin: per BfR, a small child (~15 kg) reaches the tolerable daily intake with about 0.5 g of cassia per day; short-term exceedance poses no health risk, but for frequent use choose Ceylon cinnamon (much less coumarin).",
    },
}


# Tag helpers: choking-hazard set (all warned items except honey) + per-key extras.
CHOKING = {"almonds", "walnuts", "peanut-butter", "raisins", "dates", "carrot", "apple", "blueberry", "sunflower", "pumpkin-seeds"}
TAG_EXTRA = {"honey": ["age-12plus"]}


def main():
    foods = {}
    with (SR / "food.csv").open(newline="", encoding="utf8", errors="ignore") as f:
        for row in csv.DictReader(f):
            foods.setdefault(row["fdc_id"], row["description"])

    chosen = {}
    misses = []
    for key, pl, en, cat, tokens in FOODS:
        pick = None
        for tok in tokens:
            tl = tok.lower()
            exact = [fid for fid, d in foods.items() if d.lower() == tl]
            cands = exact or [fid for fid, d in foods.items() if tl in d.lower()]
            if cands:
                # shortest description = least-specific qualifiers; prefer exact
                pick = sorted(cands, key=lambda fid: (len(foods[fid]), fid))[0] if not exact else exact[0]
                break
        if pick:
            chosen[key] = (pick, foods[pick], pl, en, cat)
        else:
            misses.append((key, tokens))

    wanted = set(fid for fid, *_ in chosen.values())
    nrows = {}
    with (SR / "food_nutrient.csv").open(newline="", encoding="utf8", errors="ignore") as f:
        for row in csv.DictReader(f):
            if row["fdc_id"] in wanted and row["nutrient_id"] in NUTRIENTS:
                nrows.setdefault(row["fdc_id"], {})[NUTRIENTS[row["nutrient_id"]]] = float(row.get("amount") or 0)

    portions = {}
    unit = {}
    with (SR / "measure_unit.csv").open(newline="", encoding="utf8", errors="ignore") as f:
        for r in csv.DictReader(f):
            unit[r["id"]] = r["name"]
    with (SR / "food_portion.csv").open(newline="", encoding="utf8", errors="ignore") as f:
        for row in csv.DictReader(f):
            if row["fdc_id"] in wanted:
                try:
                    g = float(row.get("gram_weight") or 0)
                except ValueError:
                    continue
                pdesc = (row.get("portion_description") or "").strip()
                if not pdesc:
                    amt = (row.get("amount") or "").strip()
                    try:
                        fv = float(amt)
                        amt = str(int(fv)) if fv == int(fv) else amt
                    except ValueError:
                        pass
                    uname = unit.get((row.get("measure_unit_id") or ""), "")
                    if not uname or uname == "undetermined":
                        uname = (row.get("modifier") or "").strip()
                    pdesc = f"{amt} {uname}".strip() or "portion"
                if g and 1 <= g <= 400:
                    portions.setdefault(row["fdc_id"], []).append({"desc": pdesc[:60], "g": round(g, 1)})

    out = []
    for key, (fid, desc, pl, en, cat) in chosen.items():
        n = nrows.get(fid, {})
        p = portions.get(fid, [])[:3]
        out.append({
            "id": f"food-{key}", "kind": "food", "category": cat,
            "name": {"pl": pl, "en": en},
            "tags": (ALLERGENS.get(key, []) + TAG_EXTRA.get(key, [])
                     + (["choking"] if key in CHOKING else [])
                     + (["flavour"] if cat == "seasonings" else [])),
            **({"warning": WARNINGS[key]} if key in WARNINGS else {}),
            "per100g": {
                "kcal": n.get("kcal"), "protein": n.get("protein_g"), "fat": n.get("fat_g"),
                "satfat": n.get("satfat_g"), "carbs": n.get("carbs_g"), "fibre": n.get("fibre_g"),
                "calcium_mg": n.get("calcium_mg"), "iron_mg": n.get("iron_mg"), "zinc_mg": n.get("zinc_mg"),
                "sodium_mg": n.get("sodium_mg"), "potassium_mg": n.get("potassium_mg"),
                "vita_ug": n.get("vita_rae_ug"), "vitd_ug": n.get("vitd_ug") or ((n.get("vitd_IU") or 0) / 40 if n.get("vitd_IU") else None),
            },
            "portions": p,
            "fdc_id": fid, "fdc_desc": desc,
            "source": "USDA FoodData Central, SR Legacy (fdc.nal.usda.gov) — non-PL fallback, flagged",
        })

    (ROOT / "research" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "research" / "data" / "products_foods.json").write_text(json.dumps({"items": out, "misses": misses}, ensure_ascii=False, indent=1))
    (ROOT / "src" / "data" / "products_foods.json").write_text(json.dumps({"items": out}, ensure_ascii=False))

    print(f"items: {len(out)} | misses: {len(misses)}")
    for it in out[:60]:
        n = it["per100g"]
        print(f"{it['id']:20s} {n['kcal']} kcal | P {n['protein']} | F {n['fat']} | C {n['carbs']} | fibre {n['fibre']} | Fe {n['iron_mg']} | Zn {n['zinc_mg']} | Ca {n['calcium_mg']} | D {n['vitd_ug']} | meas {len(it['portions'])} :: {it['fdc_desc'][:60]}")
    for m in misses:
        print("MISS:", m)


if __name__ == "__main__":
    main()
