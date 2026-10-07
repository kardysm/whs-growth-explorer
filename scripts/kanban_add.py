#!/usr/bin/env python3
"""Insert the 2026-10-07 user batch as kanban cards (Next up), fix counts.
usage: python scripts/kanban_add.py
Idempotent-ish: refuses to insert a card whose <h3> already exists."""
import pathlib, re, sys

CARDS = r'''
    <article class="card">
      <h3>1. Split calculator: „Kalkulator” (form) + „Wyniki” (results)</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">L</span><span class="tag">structure</span><span class="tag">PL+EN</span><span class="tag">a11y</span></div>
      <p class="why">User: „move calculator to separate section”. Today <code>#calc</code> mixes the input form with cards A–F + bilans in one very tall section; the results deserve their own section right after.</p>
      <ul>
        <li><code>#calc</code> = input form only (+ defaults hint card, „Wyniki poniżej” pointer)</li>
        <li>New section <code>#results</code> „Wyniki” / „Results” right after: refeeding banner (moved to the TOP), A–D legend card, cards A–F, milk balance, closing note</li>
        <li>Nav + Ctrl+K index + print stylesheet updated; charts/table refresh wiring unchanged (<code>recalc()</code> stays the single refresh point)</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>All result cards still render and update on every input change; anchors <code>#calc</code>/<code>#results</code> resolve; Ctrl+K finds „Wyniki”</li>
          <li>Print hides the form section only; axe light/dark/dialog 0 violations</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>2. Equal card heights within each grid row</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">layout</span></div>
      <p class="why">User: „make cards in grid rows match up to the height of highest of the row”. <code>.cards-flow</code> (cards A–F + bilans) still uses <code>align-items: start</code> → ragged rows (measured 342 vs 361 px, 354 vs 769 px).</p>
      <ul>
        <li>Stretch every card grid row; milk card fills its grid cell</li>
        <li>Verify per-row spread ≤ 2 px at 1920 / 1440 / 1024 / 768 widths, PL and EN</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>In every row of every card grid the cards end on the same bottom edge (±2 px)</li>
          <li>No horizontal overflow; charts/tables unaffected</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>3. Seasonings &amp; herbs as searchable food items (warnings, sourced)</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">L</span><span class="tag">content</span><span class="tag">products</span><span class="tag">sources</span><span class="tag">PL+EN</span></div>
      <p class="why">User: „add spices that could be added to children food to make the food better (with warnings if any)” → searchable items in „Produkty w Polsce”. 13 seasonings (dill, parsley, chives, basil, thyme, oregano, rosemary, coriander, cinnamon, ginger, turmeric, paprika, garlic) from the committed USDA SR Legacy data; cinnamon carries a coumarin warning (BfR numbers), plus a note „no added salt/sugar” (ESPGHAN fewtrell2017).</p>
      <ul>
        <li><code>scripts/build_foods.py</code>: new category <code>seasonings</code> („przyprawy i zioła”); seasonings get no derived energy/nutrient tags; tag <code>flavour</code> („dla smaku”)</li>
        <li>New verified source <code>bfr_coumarin</code> (fetched FAQ) + research-notes entry; PL portion strings for the new measures</li>
        <li>Seasonings note above the list with source links</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Category filter shows „przyprawy i zioła”; each spice searchable, with kcal + household measures; cinnamon shows the coumarin warning with numbers matching the fetched BfR text</li>
          <li>content lint 0 errors; count fields consistent; tsc/vitest/build green</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>4. Enumerations as lists (A–D legends, allergen legend, hints)</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">M</span><span class="tag">content</span><span class="tag">a11y</span><span class="tag">PL+EN</span></div>
      <p class="why">User: „any enumerations should be a list, for instance in calc section there’s card with legend A-D … make A,B,C,D a list instead of one liner”.</p>
      <ul>
        <li>Convert inline enumerations to real lists: calculator A–D legend, sources A–D legend, allergen legend (icons list), activity-level hint, chart 1–3 hints, table hint</li>
        <li>Keep the evidence grades intro sentence + meaning unchanged; PL+EN both</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>No „A — …; B — …; C — …; D — …” single-line run left in those cards; each renders as <code>&lt;ul&gt;</code></li>
          <li>Text measures (≤78ch) and axe results unchanged</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>5. Polish: narrower macro/micro card + hover on table rows</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">layout</span><span class="tag">tables</span></div>
      <p class="why">User: „make micro/macroelements card narrower, so not the whole width is needed” + „make hover effect on table rows”. The „Zapotrzebowanie na makro- i mikroelementy” card spans the full width; tables have no plain hover state (only the chart-synced <code>tr.hover</code> in the big table).</p>
      <ul>
        <li>Cap the nutrients card width on desktop (~760–780 px), left-aligned</li>
        <li><code>tbody tr:hover</code> tint for every table (calc E/sweep, big table, milk, nutrients, fallbacks), light + dark</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Nutrients card no longer full width on 1440+; both table views readable (no hard squeeze)</li>
          <li>Hover tint visible and distinct from zebra; axe stays 0</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>6. Colorized badges by name (food cards)</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">M</span><span class="tag">design</span><span class="tag">products</span><span class="tag">light+dark</span></div>
      <p class="why">User: „in food section, colorize badges by name”. All tag badges look the same grey; give each badge name its own color (Fe, Zn, Ca, wit. D, fibre, omega-3, gęste energetycznie, wysokobiałkowe, choking, age, module, …).</p>
      <ul>
        <li>Per-tag color map via CSS vars; light + dark variants; AA contrast verified (WCAG math where axe is incomplete)</li>
        <li>Reused by the search chips/suggestions (card 7) so colors stay consistent</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Each badge name renders in its own color (list the mapping); no two adjacent families collide visually</li>
          <li>axe 0 violations light/dark; print unaffected</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>7. Food search: narrower + badge autosuggest &amp; multi-badge chips</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">L</span><span class="tag">UX</span><span class="tag">products</span><span class="tag">a11y</span><span class="tag">PL+EN</span></div>
      <p class="why">User: „make search in food section narrower” + „add autosuggestion with badges hints, allow searching by multiple badges (in language currently selected) — selecting the badge or typing and blurring (or adding „,”) should turn text into a badge inside search and badge should have (x) button to clear it”.</p>
      <ul>
        <li>Search field capped ~1/3 of the filter card (chips wrap inside); placeholder unchanged</li>
        <li>Typing shows a badge suggestion list (tags/categories/allergens, labels in the current language, colored like card 6); ArrowUp/Down + Enter selects; click selects</li>
        <li>Enter / „,” / blur commits the text as a chip (known label → colored badge chip; unknown → neutral chip); chip ✕ clears; multiple chips combine AND; free text keeps the current contains-search</li>
        <li>Combobox a11y (aria-expanded/activedescendant, listbox options); state survives language switch (re-localized)</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Two badge chips narrow the list correctly (AND, hand-checked example counts); removing restores; „Fe” finds iron-rich, unknown text still filters</li>
          <li>Keyboard-only flow works; axe 0; no persistence of selections</li>
        </ul>
      </details>
    </article>

'''

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')

if 'Split calculator: „Kalkulator” (form) + „Wyniki” (results)' in s:
    print('already inserted; nothing to do'); sys.exit(0)

anchor = '<h2>Next up <span class="count">0</span></h2>'
assert anchor in s, 'Next up header not found'
s = s.replace(anchor, '<h2>Next up <span class="count">7</span></h2>', 1)

# insert cards after the Next up section opening content
m = re.search(r'(<h2>Next up <span class="count">7</span></h2>\n)', s)
assert m
s = s[:m.end()] + CARDS + s[m.end():]
# clean excessive blank lines inside Next up col (old filler)
s = re.sub(r'\n{3,}', '\n\n', s)

# board date
s = s.replace('Board updated <b>2026-10-05</b>', 'Board updated <b>2026-10-07</b>')

p.write_text(s, encoding='utf-8')
print('inserted 7 cards; Next up count = 7')
