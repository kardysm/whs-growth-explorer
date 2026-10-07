#!/usr/bin/env python3
"""Insert the 2026-10-07 follow-up batch (full-audit detail: M1-refine, L4-L11, H2/M5 refinements).
usage: python scripts/kanban_add3.py
Idempotent-ish: refuses to insert when the first card's <h3> already exists."""
import pathlib, re, sys

CARDS = r'''
    <article class="card">
      <h3>1. M1-dopracowanie + L8: FAO na środku miesiąca; most NASEM na 36. mies.; testy ciągłości</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">M</span><span class="tag">model</span><span class="tag">crosscheck</span><span class="tag">tests</span></div>
      <p class="why">Audit detail: (M1) FAO infant values are per monthly band — anchor them at mid-month (m+0.5) too, so the 12-mo value is ≈788 (was 775; the earlier fix only moved the child anchors). (L8) The NASEM child-equation switch at 36 mo steps the A/B low edges (boys 1227→1169, −5%; girls 1186→1069, −10%) — bridge it like the 3/6/12-mo seams (D-029). Also add month-to-month continuity tests for A/B edges, C and D (review request).</p>
      <ul>
        <li><code>faoEnergy</code>: infant nodes at 0.5…11.5 mo, then the 18-mo child anchor; <code>nasemEer</code>: ±0.5-mo linear bridge of the two child equations across 36 mo</li>
        <li><code>crosscheck.py</code> mirrors both; grid + REPORT numbers regenerated; energy/methods tests updated</li>
        <li>New property test: adjacent-month relative steps bounded (calibrated to the legitimate reference-growth steps in early infancy; cliffs like the old +43% must fail)</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>FAO(12 mo) ≈ 788 boys / 724 girls; no A/B low-edge step at 36 mo; continuity test green; all gates pass</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>2. Teksty z audytu: band_d (pasmo napięcia + koszt), method.p1 (interpolacja EFSA), oceny L5, źródła C (L6)</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">content</span><span class="tag">PL+EN</span></div>
      <p class="why">M2-detail: D's band combines the tone band (via C) AND the energy-cost band — band_d mentions only the cost. L4: method.p1 says „yearly values”; the code interpolates EFSA children's values between birthdays (PZH differs ≤1%: 3 y boys 1163 vs 1174). L5: three inflated item grades (flags „no weight gain (practice)” A→D; flags micronutrient-testing A→D; reasons „faltering definitions on the WHS chart” A→D). L6: card C's sources miss <code>espghan_espn_pn_energy</code> (the actual source of the 0–3 y W coefficients).</p>
      <ul>
        <li><code>band_d</code> PL+EN: tone range (0.9–1.1, as in C) + cost range 4.1–6.0 kcal/g</li>
        <li><code>method.p1</code>: EFSA yearly values linearly interpolated between birthdays; PZH 2024 noted as ≤1% agreement</li>
        <li>Grade fixes in flags.json ×2 and reasons.json ×1 (A→D), notes updated; C sourceIds += espghan_espn_pn_energy</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Texts match code; content lint green; grades justified in DECISIONS</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>3. M3-dopracowanie: liczby 76%/93% (wyprowadzone), kohorta obu płci, styk dwóch modeli</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">M</span><span class="tag">charts</span><span class="tag">PL+EN</span></div>
      <p class="why">The audit's derivation is now reproduced: the 0–24-mo curves' distances from p50 follow the 2-parameter ellipsoid law r(c)=√(−2·ln(1−c)) — digitized ratios 1 : 1.55–1.58 : 1.86–1.92 : 2.13–2.22 vs theory 1 : 1.524 : 1.823 : 2.079 — so the „25–75” band is a 50% prediction region whose marginal coverage is 2Φ(1.177)−1 = 76.1% („10–90” ≈ 92.7%; the „25th” line ≈ 12th centile marginally). Also: the curves are combined-sex (2:1 female; no separate curves — paper), drawn on the sex-specific WHS chart; the ≥24-mo panels are built differently (ratios ≈ univariate 1.9/2.45/2.9).</p>
      <ul>
        <li>Labels: „median and inner band (SITAR 50% prediction region, both sexes)” wording; add the 76%/93% numbers + both-sexes caveat + two-model seam note</li>
        <li><code>method.p7</code> + provenance addendum updated with the derivation; a11y chart description touched if wording changes</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Numbers match the verified computation; no „centyl” left for Calhoun; gates green</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>4. L7: pin miesiąca 0 siatki Antonius (średnie z pracy) + taper do 3. miesiąca</h3>
      <div class="meta"><span class="pill p3">P3</span><span class="pill p3">M</span><span class="tag">data</span><span class="tag">charts</span></div>
      <p class="why">Digitized month-0 means deviate from the paper's stated means (girls weight 2.31 vs 1.9 kg, length 45.1 vs 43.0 cm; boys 2.25 vs 2.1 kg, 42.4 vs 41.5 cm) and drive WHS z, targets and the chart at 0–3 mo. Pin month 0 to the stated means (SD widths preserved) and let the existing interpolation taper into the digitized curve by month 3.</p>
      <ul>
        <li>Edit <code>antonius_digitized.csv</code> month-0 rows (shift all lines by the mean delta); regenerate <code>whs_digitized.json</code>; provenance addendum</li>
        <li>Grid + reference lines + crosscheck re-run; note the effect on z/targets at 0–3 mo</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Month-0 means equal the paper values; month 3 unchanged; z at 0–3 mo consistent; all gates pass</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>5. UI-doprecyzowania: WHO waga/długość z na karcie C; noty D; treść bannera/flags (H2, M5, L9)</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">M</span><span class="tag">ui</span><span class="tag">PL+EN</span></div>
      <p class="why">Review suggestions: (H2) show the WHO weight-for-length z on card C when a length is entered (screening context, framed); reword the banner around thinness/refeeding, not stature; (L9) note the D catch-up fade near 45–48 mo (target clamped to the digitized range); say the WHS-mean target is descriptive, not prescriptive (D card note).</p>
      <ul>
        <li>Card C note: „WHO waga-do-długości: z = … (kontekst przesiewowy — dzieci z WHS są konstytucyjnie mniejsze)” when length present</li>
        <li>D notes: target „opisowy, nie zalecenie”; clamp note extended (fade near the range end)</li>
        <li>Banner/flags wording aligned (thinness + refeeding caution; chart attribution refined)</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Browser checks in PL/EN; wording reviewed; gates green</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>6. Produkty: L1 (Resource Junior 55 g: 250→257 kcal) i L3 (Nutridrink: butelka + ostrzeżenia)</h3>
      <div class="meta"><span class="pill p3">P3</span><span class="pill p3">S</span><span class="tag">products</span></div>
      <p class="why">L1: 55 g × 468 kcal/100 g = 257.4, but the measure says 250 (the 80 g → 375 measure is consistent); all other measures across the list were scanned and are consistent. L3: Nutridrink label adds „powyżej 1. roku życia”, 600 mOsm/l, fluid monitoring and „>4 bottles/day caution”; the item lacks a bottle measure (125 ml = 300 kcal).</p>
      <ul>
        <li>RJ 55 g measure → 257 kcal; Nutridrink: measure „1 butelka (125 ml)” = 300 kcal + form/warning text with the label cautions</li>
        <li>Re-run the measures-consistency scan; browser spot-check</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>All measures consistent with per-100 values (±2%); label texts quoted; gates green</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>7. Domknięcie: L10 (generator siatki poza npm test), L11 (liczby w docs), weryfikacja końcowa</h3>
      <div class="meta"><span class="pill p3">P3</span><span class="pill p3">S</span><span class="tag">docs</span><span class="tag">verify</span></div>
      <p class="why">L10: <code>npm test</code> rewrites committed grid/reference files (float-noise diffs); generation should be explicit. L11: stale counts (REPORT „63 items”, rounds 1–5 wording). Then the full verification pass.</p>
      <ul>
        <li>Grid generation gated behind <code>GEN_GRID=1</code> (default run = read-only comparison); README/skill updated</li>
        <li>REPORT/README counts refreshed; review log addendum; final gates + axe + browser smoke</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li><code>npm test</code> leaves the tree clean; counts consistent; D-062…D-068; kanban closed</li>
        </ul>
      </details>
    </article>

'''

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')

if 'M1-dopracowanie + L8' in s:
    print('already inserted; nothing to do'); sys.exit(0)

anchor = '<h2>Next up <span class="count">0</span></h2>'
assert anchor in s, 'Next up header not found'
s = s.replace(anchor, '<h2>Next up <span class="count">7</span></h2>', 1)

m = re.search(r'(<h2>Next up <span class="count">7</span></h2>\n)', s)
assert m
s = s[:m.end()] + CARDS + s[m.end():]
s = re.sub(r'\n{3,}', '\n\n', s)

s = s.replace('Board updated <b>2026-10-07</b> (batch 2: review H1–H3, M1–M7)', 'Board updated <b>2026-10-07</b> (batch 3: full-audit detail — M1-refine, L4–L11)')

p.write_text(s, encoding='utf-8')
print('inserted 7 cards; Next up = 7')
