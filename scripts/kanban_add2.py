#!/usr/bin/env python3
"""Insert the 2026-10-07 review batch (audit findings H1-H3, M1-M7, low-priority) as kanban cards.
usage: python scripts/kanban_add2.py
Idempotent-ish: refuses to insert when the first card's <h3> already exists."""
import pathlib, re, sys

CARDS = r'''
    <article class="card">
      <h3>1. H1+M2: C bez skoku przy 36 mies. — równanie wg wieku masowego; opis pasma C</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">L</span><span class="tag">model</span><span class="tag">crosscheck</span><span class="tag">PL+EN</span></div>
      <p class="why">Review H1: C (maintenance) jumps at the 3rd birthday — Schofield switches age bands; the 3–10 y W+H form was fitted on ~13–35 kg children while a WHS 3-year-old weighs ~8.5 kg. Verified: boys WHS-mean child C 522.6 → 745.0 kcal/day (+43%); a 5 kg child more than doubles (2.32×); D/E and charts jump with it. Fix per review: pick the equation by body size (weight-age), not birthday. M2: card C's range note says „napięcie prawidłowe (×1,0)” but the code uses the selected tone (hypotonic by default).</p>
      <ul>
        <li><code>energy.ts</code>: form chosen by weight-age (WHO wfa) — weight-only form while weight-age &lt; 36 mo; W+H only when the body size corresponds to ≥ 3 y (null weight-age → fall back on the WHO median weight at 36 mo)</li>
        <li>Continuity check at the crossover weight: W-only vs W+H differ ≤ ~2% (was +43% step at 36 mo)</li>
        <li>Notes/text: method C description, <code>band_c</code>, method section (PL+EN) updated; M2 wording fixed</li>
        <li><code>crosscheck.py</code> mirrors the rule in the SAME commit; grid regenerated; tests updated + a continuity falsifier test added</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>C continuous across the switch (max adjacent step over a weight sweep small, e.g. &lt; 5%); WHS-typical 36 mo child stays ≈ 60 kcal/kg</li>
          <li>tsc / vitest / build / crosscheck green; REPORT.md numbers regenerated; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>2. H2: ekran refeeding — WHO waga/długość ≤ −3 SD lub ≤ −2 SD na siatce WHS</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">M</span><span class="tag">safety</span><span class="tag">PL+EN</span></div>
      <p class="why">Review H2: the banner almost never shows — for a 12-mo boy of 66.5 cm it appears only below 3.3 kg (verified: z=−3 at 3.25 kg), while the WHO weight-for-length −3 SD cut-off is 6.0 kg (verified: z=−3 at 6.02 kg). Average WHS children sit at −2.3…−3.7 SD on WHO wfl. Suggested trigger: WHO wfl ≤ −3 SD, or ≤ −2 SD on the WHS chart.</p>
      <ul>
        <li>Testable <code>refeedingScreen()</code> helper: length present → WHO wfl z ≤ −3 OR WHS z ≤ −2; no length → WHS weight-for-age z ≤ −2</li>
        <li>Banner text + <code>flags.json</code> item text updated to the new basis (WHO wfl + WHS)</li>
        <li>Tests pin the 66.5 cm / 12 mo example: 6.5 kg no flag; 6.0 kg flag (WHO basis); 3.2 kg flag</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Numbers match the verified crossings; banner still conservative wording („contact the care team”)</li>
          <li>tsc / vitest green; browser spot-check; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>3. H3: usunięcie wartości wg wzrostu (Culley) + atrybucja źródła (CPS/Marchand)</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">M</span><span class="tag">model</span><span class="tag">sources</span></div>
      <p class="why">Review H3: the height-based figure was shown from 12 months, but it was derived in children aged 5–11 y (kcal/cm values; confirmed via Wittenbrook 2011 review) — the app covers 0–48 mo, so it can never be legitimately displayed; it also showed ~2× C (738 vs 334 kcal at 12 mo). The source credited as „Sullivan 2009” is actually the Canadian Paediatric Society statement by V. Marchand (principal author; fetched file verified).</p>
      <ul>
        <li>Remove the height-based figure from C (type, computation, UI note); parameters block kept with a status note (derivation range, removal reason)</li>
        <li>Rename source <code>ni2009_sullivan</code> → <code>cps2009_marchand</code> everywhere; fix citation/authors/notes; add the Wittenbrook 2011 source for the 5–11 y range</li>
        <li>Update evidence table / research notes / REPORT mentions</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>No kcal/cm figure anywhere in the UI; source list shows the CPS statement correctly; lint/link gates green</li>
          <li>DECISIONS entry documents the removal + citation fix</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>4. M1: FAO — wartości dziecięce na środku roku (koniec skoku 775→948 przy 12 mies.)</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">M</span><span class="tag">model</span><span class="tag">crosscheck</span></div>
      <p class="why">Review M1: FAO's own text says each child value refers to the mid-year („median weight at the midpoint of each year of age … 1.5, 2.5 … years”); the code placed them half a year early, so the A band's upper edge jumped 775 → 948 kcal at the 1st birthday (+22%). Fix: anchor FAO child values at 18/30/42/54 mo, bridge 12→18 mo from the month-12 infant value.</p>
      <ul>
        <li><code>energy.ts</code> + <code>crosscheck.py</code> (same commit): mid-year anchors, no jump at 12 mo</li>
        <li>Tests: 18 mo → 948 exactly; 24 mo → 1038.5; 12 mo → 775; continuity check</li>
        <li>Grid regenerated; A-band numbers in REPORT.md refreshed</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>No step at 12 mo; values match the FAO table at the mid-year points; all gates green; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>5. M4+M5: NICE — ważenie jako górna granica; pole centylowe ≈ 0,67 SD; wskazanie siatki</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">content</span><span class="tag">PL+EN</span></div>
      <p class="why">Review M4: the weighing intervals are NICE's „no more often than” ceiling (and only when faltering is a concern; NICE also warns about parental anxiety) — the page presents them as a schedule. M5: NICE centile spaces were treated as 1 SD; on UK-WHO charts one centile space ≈ 0.67 SD (criteria ~half as sensitive as presented), and the faltering flag doesn't say which chart it applies to.</p>
      <ul>
        <li><code>rules.json</code> monitoring item: ceiling + context + anxiety note (wording from the fetched NG75 text)</li>
        <li><code>method.p8</code>: centile space ≈ 0.67 SD on UK-WHO (e.g. 2 spaces ≈ 1.3 SD), approximation flagged</li>
        <li><code>flags.json</code> faltering items: chart identification (WHS chart for the child's own reference); „kanały centylowe” → SD bands on the WHS chart</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>All four texts match the fetched NICE wording; content lint green; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>6. M6: produkty — twaróg (PZH), śmietanka 30%, semolina, mleko, suche kasze</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">L</span><span class="tag">products</span><span class="tag">data</span></div>
      <p class="why">Review M6: wrong underlying products — twaróg mapped to US cottage cheese (~45% too few kcal; PL twaróg tłusty ≈ 156 kcal per the PZH journal table), „30% cream” used 36% heavy-whipping data, US-enriched semolina and US-fortified milk earned Fe/vitD tags, and dry grains were mixed with cooked ones and tagged „high-energy”.</p>
      <ul>
        <li>twaróg → PL values (PZH 2014 table + text: 156 kcal, P 15.3, F 9.0, C 3.6, Ca 88, Zn ~1) with its own source line; USDA portions dropped</li>
        <li>cream 30% → light-whipping entry (292 kcal); semolina → unenriched (Fe 1.23, tag gone); milk 3.2% → without added vit D (tag gone)</li>
        <li>oats/millet/semolina → names disclose the dry basis; derived „high-energy” tag suppressed for dry staples; list note updated</li>
        <li>Rebuild via <code>build_foods.py</code>; allergen parity + counts verified</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Spot-check values vs the saved PZH PDF / SR entries; no wrong tags remain; search/lint green; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>7. M7: zagęszczanie płynów dodaje energii (nie ujmuje kcal/ml)</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">content</span><span class="tag">PL+EN</span></div>
      <p class="why">Review M7: the texture rule says thickening lowers energy per ml — thickeners are starch/gum/maltodextrin based and ADD energy (e.g. Nutilis Clear ~290 kcal/100 g per its label).</p>
      <ul>
        <li>Rewrite the rule text (PL+EN) with the correct direction + „check the label” pointer</li>
        <li>Source: add the Nutilis Clear label entry (fetched pages) or re-scope existing sources honestly</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Text matches the label data shown in the app's own product list; lint green; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>8. M3: Calhoun 2025 — krzywe modelowe (predykcyjne), nie centyle; pasmo ≠ 50%</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">M</span><span class="tag">content</span><span class="tag">charts</span><span class="tag">PL+EN</span></div>
      <p class="why">Review M3: the Calhoun 2025 lines aren't true centiles — the paper itself says „prediction ellipsoids … predicted measurement curves”, so the band labelled „25th–75th” does not hold 50% of children (review estimates ≈76%).</p>
      <ul>
        <li>Relabel in chart note / hints / a11y description / method p7: model prediction curves, not empirical centiles; band ≠ exact 50%</li>
        <li>Provenance note + research note: spacing analysis (our check vs the model's own extreme curves ≈ 2/3; review estimate ≈76% — recorded, not displayed as a hard number)</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>No „centyl” wording left for the Calhoun lines; caveat visible; gates green; DECISIONS entry</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>9. Niskie priorytety: etykiety (RJ/Nutilis/Nutridrink), klasy dowodowe, liczby w docs</h3>
      <div class="meta"><span class="pill p3">P3</span><span class="pill p3">M</span><span class="tag">products</span><span class="tag">sources</span><span class="tag">docs</span></div>
      <p class="why">Review low-priority list: Resource Junior kcal per scoop, the Nutilis Clear scoop size (UK 1.25 g vs PL 3 g — confirm the current PL product), Nutridrink's „from 1 year” caveat; a few inflated evidence grades; out-of-date counts in the docs. Plus the reviewer's methodology note: the Python cross-check validates code ↔ parameter file, not parameters ↔ sources.</p>
      <ul>
        <li>RJ: add the label's 7.8 g scoop measure; Nutilis: confirm PL scoop via current PL pages (done: 3 g in PL, 1.25 g in UK) + note + label age caveat; Nutridrink: „powyżej 1. roku życia”</li>
        <li>Evidence grades: narrative review A→B; consumer-page safety claim A→B; notes updated</li>
        <li>Docs: source/item/test counts refreshed (README, REPORT); source-anchored test note</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Each label detail matches a fetched page; grades justified in DECISIONS; counts consistent everywhere; gates green</li>
        </ul>
      </details>
    </article>

'''

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')

if 'H1+M2: C bez skoku przy 36 mies.' in s:
    print('already inserted; nothing to do'); sys.exit(0)

anchor = '<h2>Next up <span class="count">0</span></h2>'
assert anchor in s, 'Next up header not found'
s = s.replace(anchor, '<h2>Next up <span class="count">9</span></h2>', 1)

m = re.search(r'(<h2>Next up <span class="count">9</span></h2>\n)', s)
assert m
s = s[:m.end()] + CARDS + s[m.end():]
s = re.sub(r'\n{3,}', '\n\n', s)

s = s.replace('Board updated <b>2026-10-07</b>', 'Board updated <b>2026-10-07</b> (batch 2: review H1–H3, M1–M7)')

p.write_text(s, encoding='utf-8')
print('inserted 9 cards; Next up count = 9')
