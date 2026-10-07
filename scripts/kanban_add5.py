#!/usr/bin/env python3
"""Insert the 2026-10-07 evening batch (user review: calc single card, nutrients first row, suggest stacking)."""
import pathlib, re, sys

CARDS = r'''
    <article class="card">
      <h3>9. Kalkulator: jedna karta w sekcji — wskazówki przeniesione do karty formularza</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">layout</span><span class="tag">PL+EN</span></div>
      <p class="why">Sekcja kalkulatora pokazuje obecnie DWIE karty obok siebie (formularz + karta z dwiema wskazówkami rozciągnięta do tej samej wysokości). Użytkownik: „move to the calculator [card] so there's only one left-aligned [card] in calc section”.</p>
      <ul>
        <li><code>calc.hint</code> + <code>calc.pointer</code> przeniesione na górę karty formularza (<code>#calc-form</code>), osobna karta usunięta</li>
        <li>Siatka sekcji: jedna kolumna o szerokości ≤640 px (karta wyrównana do lewej; na wąskich ekranach 100%)</li>
        <li>Weryfikacja: 1 karta w sekcji, brak rozciągania; mobile 100%</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>W sekcji kalkulatora dokładnie jedna karta, wyrównana do lewej; wskazówki widoczne w karcie formularza</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>10. Zasady diety: Zapotrzebowanie na makro- i mikroelementy — samodzielna karta w pierwszym rzędzie sekcji</h3>
      <div class="meta"><span class="pill p2">P2</span><span class="pill p3">S</span><span class="tag">layout</span><span class="tag">PL+EN</span></div>
      <p class="why">Karta norm (z tabelą) jest ostatnia w sekcji i przyklejona do ostatniego rzędu siatki (odstęp 12 px vs wewnętrzne 20 px). Użytkownik: „make standalone card in first row of the section”.</p>
      <ul>
        <li><code>renderRules</code>: kolejność emisji → karta norm PRZED intro i siatką zasad (pierwszy rząd sekcji, własny wiersz)</li>
        <li>Karta pozostaje samodzielna (bez zmian szerokości 780 px)</li>
        <li>Weryfikacja: pierwszy element <code>#rules-body</code> = karta norm</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Karta norm jest pierwszą kartą sekcji „Zasady diety”, wizualnie oddzielona</li>
        </ul>
      </details>
    </article>

    <article class="card">
      <h3>11. Produkty: podpowiedzi wyszukiwania ukryte pod kartami (stacking)</h3>
      <div class="meta"><span class="pill p1">P1</span><span class="pill p3">S</span><span class="tag">bug</span><span class="tag">products</span></div>
      <p class="why">Karta sterująca ma <code>backdrop-filter</code> (tworzy kontekst stackingu), więc <code>#p-suggest</code> (z-60) jest uwięziony w jej kontekście i kolejne karty produktów (późniejsze w DOM, też z backdrop-filter) malują się NAD listą podpowiedzi. Odtworzone: hit-testy w środku/dole listy trafiają w <code>DIV.card#prod-food-lard</code>.</p>
      <ul>
        <li>Karta sterująca dostaje klasę <code>p-controls</code> + <code>position:relative; z-index:5</code> (nad kartami produktów z-auto, pod sticky header z-10)</li>
        <li>Weryfikacja: hit-testy na całej wysokości listy (5/35/65%) trafiają w podpowiedzi; zamknięcie listy bez zmian</li>
      </ul>
      <details><summary>Acceptance</summary>
        <ul>
          <li>Cała lista podpowiedzi klikalna, nie schowana pod kartami; axe bez zmian</li>
        </ul>
      </details>
    </article>

'''

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')
if 'jedna karta w sekcji' in s:
    print('already inserted; nothing to do'); sys.exit(0)

anchor = '<h2>Next up <span class="count">0</span></h2>'
assert anchor in s, 'Next up header not found'
s = s.replace(anchor, '<h2>Next up <span class="count">3</span></h2>', 1)
m = re.search(r'(<h2>Next up <span class="count">3</span></h2>\n)', s)
assert m
s = s[:m.end()] + CARDS + s[m.end():]
s = re.sub(r'\n{3,}', '\n\n', s)
p.write_text(s, encoding='utf-8')
print('inserted 3 cards; Next up = 3')
