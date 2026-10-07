/**
 * Polish translations of the USDA portion descriptions shown on the food cards
 * (user request 2026-10-05: „przetłumacz porcje — slice → plasterek, tbsp → łyżka, tsp → łyżeczka, itd”).
 *
 * Keys are the original English `portions[].desc` strings from src/data/products_foods.json.
 * Values keep „oz”/„fl oz” tokens intact where the numbers must still be metric-converted by
 * `metricDesc()` in main.ts (display rule since 2026-10-03: no US units in the UI); remaining
 * decimals are turned into Polish commas after conversion. English mode keeps the raw strings.
 */
export const DESC_PL: Record<string, string> = {
  "0.25 block": "0,25 bloku",
  "0.25 cup": "0,25 szklanki",
  "0.25 cup leaves, whole": "0,25 szklanki liści (całych)",
  "0.33 cup": "0,33 szklanki",
  "0.5 container (4 oz)": "0,5 opakowania (4 oz)",
  "0.5 cup": "0,5 szklanki",
  "0.5 fillet": "0,5 fileta",
  "0.5 unit (yield from 1 lb ready-to-cook chicken)": "0,5 sztuki (z tuszy ok. 0,45 kg)",
  "1 Italian tomato": "1 pomidor typu włoskiego",
  "1 bunch": "1 pęczek",
  "1 chop, excluding refuse (yield from 1 raw chop, with refuse": "1 kotlet (bez odpadów)",
  "1 container (6 oz)": "1 opakowanie (6 oz)",
  "1 container (8 oz)": "1 opakowanie (8 oz)",
  "1 cubic inch": "1 kostka (2,5 cm)",
  "1 cup": "1 szklanka",
  "1 cup (1\" cubes)": "1 szklanka (kostki 2,5 cm)",
  "1 cup (not packed)": "1 szklanka (luźno)",
  "1 cup cherry tomatoes": "1 szklanka pomidorków koktajlowych",
  "1 cup chopped": "1 szklanka, posiekane",
  "1 cup elbows not packed": "1 szklanka makaronu „łokcie” (luźno)",
  "1 cup grated": "1 szklanka, starte",
  "1 cup slices": "1 szklanka, plasterki",
  "1 cup sprigs": "1 szklanka gałązek",
  "1 cup spaghetti not packed": "1 szklanka spaghetti (luźno)",
  "1 cup spaghetti packed": "1 szklanka spaghetti (ciasno)",
  "1 cup strips or slices": "1 szklanka, paski lub plasterki",
  "1 cup, chopped": "1 szklanka, posiekane",
  "1 cup, chopped or diced": "1 szklanka, posiekane lub w kostkę",
  "1 cup, chopped or sliced": "1 szklanka, posiekane lub w plasterki",
  "1 cup, cubes": "1 szklanka, kostki",
  "1 cup, drained": "1 szklanka, odcedzone",
  "1 cup, fluid (yields 2 cups whipped)": "1 szklanka płynu (daje 2 szklanki ubitej)",
  "1 cup, ground": "1 szklanka, mielone",
  "1 cup, in shell, edible yield (7 nuts)": "1 szklanka, w skorupkach, część jadalna (7 orzechów)",
  "1 cup, large curd (not packed)": "1 szklanka, duże ziarno (luźno)",
  "1 cup, mashed": "1 szklanka, rozgniecione",
  "1 cup, packed": "1 szklanka (mocno ubite)",
  "1 cup, pureed": "1 szklanka, przecier",
  "1 cup, quartered or chopped": "1 szklanka, na ćwiartki lub posiekane",
  "1 cup, sections": "1 szklanka, cząstki",
  "1 cup, sliced": "1 szklanka, pokrojone w plasterki",
  "1 cup, slivered": "1 szklanka, słupki",
  "1 cup, small curd (not packed)": "1 szklanka, drobne ziarno (luźno)",
  "1 cup, whipped": "1 szklanka, ubita",
  "1 cup, whole": "1 szklanka, całe",
  "1 cup, with hulls, edible yield": "1 szklanka, w łupinach, część jadalna",
  "1 date, pitted": "1 daktyl, bez pestki",
  "1 extra large": "1 bardzo duże",
  "1 extra small (less than 6\" long)": "1 bardzo mały (poniżej 15 cm)",
  "1 fillet": "1 filet",
  "1 jumbo": "1 olbrzymie",
  "1 large": "1 duże",
  "1 large (3\" to 4-1/4\" dia.)": "1 duży (średnica 7,5–11 cm)",
  "1 large (3-1/16\" dia)": "1 duża (średnica ok. 8 cm)",
  "1 large (3-1/4\" dia)": "1 duża (średnica ok. 8 cm)",
  "1 leaf": "1 liść",
  "1 medium (2-1/4\" to 3-1/4\" dia.)": "1 średni (średnica 6–8 cm)",
  "1 miniature box (.5 oz)": "1 małe pudełko (.5 oz)",
  "1 packet (0.5 oz)": "1 saszetka (0.5 oz)",
  "1 pat (1\" sq, 1/3\" high)": "1 kawałek (2,5 × 2,5 × 0,8 cm)",
  "1 slice": "1 plasterek",
  "1 slice (1 oz)": "1 plasterek (1 oz)",
  "1 slice (2/3 oz)": "1 plasterek (2/3 oz)",
  "1 slice (3/4 oz)": "1 plasterek (3/4 oz)",
  "1 slice, regular": "1 plasterek (zwykły)",
  "1 slice, snack-size": "1 plasterek (mały)",
  "1 small (2-3/8\" dia)": "1 mała (średnica ok. 6 cm)",
  "1 spear (about 5\" long)": "1 łodyga (dł. ok. 13 cm)",
  "1 stalk": "1 łodyga",
  "1 sweetpotato, 5\" long": "1 batat (dł. ok. 13 cm)",
  "1 tablespoon": "1 łyżka",
  "1 tbsp": "1 łyżka",
  "1 tbsp, ground": "1 łyżka, mielone",
  "1 tbsp, whole": "1 łyżka, całe",
  "1 tbsp chopped": "1 łyżka, posiekane",
  "1 tsp": "1 łyżeczka",
  "1 tsp, leaves": "1 łyżeczka, liście",
  "1 tsp, ground": "1 łyżeczka, mielone",
  "1 tsp chopped": "1 łyżeczka, posiekane",
  "2 tbsp": "2 łyżki",
  "2 tbsp, chopped": "2 łyżki, posiekane",
  "5 leaves": "5 listków",
  "5 sprigs": "5 gałązek",
  "9 sprigs": "9 gałązek",
  "10 sprigs": "10 gałązek",
  "50 berries": "50 jagód",
};

/** Translate a portion description to Polish; token fallback for any unknown string. */
export function descPl(d: string): string {
  if (DESC_PL[d]) return DESC_PL[d];
  return d
    .replace(/\btablespoons?\b/gi, "łyżka")
    .replace(/\btbsp\b/gi, "łyżka")
    .replace(/\bteaspoons?\b/gi, "łyżeczka")
    .replace(/\btsp\b/gi, "łyżeczka")
    .replace(/\bcups?\b/gi, "szklanka")
    .replace(/\bslices?\b/gi, "plasterek")
    .replace(/\bfillets?\b/gi, "filet")
    .replace(/\bcontainers?\b/gi, "opakowanie")
    .replace(/\bpackets?\b/gi, "saszetka");
}
