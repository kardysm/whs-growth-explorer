#!/usr/bin/env python3
"""Card 5 (M4+M5): NICE texts — weighing ceiling, centile space ~0.67 SD, chart attribution."""
import pathlib

def edit(path, pairs):
    p = pathlib.Path(path)
    s = p.read_text(encoding='utf-8')
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f'NOT FOUND in {path}:\n{old[:160]}')
        s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')
    print('updated', path)

# --- rules.json: monitoring item (M4) ---
edit('content/rules.json', [
    ('"pl": "Wagę kontroluj wg wieku (NICE NG75: <1. mies. — codziennie; 1–6. mies. — co tydzień; 6–12. mies. — co 2 tygodnie; ≥1. r.ż. — co miesiąc). W fazie zmian: dzienniczek przyjęć 3–7 dni (praktyka) i ocena trendu po kilku tygodniach, zanim zmienisz cele."',
     '"pl": "Gdy są obawy o słabe przyrastanie, NICE NG75 podaje, jak często NAJCZĘŚCIEJ ważyć — to górna granica, nie harmonogram: <1 mies. — nie częściej niż raz dziennie; 1–6 mies. — nie częściej niż raz w tygodniu; 6–12 mies. — nie częściej niż raz na 2 tygodnie; ≥1 r.ż. — nie częściej niż raz w miesiącu (NICE ostrzega, że zbyt częste ważenie wzmaga niepokój rodziców). W fazie zmian: dzienniczek przyjęć 3–7 dni (praktyka) i ocena trendu po kilku tygodniach, zanim zmienisz cele."'),
    ('"en": "Weigh per age bands (NICE NG75: <1 mo — daily; 1–6 mo — weekly; 6–12 mo — every 2 weeks; ≥1 y — monthly). While changing things: a 3–7 day intake diary (practice) and trend review after several weeks before adjusting targets."',
     '"en": "When faltering growth is a concern, NICE NG75 gives how often to weigh AT MOST — a ceiling, not a schedule: <1 mo — no more often than daily; 1–6 mo — no more often than weekly; 6–12 mo — no more often than fortnightly; ≥1 y — no more often than monthly (NICE warns that weighing more often than needed adds to parental anxiety). While changing things: a 3–7 day intake diary (practice) and trend review after several weeks before adjusting targets."'),
])

# --- method.p8: centile space -> SD conversion (M5) ---
edit('content/base.json', [
    ('kryteria NICE stosuj do siatki WHS w przestrzeni SD (pasma między liniami ±SD).',
     'kryteria NICE (spadek o 1–3 pól centylowych wg pasma masy urodzeniowej) stosuj do siatki WHS przeliczając pola na SD: na siatkach UK-WHO jedno pole centylowe ≈ 0,67 SD (np. 2 pola ≈ 1,3 SD; 3 pola ≈ 2,0 SD) — przeniesienie przybliżone; decyduje trend i stan kliniczny.'),
    ('apply NICE criteria to the WHS chart in SD space (bands between ±SD lines).',
     'apply the NICE criteria (a fall across 1-3 weight centile spaces by birthweight band) to the WHS chart converting spaces to SD: on the UK-WHO charts one centile space ≈ 0.67 SD (e.g. 2 spaces ≈ 1.3 SD; 3 ≈ 2.0 SD) — an approximation; the trend and clinical state decide.'),
])

# --- flags.json: faltering item chart + SD-band wording (M5) ---
edit('content/flags.json', [
    ('"pl": "Spełnione kryterium słabego przyrastania: masa/długość < −1,65 z, prędkość masy < −2 z (poniżej 2 lat) albo spadek o ≥1 z — wizyta w ciągu tygodnia wg ścieżki wytycznych."',
     '"pl": "Spełnione kryterium słabego przyrastania: masa/długość < −1,65 z, prędkość masy < −2 z (poniżej 2 lat) albo spadek o ≥1 z — oceń na siatce odniesienia dziecka (dla WHS: siatka WHS; kryteria AAP/WHO opisano na siatkach populacyjnych) — wizyta w ciągu tygodnia wg ścieżki wytycznych."'),
    ('"en": "Faltering-growth criteria met: weight-for-length < −1.65 z, weight velocity < −2 z (under 2 y), or a drop of ≥1 z — appointment within a week per the guideline pathway."',
     '"en": "Faltering-growth criteria met: weight-for-length < −1.65 z, weight velocity < −2 z (under 2 y), or a drop of ≥1 z — evaluate on the child\'s own reference chart (for WHS: the WHS chart; the AAP/WHO criteria are written for population charts) — appointment within a week per the guideline pathway."'),
    ('"pl": "Na siatce WHS masa przecięła kanały centylowe w dół (nie pojedynczy punkt, a trend przez ≥2 pomiary) — nie czekaj do rutynowej kontroli."',
     '"pl": "Na siatce WHS masa przecięła pasma SD w dół (nie pojedynczy punkt, a trend przez ≥2 pomiary; przelicznik: 1 pole centylowe UK-WHO ≈ 0,67 SD) — nie czekaj do rutynowej kontroli."'),
    ('"en": "On the WHS chart, weight has crossed centile channels downward (a trend over ≥2 measurements, not one point) — don\'t wait for the routine visit."',
     '"en": "On the WHS chart, weight has crossed the SD bands downward (a trend over ≥2 measurements, not one point; conversion: 1 UK-WHO centile space ≈ 0.67 SD) — don\'t wait for the routine visit."'),
])

# --- reasons.json: faltering definition wording (M5) ---
edit('content/reasons.json', [
    ('"pl": "Definicje słabego przyrastania (np. spadek o ≥1 kanał centylowy, kryteria z-score) trzeba stosować na siatce, która należy do populacji dziecka — w WHS to siatka WHS. Kalkulator pokazuje pozycję dziecka na siatce WHS obok wartości odniesienia ze siatki WHO (dwie różne odpowiedzi na dwa różne pytania)."',
     '"pl": "Definicje słabego przyrastania (np. spadek o ≥1 pole centylowe — na siatkach UK-WHO to ≈ 0,67 SD, albo kryteria z-score) trzeba stosować na siatce, która należy do populacji dziecka — w WHS to siatka WHS. Kalkulator pokazuje pozycję dziecka na siatce WHS obok wartości odniesienia ze siatki WHO (dwie różne odpowiedzi na dwa różne pytania)."'),
    ('"en": "Faltering-growth definitions (e.g. a drop of ≥1 centile channel, z-score criteria) must be applied on the chart that belongs to the child\'s population — for WHS that is the WHS chart. The calculator shows the child\'s position on the WHS chart next to the reference value from the WHO chart (two different answers to two different questions)."',
     '"en": "Faltering-growth definitions (e.g. a drop of ≥1 centile space — about 0.67 SD on the UK-WHO charts — or z-score criteria) must be applied on the chart that belongs to the child\'s population — for WHS that is the WHS chart. The calculator shows the child\'s position on the WHS chart next to the reference value from the WHO chart (two different answers to two different questions)."'),
])
print('done')
