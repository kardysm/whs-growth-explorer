#!/usr/bin/env python3
"""Add Done chips for D-088 (refeeding banner removed) and D-089 (chart 1/3 line change)."""
import pathlib

p = pathlib.Path('UX-KANBAN.html')
s = p.read_text(encoding='utf-8')

if 'D-089' in s:
    print('already inserted'); raise SystemExit(0)

anchor = '<h2>Done (recent context) <span class="count">87</span></h2>\n    <div class="chips">\n'
assert anchor in s, 'Done header not found'
chips = (
    '      <span class="pill ok">Wykresy: linia A usunięta z wykresu 1; „posiłki do poziomu A" na wykresie 3 (D-089)</span>\n'
    '      <span class="pill ok">Refeeding: banner usunięty z UI; logika bez zmian w kodzie (D-088)</span>\n'
)
s = s.replace(anchor, anchor + chips, 1)
s = s.replace('<h2>Done (recent context) <span class="count">87</span></h2>',
              '<h2>Done (recent context) <span class="count">89</span></h2>', 1)
p.write_text(s, encoding='utf-8')
print('inserted 2 chips; Done = 89')
